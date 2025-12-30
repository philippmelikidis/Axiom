'use client';

import NewProjectForm from '@/components/NewProjectForm';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function NewProjectPage() {
    const router = useRouter();

    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <h1 className="text-2xl font-bold text-zinc-100">New Project</h1>
            </div>
            <NewProjectForm />
        </div>
    );
}
