'use client';

import { useAppStore } from '@/lib/store';
import { getProjectProgress } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2, Copy, ChevronRight, AlertTriangle } from 'lucide-react';

export default function ProjectsPage() {
    const router = useRouter();
    const { projects, selectedProjectId, selectProject, deleteProject, duplicateProject } = useAppStore();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const handleDelete = (projectId: string) => {
        deleteProject(projectId);
        setDeleteConfirm(null);
    };

    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
                <button
                    onClick={() => router.push('/projects/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h2 className="text-lg font-medium text-zinc-300 mb-2">No Projects</h2>
                    <p className="text-zinc-500 mb-6">Create your first project to get started</p>
                    <button
                        onClick={() => router.push('/projects/new')}
                        className="px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium transition-colors"
                    >
                        Create Project
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {projects.map((project) => {
                        const progress = getProjectProgress(project);
                        const isSelected = project.projectId === selectedProjectId;

                        return (
                            <div
                                key={project.projectId}
                                className={`bg-zinc-800/50 rounded-2xl border transition-all ${isSelected ? 'border-zinc-500 bg-zinc-800/70' : 'border-zinc-700/50 hover:border-zinc-600'
                                    }`}
                            >
                                <button
                                    onClick={() => {
                                        selectProject(project.projectId);
                                        router.push('/today');
                                    }}
                                    className="w-full p-4 text-left"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-zinc-200 truncate">{project.name}</h3>
                                            <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{project.oneLineIntent}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-zinc-600 flex-shrink-0 ml-2" />
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex-1 h-1.5 bg-zinc-700/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-zinc-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                        <span className="text-xs text-zinc-500 font-medium w-10 text-right">{progress}%</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                        <span>{project.tasks.length} tasks</span>
                                        <span>{project.status === 'paused' ? 'Paused' : project.status === 'completed' ? 'Done' : 'Active'}</span>
                                    </div>
                                </button>

                                <div className="px-4 pb-3 flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); duplicateProject(project.projectId); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Duplicate
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project.projectId); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-zinc-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-100">Delete Project?</h3>
                        </div>
                        <p className="text-zinc-500 mb-6">This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-zinc-300 transition-colors">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg font-medium transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
