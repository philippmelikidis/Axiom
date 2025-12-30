'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Pause, Play, Moon } from 'lucide-react';

interface PauseModeProps {
    projectId: string;
    isPaused: boolean;
    pauseUntil?: string;
    reason?: string;
}

export default function PauseMode({ projectId, isPaused, pauseUntil, reason }: PauseModeProps) {
    const { pauseProject, resumeProject } = useAppStore();
    const [showPauseDialog, setShowPauseDialog] = useState(false);
    const [pauseDays, setPauseDays] = useState(7);
    const [pauseReason, setPauseReason] = useState('');

    const handlePause = () => {
        pauseProject(projectId, pauseDays, pauseReason || undefined);
        setShowPauseDialog(false);
        setPauseDays(7);
        setPauseReason('');
    };

    const handleResume = () => {
        resumeProject(projectId);
    };

    if (isPaused) {
        return (
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center">
                        <Moon className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-zinc-200">Paused</h3>
                        {pauseUntil && <p className="text-sm text-zinc-500">Until {pauseUntil}</p>}
                    </div>
                </div>
                {reason && <p className="text-sm text-zinc-500 mb-4">{reason}</p>}
                <button
                    onClick={handleResume}
                    className="w-full py-3 bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Play className="w-4 h-4" />
                    Resume
                </button>
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowPauseDialog(true)}
                className="w-full py-3 px-4 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 rounded-xl text-zinc-400 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2"
            >
                <Pause className="w-4 h-4" />
                Pause Project
            </button>

            {showPauseDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-zinc-800">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Pause Project</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Duration</label>
                                <div className="flex gap-2">
                                    {[3, 7, 14, 30].map(days => (
                                        <button
                                            key={days}
                                            onClick={() => setPauseDays(days)}
                                            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${pauseDays === days ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                                }`}
                                        >
                                            {days}d
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Reason (optional)</label>
                                <input
                                    type="text"
                                    value={pauseReason}
                                    onChange={(e) => setPauseReason(e.target.value)}
                                    placeholder="Travel, illness, etc."
                                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowPauseDialog(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-zinc-300 transition-colors">Cancel</button>
                            <button onClick={handlePause} className="flex-1 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg font-medium transition-colors">Pause</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
