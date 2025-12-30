'use client';

import { Task, Project } from '@/lib/schema';
import { useAppStore } from '@/lib/store';
import { pickTodayTasks, computeTodayNumber, isProjectActivelyPaused, formatDate } from '@/lib/utils';
import { Check, SkipForward, Moon, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface TodayCardProps {
    project: Project;
    onUpdatePlan: (completedIds: string[], skippedIds: string[], zeroDay: boolean, notes?: string) => Promise<void>;
}

export default function TodayCard({ project, onUpdatePlan }: TodayCardProps) {
    const { markTaskDone, markTaskSkipped, undoTaskState } = useAppStore();
    const [notes, setNotes] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [sessionCompleted, setSessionCompleted] = useState<string[]>([]);
    const [sessionSkipped, setSessionSkipped] = useState<string[]>([]);

    const todayNumber = computeTodayNumber(project.startDate);
    const isPaused = isProjectActivelyPaused(project);
    const todayTasks = pickTodayTasks(project, todayNumber);

    const handleDone = (taskId: string) => {
        markTaskDone(project.projectId, taskId);
        setSessionCompleted(prev => [...prev, taskId]);
    };

    const handleSkip = (taskId: string) => {
        markTaskSkipped(project.projectId, taskId);
        setSessionSkipped(prev => [...prev, taskId]);
    };

    const handleUndo = (taskId: string) => {
        undoTaskState(project.projectId, taskId);
        setSessionCompleted(prev => prev.filter(id => id !== taskId));
        setSessionSkipped(prev => prev.filter(id => id !== taskId));
    };

    const handleZeroDay = async () => {
        setIsUpdating(true);
        try {
            await onUpdatePlan([], [], true, 'Zero day');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdatePlan = async () => {
        if (sessionCompleted.length === 0 && sessionSkipped.length === 0) return;

        setIsUpdating(true);
        try {
            await onUpdatePlan(sessionCompleted, sessionSkipped, false, notes || undefined);
            setSessionCompleted([]);
            setSessionSkipped([]);
            setNotes('');
        } finally {
            setIsUpdating(false);
        }
    };

    if (isPaused) {
        return (
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center">
                        <Moon className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-200">Paused</h3>
                        <p className="text-sm text-zinc-500">
                            Until {project.pause.pauseUntil || 'resumed'}
                        </p>
                    </div>
                </div>
                {project.pause.reason && (
                    <p className="text-sm text-zinc-500">{project.pause.reason}</p>
                )}
            </div>
        );
    }

    const hasSessionChanges = sessionCompleted.length > 0 || sessionSkipped.length > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-100">Today</h2>
                    <p className="text-sm text-zinc-500">
                        Day {todayNumber} / {formatDate(new Date())}
                    </p>
                </div>
                {hasSessionChanges && (
                    <button
                        onClick={handleUpdatePlan}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Update
                    </button>
                )}
            </div>

            {todayTasks.length === 0 ? (
                <div className="bg-zinc-800/50 rounded-2xl p-8 text-center border border-zinc-700/50">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-1">No pending tasks</h3>
                    <p className="text-sm text-zinc-500">All tasks completed or none scheduled</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {todayTasks.map((task) => (
                        <TaskCard
                            key={task.taskId}
                            task={task}
                            onDone={() => handleDone(task.taskId)}
                            onSkip={() => handleSkip(task.taskId)}
                            onUndo={() => handleUndo(task.taskId)}
                        />
                    ))}
                </div>
            )}

            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
                rows={2}
            />

            <button
                onClick={handleZeroDay}
                disabled={isUpdating || hasSessionChanges}
                className="w-full py-3 px-4 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                <Moon className="w-4 h-4" />
                Zero Day
            </button>
        </div>
    );
}

function TaskCard({ task, onDone, onSkip, onUndo }: { task: Task; onDone: () => void; onSkip: () => void; onUndo: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const typeLabels: Record<string, string> = {
        build: 'BUILD',
        think: 'THINK',
        train: 'TRAIN',
        admin: 'ADMIN',
        explore: 'EXPLORE',
        recover: 'RECOVER',
        social: 'SOCIAL',
    };

    const isActioned = task.state !== 'todo';

    return (
        <div className={`bg-zinc-800/50 rounded-2xl border transition-all ${task.state === 'done' ? 'border-zinc-600/50 bg-zinc-800/30' :
                task.state === 'skipped' ? 'border-zinc-700/30 opacity-60' :
                    'border-zinc-700/50'
            }`}>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0" onClick={() => setIsExpanded(!isExpanded)}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-400">
                                {typeLabels[task.type] || task.type.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                                {task.durationMinutes}min / {task.effort}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
                        </div>
                        <h4 className={`font-medium ${task.state === 'done' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                            {task.name}
                        </h4>
                    </div>

                    <div className="flex items-center gap-2">
                        {isActioned ? (
                            <button onClick={onUndo} className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                                Undo
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onSkip}
                                    className="w-10 h-10 rounded-xl bg-zinc-700/50 hover:bg-zinc-600/50 flex items-center justify-center transition-colors"
                                >
                                    <SkipForward className="w-4 h-4 text-zinc-400" />
                                </button>
                                <button
                                    onClick={onDone}
                                    className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-white flex items-center justify-center transition-colors"
                                >
                                    <Check className="w-4 h-4 text-zinc-900" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-zinc-700/50 space-y-3">
                        {task.details.steps.length > 0 && (
                            <div>
                                <h5 className="text-xs font-medium text-zinc-500 mb-2">Steps</h5>
                                <ul className="space-y-1">
                                    {task.details.steps.map((step, i) => (
                                        <li key={i} className="text-sm text-zinc-400 flex gap-2">
                                            <span className="text-zinc-600">{i + 1}.</span>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {task.details.training && (
                            <div>
                                <h5 className="text-xs font-medium text-zinc-500 mb-2">Training Details</h5>
                                <div className="text-sm text-zinc-400 space-y-1">
                                    {task.details.training.warmup && <p>Warmup: {task.details.training.warmup}</p>}
                                    {task.details.training.mainSet && <p>Main: {task.details.training.mainSet}</p>}
                                    {task.details.training.cooldown && <p>Cooldown: {task.details.training.cooldown}</p>}
                                    {task.details.training.targetPace && <p>Pace: {task.details.training.targetPace}</p>}
                                    {task.details.training.rpe && <p>RPE: {task.details.training.rpe}</p>}
                                </div>
                            </div>
                        )}
                        {task.details.definitionOfDone && (
                            <div>
                                <h5 className="text-xs font-medium text-zinc-500 mb-1">Done when</h5>
                                <p className="text-sm text-zinc-400">{task.details.definitionOfDone}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
