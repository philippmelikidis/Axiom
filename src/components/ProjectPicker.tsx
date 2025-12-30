'use client';

import { useAppStore } from '@/lib/store';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function ProjectPicker() {
    const { projects, selectedProjectId, selectProject } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);

    const selectedProject = projects.find(p => p.projectId === selectedProjectId);

    if (projects.length === 0) {
        return null;
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:border-zinc-600 transition-colors"
            >
                <span className="text-sm font-medium text-zinc-200 truncate max-w-[180px]">
                    {selectedProject?.name || 'Select Project'}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 max-h-80 overflow-y-auto bg-zinc-800 rounded-xl border border-zinc-700 shadow-xl z-50">
                        {projects.map(project => (
                            <button
                                key={project.projectId}
                                onClick={() => {
                                    selectProject(project.projectId);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-zinc-700/50 transition-colors border-b border-zinc-700/50 last:border-0 ${project.projectId === selectedProjectId ? 'bg-zinc-700/30 text-zinc-100' : 'text-zinc-200'
                                    }`}
                            >
                                <div className="font-medium truncate">{project.name}</div>
                                <div className="text-xs text-zinc-500 mt-0.5">
                                    {project.status === 'paused' ? 'Paused' : project.status === 'completed' ? 'Completed' : 'Active'}
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
