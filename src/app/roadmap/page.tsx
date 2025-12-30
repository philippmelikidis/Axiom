'use client';

import { useAppStore } from '@/lib/store';
import GanttChart from '@/components/GanttChart';
import TaskList from '@/components/TaskList';
import ProjectPicker from '@/components/ProjectPicker';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarChart2, List } from 'lucide-react';

type ViewMode = 'timeline' | 'list';

export default function RoadmapPage() {
    const router = useRouter();
    const project = useAppStore((s) => s.getSelectedProject());
    const [viewMode, setViewMode] = useState<ViewMode>('timeline');

    if (!project) {
        return (
            <div className="px-4 py-6 max-w-lg mx-auto text-center">
                <h1 className="text-2xl font-bold text-zinc-100 mb-4">Roadmap</h1>
                <p className="text-zinc-500 mb-6">Select a project to view the roadmap</p>
                <button onClick={() => router.push('/projects')} className="px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium">Go to Projects</button>
            </div>
        );
    }

    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
                <ProjectPicker />
                <div className="flex gap-1 bg-zinc-800/50 rounded-xl p-1">
                    <button onClick={() => setViewMode('timeline')} className={`p-2 rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>
                        <BarChart2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {viewMode === 'timeline' ? <GanttChart project={project} /> : <TaskList tasks={project.tasks} phases={project.roadmap.phases} projectId={project.projectId} />}
        </div>
    );
}
