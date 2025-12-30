'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { AppState, Project, DailyHistory, AppStateSchema } from './schema';
import { applyLocalTaskStateChange, generateUserId } from './utils';

const INITIAL_STATE: AppState = {
    appVersion: '1.1',
    updatedAt: new Date().toISOString(),
    selectedProjectId: null,
    projects: [],
    userId: undefined,
    lastSyncedAt: undefined
};

interface SyncStatus {
    isSyncing: boolean;
    lastSyncError: string | null;
    lastSyncedAt: string | null;
}

interface AppStore extends AppState {
    syncStatus: SyncStatus;

    // Project actions
    addProject: (project: Project) => void;
    updateProject: (projectId: string, updates: Partial<Project>) => void;
    deleteProject: (projectId: string) => void;
    selectProject: (projectId: string | null) => void;
    duplicateProject: (projectId: string) => void;

    // Task actions
    markTaskDone: (projectId: string, taskId: string) => void;
    markTaskSkipped: (projectId: string, taskId: string) => void;
    undoTaskState: (projectId: string, taskId: string) => void;

    // Daily check-in
    addDailyHistory: (projectId: string, history: DailyHistory) => void;

    // Pause actions
    pauseProject: (projectId: string, days: number, reason?: string) => void;
    resumeProject: (projectId: string) => void;

    // Cloud sync
    getUserId: () => string;
    syncToCloud: () => Promise<void>;
    syncFromCloud: () => Promise<void>;

    // Import/Export
    exportAppState: () => AppState;
    importAppState: (state: AppState) => { success: boolean; error?: string };
    resetApp: () => void;

    // Get selected project
    getSelectedProject: () => Project | null;
}

