import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { ProjectSchema, Project } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 300; // 5 minutes for complex updates

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { currentProject, dailyCheck, adjustmentText } = body;

        if (!currentProject || !dailyCheck) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log('[Plan Update] Starting update...');

        const result = await callGemini('update', {
            currentProject,
            dailyCheck,
            adjustmentText
        });

        if (!result.success || !result.data) {
            console.error('[Plan Update] Gemini call failed:', result.error);
            return NextResponse.json(
                { success: false, error: result.error || 'Plan update failed' },
                { status: 500 }
            );
        }

        console.log('[Plan Update] Gemini response received, processing...');

        const llmData = result.data as { project?: object } & Record<string, unknown>;
        const llmProject = llmData.project || llmData;

        const now = new Date().toISOString();

        // Build updated project with preserved fields from original
        const updatedProject: Record<string, unknown> = {
            ...(llmProject as Record<string, unknown>),
            projectId: currentProject.projectId,
            createdAt: currentProject.createdAt,
            updatedAt: now,
            startDate: currentProject.startDate,
            timeHorizonDays: currentProject.timeHorizonDays,
            createdFrom: currentProject.createdFrom,
            status: (llmProject as Record<string, unknown>).status || currentProject.status || 'active',
            pause: (llmProject as Record<string, unknown>).pause || currentProject.pause || { isPaused: false }
        };

        // Ensure nested required fields
        if (!updatedProject.roadmap) {
            updatedProject.roadmap = currentProject.roadmap || { phases: [] };
        }
        if (!updatedProject.skillTree) {
            updatedProject.skillTree = currentProject.skillTree || { skills: [] };
        }
        if (!updatedProject.tasks) {
            updatedProject.tasks = currentProject.tasks || [];
        }
        if (!updatedProject.progress) {
            updatedProject.progress = currentProject.progress || { history: [] };
        }
        if (!updatedProject.todayCardRules) {
            updatedProject.todayCardRules = currentProject.todayCardRules || {
                maxTasksPerDay: 3,
                selectionLogic: 'priority'
            };
        }

        // Validate tasks have required fields
        if (Array.isArray(updatedProject.tasks)) {
            updatedProject.tasks = (updatedProject.tasks as Record<string, unknown>[]).map((task, idx) => ({
                ...task,
                taskId: task.taskId || `task_${uuidv4().slice(0, 8)}`,
                state: task.state || 'todo',
                schedule: task.schedule || { recommendedDay: idx + 1, latestDay: idx + 7 },
                details: task.details || { steps: [], definitionOfDone: '' },
                skillImpact: task.skillImpact || [],
                dependsOnTaskIds: task.dependsOnTaskIds || [],
                lastUpdated: task.lastUpdated || now
            }));
        }

        // Validate phases have required fields
        if (updatedProject.roadmap && typeof updatedProject.roadmap === 'object') {
            const roadmap = updatedProject.roadmap as Record<string, unknown>;
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
        if (updatedProject.skillTree && typeof updatedProject.skillTree === 'object') {
            const skillTree = updatedProject.skillTree as Record<string, unknown>;
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

        console.log('[Plan Update] Validating against schema...');

        const validated = ProjectSchema.safeParse(updatedProject);
        if (!validated.success) {
            console.error('[Plan Update] Validation errors:', JSON.stringify(validated.error.issues, null, 2));

            const firstError = validated.error.issues[0];
            const errorPath = firstError.path.join('.');
            const errorMessage = `Update validation failed at "${errorPath}": ${firstError.message}`;

            return NextResponse.json(
                {
                    success: false,
                    error: errorMessage,
                    details: validated.error.issues.slice(0, 5)
                },
                { status: 500 }
            );
        }

        console.log('[Plan Update] Success!');

        return NextResponse.json({
            success: true,
            project: validated.data
        });
    } catch (error) {
        console.error('[Plan Update] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
