'use client';

import { Project } from '@/lib/schema';
import { generateGanttDefinition, getPhaseProgress, getDateFromDay, formatDate } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Target, CheckCircle2 } from 'lucide-react';

interface GanttChartProps {
    project: Project;
}

export default function GanttChart({ project }: GanttChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mermaidLoaded, setMermaidLoaded] = useState(false);

    useEffect(() => {
        import('mermaid').then((mod) => {
            const mermaid = mod.default;
            mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                gantt: {
                    titleTopMargin: 25,
                    barHeight: 20,
                    barGap: 4,
                    topPadding: 50,
                    leftPadding: 75,
                    gridLineStartPadding: 35,
                    fontSize: 11,
                    numberSectionStyles: 4,
                    axisFormat: '%m/%d',
                },
                themeVariables: {
                    primaryColor: '#71717a',
                    primaryTextColor: '#e4e4e7',
                    primaryBorderColor: '#3f3f46',
                    lineColor: '#3f3f46',
                    secondaryColor: '#27272a',
                    tertiaryColor: '#18181b',
                    gridColor: '#3f3f46',
                    todayLineColor: '#a1a1aa',
                }
            });
            setMermaidLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (!mermaidLoaded || !containerRef.current) return;

        const renderChart = async () => {
            try {
                const mermaid = (await import('mermaid')).default;
                const definition = generateGanttDefinition(project);
                containerRef.current!.innerHTML = '';
                const id = `gantt-${Date.now()}`;
                const { svg } = await mermaid.render(id, definition);
                containerRef.current!.innerHTML = svg;
                const svgElement = containerRef.current!.querySelector('svg');
                if (svgElement) {
                    svgElement.style.width = '100%';
                    svgElement.style.maxWidth = '100%';
                    svgElement.style.height = 'auto';
                    svgElement.style.minHeight = '300px';
                }
            } catch (error) {
                console.error('Mermaid render error:', error);
                containerRef.current!.innerHTML = '<p class="text-zinc-500">Failed to render chart</p>';
            }
        };
        renderChart();
    }, [mermaidLoaded, project]);

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                {project.roadmap.phases.sort((a, b) => a.order - b.order).map((phase) => {
                    const progress = getPhaseProgress(phase, project.tasks);
                    const phaseTasks = project.tasks.filter(t => t.phaseId === phase.phaseId);
                    const doneTasks = phaseTasks.filter(t => t.state === 'done').length;
                    const startDate = getDateFromDay(project.startDate, phase.startDay);
                    const endDate = getDateFromDay(project.startDate, phase.endDay);

                    return (
                        <div key={phase.phaseId} className="bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                                        {phase.name}
                                        {progress === 100 && <CheckCircle2 className="w-4 h-4 text-zinc-400" />}
                                    </h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">{formatDate(startDate)} - {formatDate(endDate)}</p>
                                </div>
                                <span className="text-sm font-medium text-zinc-400">{progress}%</span>
                            </div>
                            <div className="h-2 bg-zinc-700/50 rounded-full overflow-hidden mb-3">
                                <div className="h-full bg-zinc-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-sm text-zinc-500 mb-3">{phase.intent}</p>
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span>{doneTasks}/{phaseTasks.length} tasks</span>
                                {phase.milestones.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        <Target className="w-3 h-3" />
                                        <span>{phase.milestones.length} milestone{phase.milestones.length > 1 ? 's' : ''}</span>
                                    </div>
                                )}
                            </div>
                            {phase.milestones.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-zinc-700/50 space-y-2">
                                    {phase.milestones.map(milestone => (
                                        <div key={milestone.milestoneId} className="flex items-center gap-2 text-sm">
                                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                                            <span className="text-zinc-400">{milestone.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-700/50 overflow-x-auto">
                <h3 className="font-medium text-zinc-300 mb-4">Timeline</h3>
                <div ref={containerRef} className="min-h-[200px] flex items-center justify-center text-zinc-500">
                    {!mermaidLoaded && 'Loading...'}
                </div>
            </div>
        </div>
    );
}