export const useAppStore = create<AppStore>()(
    persist(
        (set, get) => ({
            ...INITIAL_STATE,
            syncStatus: {
                isSyncing: false,
                lastSyncError: null,
                lastSyncedAt: null
            },

            addProject: (project: Project) => {
                set((state) => ({
                    projects: [...state.projects, project],
                    selectedProjectId: project.projectId,
                    updatedAt: new Date().toISOString()
                }));
            },

            updateProject: (projectId: string, updates: Partial<Project>) => {
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.projectId === projectId
                            ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                            : p
                    ),
                    updatedAt: new Date().toISOString()
                }));
            },

            deleteProject: (projectId: string) => {
                set((state) => ({
                    projects: state.projects.filter((p) => p.projectId !== projectId),
                    selectedProjectId:
                        state.selectedProjectId === projectId
                            ? (state.projects.find((p) => p.projectId !== projectId)?.projectId ?? null)
                            : state.selectedProjectId,
                    updatedAt: new Date().toISOString()
                }));
            },

            selectProject: (projectId: string | null) => {
                set({ selectedProjectId: projectId });
            },

            duplicateProject: (projectId: string) => {
                const state = get();
                const original = state.projects.find((p) => p.projectId === projectId);
                if (!original) return;

                const newProjectId = uuidv4();
                const now = new Date().toISOString();

                const phaseIdMap = new Map<string, string>();
                const taskIdMap = new Map<string, string>();
                const skillIdMap = new Map<string, string>();

                original.roadmap.phases.forEach((p) => {
                    phaseIdMap.set(p.phaseId, uuidv4());
                });
                original.tasks.forEach((t) => {
                    taskIdMap.set(t.taskId, uuidv4());
                });
                original.skillTree.skills.forEach((s) => {
                    skillIdMap.set(s.skillId, uuidv4());
                });

                const newProject: Project = {
                    ...original,
                    projectId: newProjectId,
                    name: `${original.name} (Copy)`,
                    createdAt: now,
                    updatedAt: now,
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'active',
                    pause: { isPaused: false },
                    roadmap: {
                        phases: original.roadmap.phases.map((p) => ({
                            ...p,
                            phaseId: phaseIdMap.get(p.phaseId)!,
                            milestones: p.milestones.map((m) => ({
                                ...m,
                                milestoneId: uuidv4()
                            }))
                        }))
                    },
                    tasks: original.tasks.map((t) => ({
                        ...t,
                        taskId: taskIdMap.get(t.taskId)!,
                        phaseId: phaseIdMap.get(t.phaseId)!,
                        dependsOnTaskIds: t.dependsOnTaskIds.map((id) => taskIdMap.get(id) || id),
                        skillImpact: t.skillImpact.map((si) => ({
                            ...si,
                            skillId: skillIdMap.get(si.skillId) || si.skillId
                        })),
                        state: 'todo',
                        lastUpdated: now
                    })),
                    skillTree: {
                        skills: original.skillTree.skills.map((s) => ({
                            ...s,
                            skillId: skillIdMap.get(s.skillId)!,
                            parents: s.parents.map((id) => skillIdMap.get(id) || id),
                            level: 0
                        }))
                    },
                    progress: { history: [] }
                };

                set((state) => ({
                    projects: [...state.projects, newProject],
                    selectedProjectId: newProjectId,
                    updatedAt: now
                }));
            },

            markTaskDone: (projectId: string, taskId: string) => {
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.projectId === projectId
                            ? applyLocalTaskStateChange(p, taskId, 'done')
                            : p
                    ),
                    updatedAt: new Date().toISOString()
                }));
            },

            markTaskSkipped: (projectId: string, taskId: string) => {
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.projectId === projectId
                            ? applyLocalTaskStateChange(p, taskId, 'skipped')
                            : p
                    ),
                    updatedAt: new Date().toISOString()
                }));
            },

            undoTaskState: (projectId: string, taskId: string) => {
                set((state) => ({
                    projects: state.projects.map((p) => {
                        if (p.projectId !== projectId) return p;

                        const task = p.tasks.find((t) => t.taskId === taskId);
                        if (!task || task.state === 'todo') return p;

                        let updatedSkills = p.skillTree.skills;
                        if (task.state === 'done') {
                            updatedSkills = p.skillTree.skills.map((skill) => {
                                const impact = task.skillImpact.find((si) => si.skillId === skill.skillId);
                                if (impact) {
                                    const newLevel = Math.max(0, skill.level - impact.delta);
                                    return { ...skill, level: newLevel };
                                }
                                return skill;
                            });
                        }

                        return {
                            ...p,
                            tasks: p.tasks.map((t) =>
                                t.taskId === taskId
                                    ? { ...t, state: 'todo' as const, lastUpdated: new Date().toISOString() }
                                    : t
                            ),
                            skillTree: { skills: updatedSkills },
                            updatedAt: new Date().toISOString()
                        };
                    }),
                    updatedAt: new Date().toISOString()
                }));
            },

            addDailyHistory: (projectId: string, history: DailyHistory) => {
                set((state) => ({
                    projects: state.projects.map((p) => {
                        if (p.projectId !== projectId) return p;

                        const filteredHistory = p.progress.history.filter(
                            (h) => h.date !== history.date
                        );

                        return {
                            ...p,
                            progress: {
                                history: [...filteredHistory, history]
                            },
                            updatedAt: new Date().toISOString()
                        };
                    }),
                    updatedAt: new Date().toISOString()
                }));
            },

            pauseProject: (projectId: string, days: number, reason?: string) => {
                const pauseUntil = new Date();
                pauseUntil.setDate(pauseUntil.getDate() + days);

                set((state) => ({
                    projects: state.projects.map((p) => {
                        if (p.projectId !== projectId) return p;

                        const updatedTasks = p.tasks.map((t) => ({
                            ...t,
                            schedule: {
                                earliestDay: t.schedule.earliestDay + days,
                                latestDay: t.schedule.latestDay + days,
                                recommendedDay: t.schedule.recommendedDay + days
                            }
                        }));

                        const updatedPhases = p.roadmap.phases.map((phase) => ({
                            ...phase,
                            startDay: phase.startDay + days,
                            endDay: phase.endDay + days
                        }));

                        return {
                            ...p,
                            status: 'paused' as const,
                            pause: {
                                isPaused: true,
                                pauseUntil: pauseUntil.toISOString().split('T')[0],
                                reason
                            },
                            tasks: updatedTasks,
                            roadmap: { phases: updatedPhases },
                            timeHorizonDays: p.timeHorizonDays + days,
                            updatedAt: new Date().toISOString()
                        };
                    }),
                    updatedAt: new Date().toISOString()
                }));
            },

            resumeProject: (projectId: string) => {
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.projectId === projectId
                            ? {
                                ...p,
                                status: 'active' as const,
                                pause: { isPaused: false },
                                updatedAt: new Date().toISOString()
                            }
                            : p
                    ),
                    updatedAt: new Date().toISOString()
                }));
            },

            getUserId: () => {
                const state = get();
                if (state.userId) return state.userId;

                const newUserId = generateUserId();
                set({ userId: newUserId });
                return newUserId;
            },

            syncToCloud: async () => {
                const state = get();
                const userId = state.userId || get().getUserId();

                set({ syncStatus: { ...state.syncStatus, isSyncing: true, lastSyncError: null } });

                try {
                    const response = await fetch('/api/sync/push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            appState: {
                                appVersion: state.appVersion,
                                updatedAt: state.updatedAt,
                                selectedProjectId: state.selectedProjectId,
                                projects: state.projects
                            }
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Sync failed');
                    }

                    const now = new Date().toISOString();
                    set({
                        lastSyncedAt: now,
                        syncStatus: { isSyncing: false, lastSyncError: null, lastSyncedAt: now }
                    });
                } catch (error) {
                    set({
                        syncStatus: {
                            isSyncing: false,
                            lastSyncError: error instanceof Error ? error.message : 'Sync failed',
                            lastSyncedAt: state.syncStatus.lastSyncedAt
                        }
                    });
                }
            },

            syncFromCloud: async () => {
                const state = get();
                const userId = state.userId;

                if (!userId) {
                    set({ syncStatus: { ...state.syncStatus, lastSyncError: 'No user ID' } });
                    return;
                }

                set({ syncStatus: { ...state.syncStatus, isSyncing: true, lastSyncError: null } });

                try {
                    const response = await fetch(`/api/sync/pull?userId=${userId}`);

                    if (!response.ok) {
                        throw new Error('Sync failed');
                    }

                    const data = await response.json();

                    if (data.appState) {
                        const now = new Date().toISOString();
                        set({
                            ...data.appState,
                            userId,
                            lastSyncedAt: now,
                            syncStatus: { isSyncing: false, lastSyncError: null, lastSyncedAt: now }
                        });
                    } else {
                        set({
                            syncStatus: { isSyncing: false, lastSyncError: null, lastSyncedAt: state.syncStatus.lastSyncedAt }
                        });
                    }
                } catch (error) {
                    set({
                        syncStatus: {
                            isSyncing: false,
                            lastSyncError: error instanceof Error ? error.message : 'Sync failed',
                            lastSyncedAt: state.syncStatus.lastSyncedAt
                        }
                    });
                }
            },

            exportAppState: () => {
                const state = get();
                return {
                    appVersion: state.appVersion,
                    updatedAt: state.updatedAt,
                    selectedProjectId: state.selectedProjectId,
                    projects: state.projects
                };
            },

            importAppState: (newState: AppState) => {
                try {
                    const validated = AppStateSchema.parse(newState);
                    set({
                        ...validated,
                        updatedAt: new Date().toISOString()
                    });
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'Invalid data format'
                    };
                }
            },

            resetApp: () => {
                set({
                    ...INITIAL_STATE,
                    syncStatus: { isSyncing: false, lastSyncError: null, lastSyncedAt: null }
                });
            },

            getSelectedProject: () => {
                const state = get();
                if (!state.selectedProjectId) return null;
                return state.projects.find((p) => p.projectId === state.selectedProjectId) ?? null;
            }
        }),
        {
            name: 'axiom-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                appVersion: state.appVersion,
                updatedAt: state.updatedAt,
                selectedProjectId: state.selectedProjectId,
                projects: state.projects,
                userId: state.userId,
                lastSyncedAt: state.lastSyncedAt
            })
        }
    )
);
