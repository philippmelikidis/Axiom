'use client';

import { useAppStore } from '@/lib/store';
import TodayCard from '@/components/TodayCard';
import ProjectPicker from '@/components/ProjectPicker';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getProjectProgress, computeTodayNumber, formatDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function TodayPage() {
    const router = useRouter();
    const { getSelectedProject, updateProject, addDailyHistory } = useAppStore();
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const project = getSelectedProject();

    if (!project) {
        return (
            <div className="px-4 py-6 max-w-lg mx-auto text-center">
                <h1 className="text-2xl font-bold text-zinc-100 mb-4">Today</h1>
                <p className="text-zinc-500 mb-6">Select or create a project to see tasks</p>
                <button
                    onClick={() => router.push('/projects')}
                    className="px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium transition-colors"
                >
                    Go to Projects
                </button>
            </div>
        );
    }

    const handleUpdatePlan = async (completedIds: string[], skippedIds: string[], zeroDay: boolean, notes?: string) => {
        setIsUpdating(true);
        setError(null);

        try {
            const response = await fetch('/api/plan/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentProject: project,
                    dailyCheck: {
                        date: formatDate(new Date()),
                        completedTaskIds: completedIds,
                        skippedTaskIds: skippedIds,
                        zeroDay,
                        notes
                    }
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Update failed');
            }

            updateProject(project.projectId, data.project);
            addDailyHistory(project.projectId, {
                date: formatDate(new Date()),
                completedTaskIds: completedIds,
                skippedTaskIds: skippedIds,
                zeroDay,
                notes,
                autoReplanSummary: data.project.progress?.history?.slice(-1)[0]?.autoReplanSummary || 'Updated'
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsUpdating(false);
        }
    };

    const progress = getProjectProgress(project);
    const todayNumber = computeTodayNumber(project.startDate);
    const doneTasks = project.tasks.filter(t => t.state === 'done').length;
    const totalTasks = project.tasks.length;

    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
                <ProjectPicker />
                {isUpdating && <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />}
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-zinc-800/50 border border-zinc-600/50 rounded-xl text-sm text-zinc-400">{error}</div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-zinc-800/50 rounded-xl p-3 text-center border border-zinc-700/50">
                    <div className="text-lg font-bold text-zinc-200">{progress}%</div>
                    <div className="text-[10px] text-zinc-500">Complete</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3 text-center border border-zinc-700/50">
                    <div className="text-lg font-bold text-zinc-200">{doneTasks}/{totalTasks}</div>
                    <div className="text-[10px] text-zinc-500">Tasks</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3 text-center border border-zinc-700/50">
                    <div className="text-lg font-bold text-zinc-200">Day {todayNumber}</div>
                    <div className="text-[10px] text-zinc-500">of {project.timeHorizonDays}</div>
                </div>
            </div>

            <TodayCard project={project} onUpdatePlan={handleUpdatePlan} />
        </div>
    );
}
