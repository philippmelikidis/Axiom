'use client';

import { useAppStore } from '@/lib/store';
import { buildIcs } from '@/lib/utils';
import { Project, AppStateSchema } from '@/lib/schema';
import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Calendar, FileJson, AlertTriangle, Cloud, Loader2, RefreshCw } from 'lucide-react';

interface ImportExportProps {
    project?: Project;
}

export default function ImportExport({ project }: ImportExportProps) {
    const { exportAppState, importAppState, resetApp, syncToCloud, syncFromCloud, syncStatus, getUserId, userId } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [icsFilter, setIcsFilter] = useState<'all' | 'train'>('all');

    const handleExportJSON = () => {
        const state = exportAppState();
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `axiom-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const validated = AppStateSchema.safeParse(data);
            if (!validated.success) {
                setImportError('Invalid file format');
                return;
            }
            const result = importAppState(validated.data);
            if (!result.success) {
                setImportError(result.error || 'Import failed');
            } else {
                setImportError(null);
            }
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Failed to read file');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExportICS = () => {
        if (!project) return;
        const filter = icsFilter === 'train' ? ['train'] : undefined;
        const icsContent = buildIcs(project, filter);
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        resetApp();
        setShowResetConfirm(false);
    };

    const handleSync = async () => {
        await syncToCloud();
    };

    const handleRestore = async () => {
        await syncFromCloud();
    };

    return (
        <div className="space-y-4">
            {/* Cloud Sync */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-3 mb-3">
                    <Cloud className="w-5 h-5 text-zinc-400" />
                    <h3 className="font-medium text-zinc-200">Cloud Sync</h3>
                </div>
                <p className="text-sm text-zinc-500 mb-3">
                    ID: {userId || 'Not set'}
                </p>
                {syncStatus.lastSyncError && (
                    <p className="text-sm text-zinc-400 mb-3">{syncStatus.lastSyncError}</p>
                )}
                {syncStatus.lastSyncedAt && (
                    <p className="text-xs text-zinc-500 mb-3">Last sync: {new Date(syncStatus.lastSyncedAt).toLocaleString()}</p>
                )}
                <div className="flex gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncStatus.isSyncing}
                        className="flex-1 py-3 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {syncStatus.isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Push
                    </button>
                    <button
                        onClick={handleRestore}
                        disabled={syncStatus.isSyncing}
                        className="flex-1 py-3 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {syncStatus.isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Pull
                    </button>
                </div>
            </div>

            {/* Calendar Export */}
            {project && (
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                    <div className="flex items-center gap-3 mb-3">
                        <Calendar className="w-5 h-5 text-zinc-400" />
                        <h3 className="font-medium text-zinc-200">Calendar Export</h3>
                    </div>
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setIcsFilter('all')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${icsFilter === 'all' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-700/50 text-zinc-400'}`}>All Tasks</button>
                        <button onClick={() => setIcsFilter('train')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${icsFilter === 'train' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-700/50 text-zinc-400'}`}>Training Only</button>
                    </div>
                    <button onClick={handleExportICS} className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Download .ics
                    </button>
                </div>
            )}

            {/* JSON Export/Import */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-3 mb-4">
                    <FileJson className="w-5 h-5 text-zinc-400" />
                    <h3 className="font-medium text-zinc-200">Local Backup</h3>
                </div>
                <div className="space-y-3">
                    <button onClick={handleExportJSON} className="w-full py-3 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Export JSON
                    </button>
                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Import JSON
                    </button>
                    {importError && <div className="text-zinc-400 text-sm">{importError}</div>}
                </div>
            </div>

            {/* Reset App */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-600/30">
                <div className="flex items-center gap-3 mb-3">
                    <Trash2 className="w-5 h-5 text-zinc-500" />
                    <h3 className="font-medium text-zinc-400">Reset</h3>
                </div>
                <button onClick={() => setShowResetConfirm(true)} className="w-full py-3 bg-zinc-700/30 hover:bg-zinc-700/50 border border-zinc-600/30 rounded-lg font-medium text-zinc-500 transition-colors">Reset All Data</button>
            </div>

            {showResetConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-zinc-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-100">Reset All Data?</h3>
                        </div>
                        <p className="text-zinc-500 mb-6">This will permanently delete all local data.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-zinc-300 transition-colors">Cancel</button>
                            <button onClick={handleReset} className="flex-1 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg font-medium transition-colors">Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
