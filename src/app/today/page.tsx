'use client';

import { useAppStore } from '@/lib/store';
import TodayCard from '@/components/TodayCard';
import ProjectPicker from '@/components/ProjectPicker';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getProjectProgress, computeTodayNumber, formatDate } from '@/lib/utils';
import { Loader2, CalendarPlus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function TodayPage() {
    const router = useRouter();
    const { getSelectedProject, updateProject, addDailyHistory } = useAppStore();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewingDay, setViewingDay] = useState<number | null>(null); // null means "today"

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

    const todayNumber = computeTodayNumber(project.startDate);
    const currentViewDay = viewingDay ?? todayNumber;

    // Calculate the date for the viewing day
    const getDateForDay = (dayNum: number) => {
        const start = new Date(project.startDate);
        start.setDate(start.getDate() + dayNum);
        return start.toISOString().split('T')[0];
    };

    // Filter tasks for the current viewing day
    const tasksForDay = project.tasks.filter(t => {
        const recDay = t.schedule?.recommendedDay || 0;
        return recDay === currentViewDay;
    });

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

    const handleGenerateNextMonth = async () => {
        if (!project.masterPlan) {
            setError('Project needs a master plan for progressive generation');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const currentMonth = Math.floor((project.generatedUntilDay || 0) / 30);

            const response = await fetch('/api/plan/generate-month', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project,
                    monthNumber: currentMonth + 1,
                    daysToGenerate: 30
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to generate tasks');
            }

            updateProject(project.projectId, {
                tasks: [...project.tasks, ...data.tasks],
                generatedUntilDay: data.generatedUntilDay,
                lastGeneratedContext: data.lastGeneratedContext
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate');
        } finally {
            setIsGenerating(false);
        }
    };

    const progress = getProjectProgress(project);
    const doneTasks = project.tasks.filter(t => t.state === 'done').length;
    const totalTasks = project.tasks.length;

    const generatedUntilDay = project.generatedUntilDay || project.timeHorizonDays;
    const daysRemaining = generatedUntilDay - todayNumber;
    const needsMoreTasks = project.masterPlan && daysRemaining <= 7 && generatedUntilDay < project.timeHorizonDays;

    const canGoPrev = currentViewDay > 0;
    const canGoNext = currentViewDay < project.timeHorizonDays;
    const isViewingToday = currentViewDay === todayNumber;

    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
                <ProjectPicker />
                {(isUpdating || isGenerating) && <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />}
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-zinc-800/50 border border-zinc-600/50 rounded-xl text-sm text-zinc-400">{error}</div>
            )}

            {needsMoreTasks && (
                <div className="mb-4 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-zinc-300">Need more tasks?</p>
                            <p className="text-xs text-zinc-500">Only {daysRemaining} days remaining</p>
                        </div>
                        <button
                            onClick={handleGenerateNextMonth}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                            Generate
                        </button>
                    </div>
                </div>
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

            {/* Day Navigation */}
            <div className="flex items-center justify-between mb-4 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                <button
                    onClick={() => setViewingDay(Math.max(0, currentViewDay - 1))}
                    disabled={!canGoPrev}
                    className="p-2 hover:bg-zinc-700/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-zinc-400" />
                </button>

                <div className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium text-zinc-200">
                            {currentViewDay === todayNumber
                                ? 'Heute'
                                : currentViewDay === todayNumber - 1
                                    ? 'Gestern'
                                    : currentViewDay === todayNumber + 1
                                        ? 'Morgen'
                                        : `Tag ${currentViewDay}`}
                        </span>
                    </div>
                    <div className="text-xs text-zinc-500">{getDateForDay(currentViewDay)}</div>
                </div>

                <button
                    onClick={() => setViewingDay(Math.min(project.timeHorizonDays, currentViewDay + 1))}
                    disabled={!canGoNext}
                    className="p-2 hover:bg-zinc-700/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                </button>
            </div>

            {/* Jump to Today button when viewing different day */}
            {!isViewingToday && (
                <button
                    onClick={() => setViewingDay(null)}
                    className="w-full mb-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                    ← Zurück zu Heute (Tag {todayNumber})
                </button>
            )}

            {/* Tasks for this day */}
            {tasksForDay.length > 0 ? (
                <TodayCard
                    project={{ ...project, tasks: tasksForDay }}
                    onUpdatePlan={handleUpdatePlan}
                />
            ) : (
                <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50 text-center">
                    <p className="text-zinc-400 mb-2">No tasks scheduled for Day {currentViewDay}</p>
                    <p className="text-xs text-zinc-500">
                        {currentViewDay < todayNumber ? 'Past day' : currentViewDay === todayNumber ? 'Rest day' : 'Future day'}
                    </p>
                </div>
            )}
        </div>
    );
}
