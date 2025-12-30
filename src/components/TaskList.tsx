'use client';

import { Task, Phase } from '@/lib/schema';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Check, SkipForward, Search, Filter, ChevronDown } from 'lucide-react';

interface TaskListProps {
    tasks: Task[];
    phases: Phase[];
    projectId: string;
    showFilters?: boolean;
}

type FilterState = 'all' | 'todo' | 'done' | 'skipped';

export default function TaskList({ tasks, phases, projectId, showFilters = true }: TaskListProps) {
    const { markTaskDone, markTaskSkipped, undoTaskState } = useAppStore();
    const [filter, setFilter] = useState<FilterState>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(phases.map(p => p.phaseId)));

    const filteredTasks = tasks.filter(task => {
        if (filter !== 'all' && task.state !== filter) return false;
        if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const tasksByPhase = phases.map(phase => ({
        phase,
        tasks: filteredTasks.filter(t => t.phaseId === phase.phaseId).sort((a, b) => a.schedule.recommendedDay - b.schedule.recommendedDay)
    }));

    const togglePhase = (phaseId: string) => {
        setExpandedPhases(prev => {
            const next = new Set(prev);
            if (next.has(phaseId)) next.delete(phaseId);
            else next.add(phaseId);
            return next;
        });
    };

    return (
        <div className="space-y-4">
            {showFilters && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tasks"
                            className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {(['all', 'todo', 'done', 'skipped'] as FilterState[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                                <span className="ml-1.5 text-xs opacity-70">
                                    {f === 'all' ? tasks.length : tasks.filter(t => t.state === f).length}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {tasksByPhase.map(({ phase, tasks: phaseTasks }) => {
                    if (phaseTasks.length === 0) return null;
                    const isExpanded = expandedPhases.has(phase.phaseId);
                    const doneTasks = phaseTasks.filter(t => t.state === 'done').length;

                    return (
                        <div key={phase.phaseId} className="bg-zinc-800/30 rounded-2xl border border-zinc-700/50 overflow-hidden">
                            <button
                                onClick={() => togglePhase(phase.phaseId)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-700/20 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                    <div className="text-left">
                                        <h3 className="font-medium text-zinc-200">{phase.name}</h3>
                                        <p className="text-xs text-zinc-500">{doneTasks}/{phaseTasks.length} completed</p>
                                    </div>
                                </div>
                                <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-zinc-400 rounded-full transition-all" style={{ width: `${(doneTasks / phaseTasks.length) * 100}%` }} />
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-4 pb-3 space-y-2">
                                    {phaseTasks.map(task => (
                                        <div
                                            key={task.taskId}
                                            className={`p-3 rounded-xl border transition-all ${task.state === 'done' ? 'bg-zinc-800/30 border-zinc-700/30' :
                                                    task.state === 'skipped' ? 'bg-zinc-800/20 border-zinc-700/20 opacity-60' :
                                                        'bg-zinc-800/50 border-zinc-700/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-400">{task.type.toUpperCase()}</span>
                                                        <span className="text-[10px] text-zinc-500">Day {task.schedule.recommendedDay}</span>
                                                    </div>
                                                    <p className={`text-sm ${task.state === 'done' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{task.name}</p>
                                                </div>

                                                {task.state === 'todo' ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => markTaskSkipped(projectId, task.taskId)} className="w-8 h-8 rounded-lg bg-zinc-700/50 hover:bg-zinc-600/50 flex items-center justify-center">
                                                            <SkipForward className="w-3.5 h-3.5 text-zinc-400" />
                                                        </button>
                                                        <button onClick={() => markTaskDone(projectId, task.taskId)} className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-white flex items-center justify-center">
                                                            <Check className="w-3.5 h-3.5 text-zinc-900" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => undoTaskState(projectId, task.taskId)} className="text-xs text-zinc-500 hover:text-zinc-300">Undo</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredTasks.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                    <Filter className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No tasks match filters</p>
                </div>
            )}
        </div>
    );
}
