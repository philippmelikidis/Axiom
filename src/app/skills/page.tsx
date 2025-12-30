'use client';

import { useAppStore } from '@/lib/store';
import SkillTree from '@/components/SkillTree';
import ProjectPicker from '@/components/ProjectPicker';
import { useRouter } from 'next/navigation';

export default function SkillsPage() {
    const router = useRouter();
    const project = useAppStore((s) => s.getSelectedProject());

    if (!project) {
        return (
            <div className="px-4 py-6 max-w-lg mx-auto text-center">
                <h1 className="text-2xl font-bold text-zinc-100 mb-4">Skills</h1>
                <p className="text-zinc-500 mb-6">Select a project to view skills</p>
                <button onClick={() => router.push('/projects')} className="px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium">Go to Projects</button>
            </div>
        );
    }

    const skills = project.skillTree.skills;
    const avgProgress = skills.length > 0 ? Math.round(skills.reduce((acc, s) => acc + (s.level / s.maxLevel) * 100, 0) / skills.length) : 0;

    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
                <ProjectPicker />
                <div className="text-right">
                    <div className="text-sm text-zinc-500">Avg Progress</div>
                    <div className="text-lg font-bold text-zinc-200">{avgProgress}%</div>
                </div>
            </div>
            <SkillTree skills={skills} tasks={project.tasks} />
        </div>
    );
}
