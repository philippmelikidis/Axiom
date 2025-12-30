import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { ProjectSchema, Project } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 300; // 5 minutes for large plans

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userText, timeHorizonDays, constraints, startDate, trainingProfile } = body;

        if (!userText || !timeHorizonDays || !startDate) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log(`[Plan Create] Starting generation for ${timeHorizonDays} days...`);

        const result = await callGemini('create', {
            userText,
            timeHorizonDays,
            constraints: constraints || '',
            startDate,
            trainingProfile
        });

        if (!result.success || !result.data) {
            console.error('[Plan Create] Gemini call failed:', result.error);
            return NextResponse.json(
                { success: false, error: result.error || 'Plan generation failed' },
                { status: 500 }
            );
        }

        console.log('[Plan Create] Gemini response received, parsing...');

        const llmData = result.data as { assumptions?: string[]; project?: object } & Record<string, unknown>;
        const llmProject = llmData.project || llmData;
        const assumptions = llmData.assumptions || (llmProject as Record<string, unknown>).assumptions as string[] || [];

        const now = new Date().toISOString();

        // Ensure required fields have defaults
        const enrichedProject: Record<string, unknown> = {
            ...(llmProject as Record<string, unknown>),
            projectId: uuidv4(),
            createdAt: now,
            updatedAt: now,
            startDate,
            timeHorizonDays,
            status: 'active',
            pause: { isPaused: false },
            createdFrom: {
                rawInput: userText,
                constraints: constraints || '',
                trainingProfile
            },
            progress: (llmProject as Record<string, unknown>).progress || { history: [] },
            assumptions
        };

        // Ensure nested required fields
        if (!enrichedProject.roadmap) {
            enrichedProject.roadmap = { phases: [] };
        }
        if (!enrichedProject.skillTree) {
            enrichedProject.skillTree = { skills: [] };
        }
        if (!enrichedProject.tasks) {
            enrichedProject.tasks = [];
        }
        if (!enrichedProject.todayCardRules) {
            enrichedProject.todayCardRules = {
                maxTasksPerDay: 3,
                selectionLogic: 'priority'
            };
        }

        // Validate tasks have required fields
        if (Array.isArray(enrichedProject.tasks)) {
            enrichedProject.tasks = (enrichedProject.tasks as Record<string, unknown>[]).map((task, idx) => ({
                ...task,
                taskId: task.taskId || `task_${uuidv4().slice(0, 8)}`,
                state: task.state || 'todo',
                schedule: task.schedule || { recommendedDay: idx + 1, latestDay: idx + 7, flexibilityLevel: 'flexible' },
                details: task.details || { steps: [], definitionOfDone: '' },
                skillImpact: task.skillImpact || [],
                dependencies: task.dependencies || [],
            }));
        }

        // Validate phases have required fields
        if (enrichedProject.roadmap && typeof enrichedProject.roadmap === 'object') {
            const roadmap = enrichedProject.roadmap as Record<string, unknown>;
            if (Array.isArray(roadmap.phases)) {
                roadmap.phases = (roadmap.phases as Record<string, unknown>[]).map((phase, idx) => ({
                    ...phase,
                    phaseId: phase.phaseId || `phase_${uuidv4().slice(0, 8)}`,
                    order: phase.order ?? idx,
                    milestones: phase.milestones || [],
                }));
            }
        }

        // Validate skills have required fields
        if (enrichedProject.skillTree && typeof enrichedProject.skillTree === 'object') {
            const skillTree = enrichedProject.skillTree as Record<string, unknown>;
            if (Array.isArray(skillTree.skills)) {
                skillTree.skills = (skillTree.skills as Record<string, unknown>[]).map(skill => ({
                    ...skill,
                    skillId: skill.skillId || `skill_${uuidv4().slice(0, 8)}`,
                    level: skill.level ?? 0,
                    maxLevel: skill.maxLevel ?? 10,
                    parents: skill.parents || [],
                }));
            }
        }

        console.log('[Plan Create] Validating against schema...');

        const validated = ProjectSchema.safeParse(enrichedProject);
        if (!validated.success) {
            console.error('[Plan Create] Validation errors:', JSON.stringify(validated.error.issues, null, 2));

            // Return more helpful error message
            const firstError = validated.error.issues[0];
            const errorPath = firstError.path.join('.');
            const errorMessage = `Validation failed at "${errorPath}": ${firstError.message}`;

            return NextResponse.json(
                {
                    success: false,
                    error: errorMessage,
                    details: validated.error.issues.slice(0, 5) // Only show first 5 errors
                },
                { status: 500 }
            );
        }

        console.log(`[Plan Create] Success! Generated ${validated.data.tasks.length} tasks`);

        return NextResponse.json({
            success: true,
            project: validated.data,
            assumptions
        });
    } catch (error) {
        console.error('[Plan Create] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
