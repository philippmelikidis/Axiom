import { z } from 'zod';

// Task Types
export const TaskTypeSchema = z.enum([
    'build',
    'think',
    'train',
    'admin',
    'explore',
    'recover',
    'social'
]);

export const EffortSchema = z.enum(['low', 'medium', 'high']);

export const TaskStateSchema = z.enum(['todo', 'done', 'skipped']);

export const ProjectStatusSchema = z.enum(['active', 'paused', 'completed']);

// Skill Schema
export const SkillSchema = z.object({
    skillId: z.string(),
    name: z.string(),
    description: z.string().default(''),
    level: z.number().min(0).default(0),
    maxLevel: z.number().min(1).default(10),
    parents: z.array(z.string()).default([]),
    progressRule: z.string().default('')
});

// Skill Impact
export const SkillImpactSchema = z.object({
    skillId: z.string(),
    delta: z.number()
});

// Task Schedule
export const TaskScheduleSchema = z.object({
    earliestDay: z.number().optional(),
    latestDay: z.number(),
    recommendedDay: z.number(),
    flexibilityLevel: z.string().optional()
});

// Training Details (for train type tasks) - ALL FIELDS OPTIONAL/NULLABLE
export const TrainingDetailsSchema = z.object({
    sessionType: z.string().nullable().optional(),
    warmup: z.string().nullable().optional(),
    mainSet: z.string().nullable().optional(),
    cooldown: z.string().nullable().optional(),
    targetPace: z.string().nullable().optional(),
    targetHeartRate: z.string().nullable().optional(),
    rpe: z.string().nullable().optional()
}).nullable().optional();

// Task Details
export const TaskDetailsSchema = z.object({
    steps: z.array(z.string()).default([]),
    definitionOfDone: z.string().default(''),
    notes: z.string().optional(),
    training: TrainingDetailsSchema
});

// Task Schema
export const TaskSchema = z.object({
    taskId: z.string(),
    phaseId: z.string(),
    name: z.string(),
    type: TaskTypeSchema,
    effort: EffortSchema,
    durationMinutes: z.number().min(1),
    details: TaskDetailsSchema,
    schedule: TaskScheduleSchema,
    dependsOnTaskIds: z.array(z.string()).default([]),
    skillImpact: z.array(SkillImpactSchema).default([]),
    state: TaskStateSchema,
    lastUpdated: z.string().default(() => new Date().toISOString())
});

// Milestone Schema
export const MilestoneSchema = z.object({
    milestoneId: z.string(),
    name: z.string(),
    completionRule: z.string().default('')
});

// Phase Schema
export const PhaseSchema = z.object({
    phaseId: z.string(),
    name: z.string(),
    intent: z.string().default(''),
    order: z.number(),
    startDay: z.number(),
    endDay: z.number(),
    milestones: z.array(MilestoneSchema).default([])
});

// Roadmap Schema
export const RoadmapSchema = z.object({
    phases: z.array(PhaseSchema).default([])
});

// Skill Tree Schema
export const SkillTreeSchema = z.object({
    skills: z.array(SkillSchema).default([])
});

// Daily History
export const DailyHistorySchema = z.object({
    date: z.string(),
    completedTaskIds: z.array(z.string()).default([]),
    skippedTaskIds: z.array(z.string()).default([]),
    zeroDay: z.boolean().optional(),
    notes: z.string().optional(),
    autoReplanSummary: z.string().default('')
});

// Progress Schema
export const ProgressSchema = z.object({
    history: z.array(DailyHistorySchema).default([])
});

// Pause Schema
export const PauseSchema = z.object({
    isPaused: z.boolean().default(false),
    pauseUntil: z.string().optional(),
    reason: z.string().optional()
});

// Created From Schema
export const CreatedFromSchema = z.object({
    rawInput: z.string(),
    constraints: z.string().default(''),
    trainingProfile: z.object({
        currentLevel: z.string().optional(),
        constraints: z.string().optional(),
        preferences: z.string().optional(),
        availableMetrics: z.string().optional()
    }).optional()
});

// Today Card Rules - more lenient
export const TodayCardRulesSchema = z.object({
    maxTasks: z.number().optional(),
    maxTasksPerDay: z.number().optional(),
    selectionLogic: z.union([z.array(z.string()), z.string()]).optional()
}).optional();

// Master Plan Phase Schema (for progressive generation)
export const MasterPlanPhaseSchema = z.object({
    phaseNumber: z.number(),
    name: z.string(),
    startWeek: z.number(),
    endWeek: z.number(),
    focus: z.string(),
    weeklyPattern: z.string(),
    targetVolume: z.string().optional(),
    keyWorkouts: z.array(z.string()).default([]),
    progressionRules: z.string().default('')
});

