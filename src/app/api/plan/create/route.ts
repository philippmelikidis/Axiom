import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { ProjectSchema, Project } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

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

        const result = await callGemini('create', {
            userText,
            timeHorizonDays,
            constraints: constraints || '',
            startDate,
            trainingProfile
        });

        if (!result.success || !result.data) {
            return NextResponse.json(
                { success: false, error: result.error || 'Plan generation failed' },
                { status: 500 }
            );
        }

        const llmData = result.data as { assumptions?: string[]; project?: object } & Record<string, unknown>;
        const llmProject = llmData.project || llmData;
        const assumptions = llmData.assumptions || [];

        const now = new Date().toISOString();
        const enrichedProject: Partial<Project> = {
            ...(llmProject as Partial<Project>),
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
            progress: { history: [] },
            assumptions
        };

        const validated = ProjectSchema.safeParse(enrichedProject);
        if (!validated.success) {
            console.error('Validation errors:', validated.error.issues);
            return NextResponse.json(
                { success: false, error: 'Generated plan did not match schema', details: validated.error.issues },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            project: validated.data,
            assumptions
        });
    } catch (error) {
        console.error('Plan create error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
