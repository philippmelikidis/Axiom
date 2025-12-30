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
    description: z.string(),
    level: z.number().min(0),
    maxLevel: z.number().min(1),
    parents: z.array(z.string()),
    progressRule: z.string()
});

// Skill Impact
export const SkillImpactSchema = z.object({
    skillId: z.string(),
    delta: z.number()
});

// Task Schedule
export const TaskScheduleSchema = z.object({
    earliestDay: z.number(),
    latestDay: z.number(),
    recommendedDay: z.number()
});

// Training Details (for train type tasks)
export const TrainingDetailsSchema = z.object({
    sessionType: z.string().optional(),
    warmup: z.string().optional(),
    mainSet: z.string().optional(),
    cooldown: z.string().optional(),
    targetPace: z.string().nullable().optional(),
    targetHeartRate: z.string().nullable().optional(),
    rpe: z.string().nullable().optional()
}).optional();

// Task Details
export const TaskDetailsSchema = z.object({
    steps: z.array(z.string()),
    definitionOfDone: z.string(),
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
    dependsOnTaskIds: z.array(z.string()),
    skillImpact: z.array(SkillImpactSchema),
    state: TaskStateSchema,
    lastUpdated: z.string()
});

// Milestone Schema
export const MilestoneSchema = z.object({
    milestoneId: z.string(),
    name: z.string(),
    completionRule: z.string()
});

// Phase Schema
export const PhaseSchema = z.object({
    phaseId: z.string(),
    name: z.string(),
    intent: z.string(),
    order: z.number(),
    startDay: z.number(),
    endDay: z.number(),
    milestones: z.array(MilestoneSchema)
});

// Roadmap Schema
export const RoadmapSchema = z.object({
    phases: z.array(PhaseSchema)
});

// Skill Tree Schema
export const SkillTreeSchema = z.object({
    skills: z.array(SkillSchema)
});

// Daily History
export const DailyHistorySchema = z.object({
    date: z.string(),
    completedTaskIds: z.array(z.string()),
    skippedTaskIds: z.array(z.string()),
    zeroDay: z.boolean().optional(),
    notes: z.string().optional(),
    autoReplanSummary: z.string()
});

// Progress Schema
export const ProgressSchema = z.object({
    history: z.array(DailyHistorySchema)
});

// Pause Schema
export const PauseSchema = z.object({
    isPaused: z.boolean(),
    pauseUntil: z.string().optional(),
    reason: z.string().optional()
});

// Created From Schema
export const CreatedFromSchema = z.object({
    rawInput: z.string(),
    constraints: z.string(),
    trainingProfile: z.object({
        currentLevel: z.string().optional(),
        constraints: z.string().optional(),
        preferences: z.string().optional(),
        availableMetrics: z.string().optional()
    }).optional()
});

// Today Card Rules
export const TodayCardRulesSchema = z.object({
    maxTasks: z.number(),
    selectionLogic: z.array(z.string())
}).optional();

// Project Schema
export const ProjectSchema = z.object({
    projectId: z.string(),
    name: z.string(),
    oneLineIntent: z.string(),
    definitionOfDone: z.string(),
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
    assumptions: z.array(z.string()).optional()
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
export type Project = z.infer<typeof ProjectSchema>;
export type AppState = z.infer<typeof AppStateSchema>;

// Schema as JSON for LLM prompts
export const getSchemaForPrompt = (): string => {
    return `{
  "assumptions": ["string"],
  "project": {
    "projectId": "string (uuid)",
    "name": "string",
    "oneLineIntent": "string",
    "definitionOfDone": "string",
    "status": "active | paused | completed",
    "createdAt": "ISO string",
    "updatedAt": "ISO string",
    "startDate": "YYYY-MM-DD",
    "timeHorizonDays": number,
    "createdFrom": {
      "rawInput": "string",
      "constraints": "string",
      "trainingProfile": {
        "currentLevel": "string (optional)",
        "constraints": "string (optional)",
        "preferences": "string (optional)",
        "availableMetrics": "string (optional)"
      }
    },
    "pause": {
      "isPaused": boolean,
      "pauseUntil": "YYYY-MM-DD (optional)",
      "reason": "string (optional)"
    },
    "roadmap": {
      "phases": [{
        "phaseId": "string (uuid)",
        "name": "string",
        "intent": "string",
        "order": number (0-indexed),
        "startDay": number (day 0 = project start),
        "endDay": number,
        "milestones": [{
          "milestoneId": "string (uuid)",
          "name": "string",
          "completionRule": "string"
        }]
      }]
    },
    "tasks": [{
      "taskId": "string (uuid)",
      "phaseId": "string (matches a phase)",
      "name": "string",
      "type": "build | think | train | explore | admin | recover | social",
      "effort": "low | medium | high",
      "durationMinutes": number (15-180),
      "details": {
        "steps": ["string"],
        "definitionOfDone": "string",
        "training": {
          "sessionType": "string",
          "warmup": "string",
          "mainSet": "string",
          "cooldown": "string",
          "targetPace": "string | null",
          "targetHeartRate": "string | null",
          "rpe": "string | null"
        }
      },
      "schedule": {
        "earliestDay": number,
        "latestDay": number,
        "recommendedDay": number
      },
      "dependsOnTaskIds": ["string (taskId)"],
      "skillImpact": [{
        "skillId": "string",
        "delta": number (1-3)
      }],
      "state": "todo | done | skipped",
      "lastUpdated": "ISO string"
    }],
    "todayCardRules": {
      "maxTasks": 3,
      "selectionLogic": [
        "Respect dependencies",
        "Prioritize tasks nearing latestDay",
        "Prefer one primary task",
        "Bias toward recovery if notes indicate fatigue"
      ]
    },
    "skillTree": {
      "skills": [{
        "skillId": "string (uuid)",
        "name": "string",
        "description": "string",
        "level": number (0-10),
        "maxLevel": number (usually 10),
        "parents": ["string (skillId)"],
        "progressRule": "string"
      }]
    },
    "progress": {
      "history": []
    }
  }
}`;
};