// Master Plan Skill Progression
export const MasterPlanSkillSchema = z.object({
    skillName: z.string(),
    startLevel: z.number().default(0),
    endLevel: z.number().default(10),
    milestones: z.array(z.string()).default([])
});

// Master Plan Schema (lightweight structure for progressive generation)
export const MasterPlanSchema = z.object({
    overview: z.string(),
    principles: z.array(z.string()).default([]),
    phases: z.array(MasterPlanPhaseSchema).default([]),
    skillProgression: z.array(MasterPlanSkillSchema).default([]),
    weeklyTemplate: z.string().optional() // E.g., "Mon: run, Tue: strength, Wed: rest..."
});

// Chat Message Schema
export const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string().optional()
});

// Project Schema
export const ProjectSchema = z.object({
    projectId: z.string(),
    name: z.string(),
    oneLineIntent: z.string().default(''),
    definitionOfDone: z.string().default(''),
    status: ProjectStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    startDate: z.string(),
    timeHorizonDays: z.number().min(1),
    createdFrom: CreatedFromSchema,
    pause: PauseSchema,
    roadmap: RoadmapSchema,
    tasks: z.array(TaskSchema),
    todayCardRules: TodayCardRulesSchema,
    skillTree: SkillTreeSchema,
    progress: ProgressSchema,
    syncedAt: z.string().optional(),
    assumptions: z.array(z.string()).optional(),
    chatHistory: z.array(ChatMessageSchema).optional(),
    // Progressive generation fields
    masterPlan: MasterPlanSchema.optional(),
    generatedUntilDay: z.number().optional(),
    lastGeneratedContext: z.string().optional()
});

// App State Schema
export const AppStateSchema = z.object({
    appVersion: z.string(),
    updatedAt: z.string(),
    selectedProjectId: z.string().nullable(),
    projects: z.array(ProjectSchema),
    userId: z.string().optional(),
    lastSyncedAt: z.string().optional()
});

// Type exports
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type Effort = z.infer<typeof EffortSchema>;
export type TaskState = z.infer<typeof TaskStateSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type SkillImpact = z.infer<typeof SkillImpactSchema>;
export type TaskSchedule = z.infer<typeof TaskScheduleSchema>;
export type TrainingDetails = z.infer<typeof TrainingDetailsSchema>;
export type TaskDetails = z.infer<typeof TaskDetailsSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Roadmap = z.infer<typeof RoadmapSchema>;
export type SkillTree = z.infer<typeof SkillTreeSchema>;
export type DailyHistory = z.infer<typeof DailyHistorySchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type Pause = z.infer<typeof PauseSchema>;
export type CreatedFrom = z.infer<typeof CreatedFromSchema>;
export type TodayCardRules = z.infer<typeof TodayCardRulesSchema>;
export type MasterPlanPhase = z.infer<typeof MasterPlanPhaseSchema>;
export type MasterPlanSkill = z.infer<typeof MasterPlanSkillSchema>;
export type MasterPlan = z.infer<typeof MasterPlanSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type AppState = z.infer<typeof AppStateSchema>;

// Simplified schema for LLM - less strict requirements
export const getSchemaForPrompt = (): string => {
    return `{
  "assumptions": ["string"],
  "name": "string (project name)",
  "oneLineIntent": "string (what this achieves)",
  "definitionOfDone": "string (how we know it's complete)",
  "roadmap": {
    "phases": [{
      "phaseId": "phase_xxx",
      "name": "string",
      "intent": "string",
      "order": number,
      "startDay": number,
      "endDay": number,
      "milestones": []
    }]
  },
  "tasks": [{
    "taskId": "task_xxx",
    "phaseId": "phase_xxx (must match a phase)",
    "name": "string",
    "type": "build | think | train | explore | admin | recover | social",
    "effort": "low | medium | high",
    "durationMinutes": number,
    "details": {
      "steps": ["string"],
      "definitionOfDone": "string",
      "training": {
        "sessionType": "string or null",
        "warmup": "string or null",
        "mainSet": "string or null",
        "cooldown": "string or null",
        "targetPace": "string or null",
        "targetHeartRate": "string or null",
        "rpe": "string or null"
      }
    },
    "schedule": {
      "latestDay": number,
      "recommendedDay": number
    },
    "dependsOnTaskIds": [],
    "skillImpact": [{"skillId": "skill_xxx", "delta": 1}],
    "state": "todo",
    "lastUpdated": "ISO string"
  }],
  "todayCardRules": {
    "maxTasks": 3,
    "selectionLogic": "priority"
  },
  "skillTree": {
    "skills": [{
      "skillId": "skill_xxx",
      "name": "string",
      "description": "string",
      "level": 0,
      "maxLevel": 10,
      "parents": [],
      "progressRule": "string"
    }]
  },
  "progress": { "history": [] }
}`;
};
