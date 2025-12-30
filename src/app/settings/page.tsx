'use client';

import { useAppStore } from '@/lib/store';
import PauseMode from '@/components/PauseMode';
import ImportExport from '@/components/ImportExport';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RefreshCw, Loader2, Info } from 'lucide-react';

export default function SettingsPage() {
    const router = useRouter();
    const { getSelectedProject, updateProject } = useAppStore();
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const project = getSelectedProject();

    const handleRegenerate = async () => {
        if (!project) return;
        setIsRegenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/plan/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentProject: project,
                    dailyCheck: {
                        date: new Date().toISOString().split('T')[0],
                        completedTaskIds: [],
                        skippedTaskIds: [],
                        zeroDay: false,
                    },
                    adjustmentText: 'Regenerate and rebalance the plan based on current progress'
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Failed');
            updateProject(project.projectId, data.project);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to regenerate');
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>

            {project && (
                <div className="space-y-4">
                    <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
                        <h2 className="font-medium text-zinc-300 mb-1">{project.name}</h2>
                        <p className="text-sm text-zinc-500">{project.oneLineIntent}</p>
                    </div>

                    <PauseMode
                        projectId={project.projectId}
                        isPaused={project.pause.isPaused}
                        pauseUntil={project.pause.pauseUntil}
                        reason={project.pause.reason}
                    />

                    <button
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className="w-full py-3 px-4 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 rounded-xl text-zinc-400 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Regenerate Plan
                    </button>

                    {error && <div className="px-4 py-3 bg-zinc-800/50 border border-zinc-600/50 rounded-xl text-sm text-zinc-400">{error}</div>}
                </div>
            )}

            {!project && (
                <div className="bg-zinc-800/30 rounded-xl p-6 text-center border border-zinc-700/50">
                    <p className="text-zinc-500">Select a project to see project settings</p>
                    <button onClick={() => router.push('/projects')} className="mt-3 text-sm text-zinc-400 hover:text-zinc-200">Go to Projects</button>
                </div>
            )}

            <div className="pt-4 border-t border-zinc-800">
                <h2 className="text-lg font-medium text-zinc-300 mb-4">Data</h2>
                <ImportExport project={project || undefined} />
            </div>

            <div className="pt-4 border-t border-zinc-800">
                <h2 className="text-lg font-medium text-zinc-300 mb-4">Install App</h2>
                <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50 text-sm text-zinc-500 space-y-2">
                    <p>1. Open in Safari on iPhone</p>
                    <p>2. Tap Share button</p>
                    <p>3. Select "Add to Home Screen"</p>
                </div>
            </div>

            <div className="pt-4 flex items-center gap-2 text-xs text-zinc-600">
                <Info className="w-3 h-3" />
                <span>Axiom v1.1</span>
            </div>
        </div>
    );
}
