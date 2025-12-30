'use client';

import { Skill, Task } from '@/lib/schema';
import { useState, useCallback, useMemo } from 'react';
import { ReactFlow, Node, Edge, Background, Controls, useNodesState, useEdgesState, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface SkillTreeProps {
    skills: Skill[];
    tasks: Task[];
}

interface SkillNodeData {
    skill: Skill;
    impactingTasks: Task[];
}

const SkillNode = ({ data }: { data: SkillNodeData }) => {
    const { skill, impactingTasks } = data;
    const progressPercent = (skill.level / skill.maxLevel) * 100;

    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 min-w-[160px] shadow-lg">
            <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-zinc-200 text-sm">{skill.name}</span>
                <span className="text-xs text-zinc-400">{skill.level}/{skill.maxLevel}</span>
            </div>
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-zinc-400 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            {impactingTasks.length > 0 && (
                <div className="text-[10px] text-zinc-500">{impactingTasks.length} task{impactingTasks.length > 1 ? 's' : ''} impact this</div>
            )}
        </div>
    );
};

const nodeTypes = { skill: SkillNode };

export default function SkillTree({ skills, tasks }: SkillTreeProps) {
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

    const skillTasksMap = useMemo(() => {
        const map = new Map<string, Task[]>();
        skills.forEach(skill => {
            const impactingTasks = tasks.filter(task => task.skillImpact.some(si => si.skillId === skill.skillId));
            map.set(skill.skillId, impactingTasks);
        });
        return map;
    }, [skills, tasks]);

    const { initialNodes, initialEdges } = useMemo(() => {
        const skillsByLevel: Map<number, Skill[]> = new Map();
        const skillDepth: Map<string, number> = new Map();

        const calculateDepth = (skill: Skill, visited: Set<string> = new Set()): number => {
            if (visited.has(skill.skillId)) return 0;
            visited.add(skill.skillId);
            if (skill.parents.length === 0) return 0;
            const parentDepths = skill.parents.map(parentId => {
                const parent = skills.find(s => s.skillId === parentId);
                return parent ? calculateDepth(parent, visited) + 1 : 0;
            });
            return Math.max(...parentDepths);
        };

        skills.forEach(skill => {
            const depth = calculateDepth(skill);
            skillDepth.set(skill.skillId, depth);
            if (!skillsByLevel.has(depth)) skillsByLevel.set(depth, []);
            skillsByLevel.get(depth)!.push(skill);
        });

        const nodes: Node[] = [];
        const xSpacing = 220;
        const ySpacing = 120;

        skillsByLevel.forEach((levelSkills, depth) => {
            const levelWidth = levelSkills.length * xSpacing;
            const startX = -levelWidth / 2 + xSpacing / 2;
            levelSkills.forEach((skill, index) => {
                nodes.push({
                    id: skill.skillId,
                    type: 'skill',
                    position: { x: startX + index * xSpacing, y: depth * ySpacing },
                    data: { skill, impactingTasks: skillTasksMap.get(skill.skillId) || [] },
                    sourcePosition: Position.Bottom,
                    targetPosition: Position.Top,
                });
            });
        });

        const edges: Edge[] = [];
        skills.forEach(skill => {
            skill.parents.forEach(parentId => {
                edges.push({
                    id: `${parentId}-${skill.skillId}`,
                    source: parentId,
                    target: skill.skillId,
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#71717a' },
                    style: { stroke: '#71717a', strokeWidth: 2 },
                    animated: false,
                });
            });
        });

        return { initialNodes: nodes, initialEdges: edges };
    }, [skills, skillTasksMap]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        const skill = skills.find(s => s.skillId === node.id);
        setSelectedSkill(skill || null);
    }, [skills]);

    if (skills.length === 0) {
        return <div className="flex items-center justify-center h-64 text-zinc-500">No skills defined</div>;
    }

    return (
        <div className="space-y-4">
            <div className="h-[400px] bg-zinc-900/50 rounded-2xl border border-zinc-700/50 overflow-hidden">
                <ReactFlow
                    nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.3 }}
                    proOptions={{ hideAttribution: true }} minZoom={0.5} maxZoom={1.5}
                >
                    <Background color="#27272a" gap={20} />
                    <Controls showZoom showFitView showInteractive={false}
                        className="!bg-zinc-800 !border-zinc-700 !rounded-xl [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400" />
                </ReactFlow>
            </div>

            {selectedSkill && (
                <div className="bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="font-semibold text-zinc-200">{selectedSkill.name}</h3>
                            <p className="text-sm text-zinc-500 mt-1">{selectedSkill.description}</p>
                        </div>
                        <button onClick={() => setSelectedSkill(null)} className="text-zinc-500 hover:text-zinc-300">x</button>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                        <div>
                            <span className="text-xs text-zinc-500">Level</span>
                            <div className="font-medium text-zinc-300">{selectedSkill.level} / {selectedSkill.maxLevel}</div>
                        </div>
                        <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-400 rounded-full" style={{ width: `${(selectedSkill.level / selectedSkill.maxLevel) * 100}%` }} />
                        </div>
                    </div>
                    <div className="text-xs text-zinc-500 mb-2">Rule</div>
                    <p className="text-sm text-zinc-400 mb-4">{selectedSkill.progressRule}</p>
                    {skillTasksMap.get(selectedSkill.skillId)?.length ? (
                        <div>
                            <div className="text-xs text-zinc-500 mb-2">Tasks affecting this skill</div>
                            <div className="space-y-1">
                                {skillTasksMap.get(selectedSkill.skillId)!.slice(0, 5).map(task => (
                                    <div key={task.taskId} className="flex items-center gap-2 text-sm">
                                        <span className={`w-2 h-2 rounded-full ${task.state === 'done' ? 'bg-zinc-400' : task.state === 'skipped' ? 'bg-zinc-600' : 'bg-zinc-500'}`} />
                                        <span className={task.state === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-400'}>{task.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-400">All Skills</h3>
                <div className="grid grid-cols-2 gap-2">
                    {skills.map(skill => (
                        <button
                            key={skill.skillId} onClick={() => setSelectedSkill(skill)}
                            className={`p-3 bg-zinc-800/50 rounded-xl border text-left transition-colors ${selectedSkill?.skillId === skill.skillId ? 'border-zinc-500 bg-zinc-700/50' : 'border-zinc-700/50 hover:border-zinc-600'
                                }`}
                        >
                            <div className="font-medium text-sm text-zinc-200 mb-1">{skill.name}</div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-zinc-400 rounded-full" style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-zinc-500">{skill.level}/{skill.maxLevel}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
