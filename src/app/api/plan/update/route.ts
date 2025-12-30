import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { ProjectSchema, Project } from '@/lib/schema';

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

        const result = await callGemini('update', {
            currentProject,
            dailyCheck,
            adjustmentText
        });

        if (!result.success || !result.data) {
            return NextResponse.json(
                { success: false, error: result.error || 'Plan update failed' },
                { status: 500 }
            );
        }

        const llmData = result.data as { project?: object } & Record<string, unknown>;
        const llmProject = llmData.project || llmData;

        const updatedProject: Partial<Project> = {
            ...(llmProject as Partial<Project>),
            projectId: currentProject.projectId,
            createdAt: currentProject.createdAt,
            updatedAt: new Date().toISOString(),
            startDate: currentProject.startDate,
            createdFrom: currentProject.createdFrom
        };

        const validated = ProjectSchema.safeParse(updatedProject);
        if (!validated.success) {
            console.error('Validation errors:', validated.error.issues);
            return NextResponse.json(
                { success: false, error: 'Updated plan did not match schema', details: validated.error.issues },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            project: validated.data
        });
    } catch (error) {
        console.error('Plan update error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
