'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Project } from '@/lib/schema';
import { Loader2, RefreshCw, Check } from 'lucide-react';

export default function NewProjectForm() {
    const router = useRouter();
    const { addProject } = useAppStore();

    const [userText, setUserText] = useState('');
    const [timeHorizon, setTimeHorizon] = useState<'weeks' | 'months' | 'custom'>('weeks');
    const [customDays, setCustomDays] = useState(30);
    const [constraints, setConstraints] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [previewProject, setPreviewProject] = useState<Project | null>(null);
    const [assumptions, setAssumptions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const getTimeHorizonDays = () => {
        switch (timeHorizon) {
            case 'weeks': return 14;
            case 'months': return 90;
            case 'custom': return customDays;
        }
    };

    const handleGenerate = async () => {
        if (!userText.trim()) {
            setError('Describe what you want to achieve');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/plan/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userText: userText.trim(),
                    timeHorizonDays: getTimeHorizonDays(),
                    constraints: constraints.trim(),
                    startDate
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to generate plan');
            }

            setPreviewProject(data.project);
            setAssumptions(data.assumptions || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAccept = () => {
        if (previewProject) {
            addProject(previewProject);
            router.push('/today');
        }
    };

    const handleRegenerate = () => {
        setPreviewProject(null);
        setAssumptions([]);
        handleGenerate();
    };

    if (previewProject) {
        return (
            <div className="space-y-6">
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                    <h2 className="text-xl font-bold text-zinc-100 mb-2">{previewProject.name}</h2>
                    <p className="text-zinc-400">{previewProject.oneLineIntent}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center border border-zinc-700/50">
                        <div className="text-2xl font-bold text-zinc-200">{previewProject.roadmap.phases.length}</div>
                        <div className="text-xs text-zinc-500">Phases</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center border border-zinc-700/50">
                        <div className="text-2xl font-bold text-zinc-200">{previewProject.tasks.length}</div>
                        <div className="text-xs text-zinc-500">Tasks</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center border border-zinc-700/50">
                        <div className="text-2xl font-bold text-zinc-200">{previewProject.skillTree.skills.length}</div>
                        <div className="text-xs text-zinc-500">Skills</div>
                    </div>
                </div>

                {assumptions.length > 0 && (
                    <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Assumptions</h3>
                        <ul className="space-y-1 text-sm text-zinc-500">
                            {assumptions.map((a, i) => <li key={i}>- {a}</li>)}
                        </ul>
                    </div>
                )}

                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-zinc-400">Phases</h3>
                    {previewProject.roadmap.phases.sort((a, b) => a.order - b.order).map((phase, i) => (
                        <div key={phase.phaseId} className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/50">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-zinc-700/50 text-zinc-400 text-xs flex items-center justify-center font-medium">{i + 1}</span>
                                <span className="font-medium text-zinc-200">{phase.name}</span>
                            </div>
                            <p className="text-sm text-zinc-500 mt-1 ml-8">{phase.intent}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Definition of Done</h3>
                    <p className="text-zinc-300">{previewProject.definitionOfDone}</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Regenerate
                    </button>
                    <button
                        onClick={handleAccept}
                        className="flex-1 py-3 px-4 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Accept
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Objective</label>
                <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="Describe what you want to achieve..."
                    className="w-full px-4 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors text-base leading-relaxed"
                    rows={5}
                />
                <p className="text-xs text-zinc-500 mt-2">Use iOS dictation for voice input</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Time Horizon</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { value: 'weeks' as const, label: '2 Weeks' },
                        { value: 'months' as const, label: '3 Months' },
                        { value: 'custom' as const, label: 'Custom' },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setTimeHorizon(option.value)}
                            className={`py-3 px-4 rounded-xl font-medium transition-colors ${timeHorizon === option.value
                                    ? 'bg-zinc-100 text-zinc-900'
                                    : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                {timeHorizon === 'custom' && (
                    <div className="mt-3 flex items-center gap-3">
                        <input
                            type="number"
                            value={customDays}
                            onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                            min={1}
                            max={365}
                            className="w-20 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-200 text-center focus:outline-none focus:border-zinc-600"
                        />
                        <span className="text-zinc-400">days</span>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Constraints (Optional)</label>
                <textarea
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="Time limits, equipment, preferences..."
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
                    rows={3}
                />
            </div>

            {error && (
                <div className="bg-zinc-800/50 border border-zinc-600/50 rounded-xl px-4 py-3 text-zinc-400 text-sm">{error}</div>
            )}

            <button
                onClick={handleGenerate}
                disabled={isGenerating || !userText.trim()}
                className="w-full py-4 px-6 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                    </>
                ) : (
                    'Generate Plan'
                )}
            </button>
        </div>
    );
}
