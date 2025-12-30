'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Project } from '@/lib/schema';
import { Loader2, RefreshCw, Check, ArrowLeft, Calendar } from 'lucide-react';

export default function NewProjectForm() {
    const router = useRouter();
    const { addProject } = useAppStore();

    const [userText, setUserText] = useState('');
    const [constraints, setConstraints] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    // Default end date is 90 days from now
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 90);
    const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [previewProject, setPreviewProject] = useState<Project | null>(null);
    const [assumptions, setAssumptions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Calculate days between start and end date
    const timeHorizonDays = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
    }, [startDate, endDate]);

    const getTimeHorizonDays = () => timeHorizonDays;

    const handleGenerate = async () => {
        if (!userText.trim()) {
            setError('Describe what you want to achieve');
            return;
        }

        if (userText.trim().length < 10) {
            setError('Please provide more detail about your goal');
            return;
        }

        setIsGenerating(true);
        setError(null);

        const days = getTimeHorizonDays();

        try {
            // For short plans (≤90 days), use old single-request flow
            // For long plans (>90 days), use progressive generation
            if (days <= 90) {
                const response = await fetch('/api/plan/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userText: userText.trim(),
                        timeHorizonDays: days,
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
            } else {
                // PROGRESSIVE GENERATION for long plans
                console.log('Starting progressive generation for', days, 'days');

                // Step 1: Create master plan (fast, ~10s)
                const masterResponse = await fetch('/api/plan/create-master', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userText: userText.trim(),
                        timeHorizonDays: days,
                        constraints: constraints.trim(),
                        startDate
                    })
                });

                const masterData = await masterResponse.json();

                if (!masterResponse.ok || !masterData.success) {
                    throw new Error(masterData.error || 'Failed to create master plan');
                }

                let project = masterData.project;
                console.log('Master plan created, generating first month...');

                // Step 2: Generate first month of tasks
                const monthResponse = await fetch('/api/plan/generate-month', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project,
                        monthNumber: 0,
                        daysToGenerate: 30
                    })
                });

                const monthData = await monthResponse.json();

                if (!monthResponse.ok || !monthData.success) {
                    // Still show the project even if first month fails
                    console.warn('First month generation failed:', monthData.error);
                    project.tasks = [];
                } else {
                    project.tasks = monthData.tasks;
                    project.generatedUntilDay = monthData.generatedUntilDay;
                    project.lastGeneratedContext = monthData.lastGeneratedContext;
                }

                setPreviewProject(project);
                setAssumptions(project.assumptions || []);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
            if (errorMessage.includes('schema') || errorMessage.includes('JSON')) {
                setError('Generation failed. Try adding more detail to your goal.');
            } else if (errorMessage.includes('timeout') || errorMessage.includes('504')) {
                setError('Request timed out. Please try again.');
            } else {
                setError(errorMessage);
            }
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

    const handleRegenerate = async () => {
        // Just call handleGenerate - it handles both short and long plans
        await handleGenerate();
    };

    const handleEditInput = () => {
        // Go back to edit form without losing data
        setPreviewProject(null);
        setAssumptions([]);
        setError(null);
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

                {error && (
                    <div className="bg-zinc-800/50 border border-zinc-600/50 rounded-xl px-4 py-3 text-zinc-400 text-sm">{error}</div>
                )}

                <div className="space-y-3">
                    <div className="flex gap-3">
                        <button
                            onClick={handleRegenerate}
                            disabled={isGenerating}
                            className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {isGenerating ? 'Regenerating...' : 'Regenerate'}
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={isGenerating}
                            className="flex-1 py-3 px-4 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" />
                            Accept
                        </button>
                    </div>
                    <button
                        onClick={handleEditInput}
                        disabled={isGenerating}
                        className="w-full py-3 px-4 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Edit Input
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
                    placeholder="Describe what you want to achieve in detail..."
                    className="w-full px-4 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors text-base leading-relaxed"
                    rows={5}
                />
                <p className="text-xs text-zinc-500 mt-2">Tip: Be specific. Include current level, timeline, and any constraints.</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Zeitraum</label>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Start</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Ziel</label>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
                        />
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-400">{timeHorizonDays} Tage</span>
                    {timeHorizonDays > 90 && (
                        <span className="text-xs text-zinc-500">(~{Math.round(timeHorizonDays / 30)} Monate)</span>
                    )}
                </div>
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
