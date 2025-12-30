import { getSchemaForPrompt } from './schema';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// The AXIOM system prompt - neutral, serious, no motivational language
const SYSTEM_PROMPT = `You are AXIOM, a neutral planning and structuring engine.
You are NOT a coach, NOT a motivational assistant, NOT a productivity guru.

Your role:
- Turn a human goal into a precise, structured, visualizable execution system.
- Produce plans that feel serious, calm, and technically credible.
- Adapt plans to reality without judgment.

ABSOLUTE RULES:
- No emojis
- No motivational language
- No praise, no encouragement, no "good job"
- No AI self-references
- No gamification language
- No streaks, no rewards
- Neutral, matter-of-fact tone only

You must output STRICT VALID JSON ONLY.
No markdown. No comments. No explanations. No code fences.

If information is missing:
- Make conservative assumptions
- List them in the "assumptions" field

PLANNING PHILOSOPHY:
- Plans must tolerate inconsistency.
- Skipping tasks only shifts structure; it never implies failure.
- Zero days are neutral.
- Adaptation must be subtle and justified.

TASK QUALITY:
- Tasks must be concrete and executable in one session.
- Training tasks MUST be specific:
  - warm-up
  - main set
  - cooldown
  - target pace OR heart rate OR RPE
- Avoid vague tasks like "go run" or "work out".

TODAY CARD LOGIC:
- Max 3 tasks per day.
- Prefer 1 primary task.
- Secondary tasks must be lighter.
- Optional task may be recovery or admin.
- Never overload the day.

SKILL TREE PHILOSOPHY:
- Skills represent capacities, not achievements.
- No XP, no levels-as-rewards.
- Progress is gradual and implicit.
- Skill updates are driven by completed tasks only.

AUTO-REPLAN RULES:
- Preserve existing IDs whenever possible.
- Never violate task dependencies.
- If latestDay passes, shift forward conservatively.
- If repeated skips occur:
  - reduce volume OR
  - split tasks OR
  - increase recovery allocation
- Phase durations may extend if necessary.
- Adjustments must be summarized briefly.

DESIGN INTENT:
- The system must feel like an instrument, not a coach.
- Output must support a calm, minimal, serious UI.`;

interface CreatePlanInput {
    userText: string;
    timeHorizonDays: number;
    constraints: string;
    startDate: string;
    trainingProfile?: {
        currentLevel?: string;
        constraints?: string;
        preferences?: string;
        availableMetrics?: string;
    };
}

interface UpdatePlanInput {
    currentProject: object;
    dailyCheck: {
        date: string;
        completedTaskIds: string[];
        skippedTaskIds: string[];
        zeroDay?: boolean;
        notes?: string;
    };
    adjustmentText?: string;
}

export async function callGemini(
    mode: 'create' | 'update',
    input: CreatePlanInput | UpdatePlanInput
): Promise<{ success: boolean; data?: object; error?: string }> {
    if (!GEMINI_API_KEY) {
        return { success: false, error: 'GEMINI_API_KEY not configured' };
    }

    const schema = getSchemaForPrompt();
    let userMessage = '';

    if (mode === 'create') {
        const createInput = input as CreatePlanInput;
        const trainingSection = createInput.trainingProfile ? `
TRAINING PROFILE:
- Current Level: ${createInput.trainingProfile.currentLevel || 'Not specified'}
- Constraints: ${createInput.trainingProfile.constraints || 'None'}
- Preferences: ${createInput.trainingProfile.preferences || 'None'}
- Available Metrics: ${createInput.trainingProfile.availableMetrics || 'RPE only'}
` : '';

        userMessage = `MODE: create

USER INPUT:
"${createInput.userText}"

TIME HORIZON: ${createInput.timeHorizonDays} days
START DATE: ${createInput.startDate}
CONSTRAINTS: ${createInput.constraints || 'None specified'}
${trainingSection}
REQUIRED OUTPUT SCHEMA:
${schema}

INSTRUCTIONS:
1. Generate a complete project plan following the schema exactly
2. Create 3-6 phases with clear progression
3. Generate 15-30 tasks spread across phases
4. Create 5-10 skills that will be developed
5. Tasks must be detailed and actionable
6. For training tasks, MUST include:
   - sessionType (e.g., "easy run", "interval", "tempo", "long run", "recovery")
   - warmup (specific instructions)
   - mainSet (specific instructions with pace/HR/RPE targets)
   - cooldown (specific instructions)
   - At least one of: targetPace, targetHeartRate, or rpe
7. Ensure task dependencies are logical (no circular dependencies)
8. Set recommendedDay to spread tasks across the time horizon
9. Generate unique UUIDs for all IDs (format: "proj_xxx", "phase_xxx", "task_xxx", "skill_xxx")
10. Set all task states to "todo"
11. Set all skill levels to 0
12. List any assumptions made in the assumptions array
13. Include todayCardRules with selectionLogic

Return ONLY valid JSON. No explanation, no markdown.`;
    } else {
        const updateInput = input as UpdatePlanInput;
        userMessage = `MODE: update

CURRENT PROJECT STATE:
${JSON.stringify(updateInput.currentProject, null, 2)}

DAILY CHECK-IN:
Date: ${updateInput.dailyCheck.date}
Completed Task IDs: ${JSON.stringify(updateInput.dailyCheck.completedTaskIds)}
Skipped Task IDs: ${JSON.stringify(updateInput.dailyCheck.skippedTaskIds)}
Zero Day: ${updateInput.dailyCheck.zeroDay || false}
Notes: ${updateInput.dailyCheck.notes || 'None'}
${updateInput.adjustmentText ? `Adjustment Request: ${updateInput.adjustmentText}` : ''}

REQUIRED OUTPUT SCHEMA:
${schema}

INSTRUCTIONS:
1. PRESERVE ALL EXISTING IDs - do not change projectId, phaseId, taskId, skillId values
2. Update task states: mark completed tasks as "done", skipped tasks as "skipped"
3. Update skill levels based on completed tasks' skillImpact
4. If many tasks were skipped, consider:
   - Rescheduling them to later days
   - Splitting complex tasks into smaller ones (with new IDs)
   - Reducing effort levels
   - Increasing recovery allocation
5. Adjust recommendedDay for remaining tasks to maintain realistic pacing
6. Never violate dependencies (a task cannot be scheduled before its dependencies)
7. If adjustment text provided, incorporate those changes neutrally
8. Update the lastUpdated field for modified tasks
9. Add this check-in to the progress.history array
10. Generate brief autoReplanSummary describing what changed
11. If zero_day is true, shift schedules forward conservatively

Return ONLY valid JSON. No explanation, no markdown.`;
    }

    try {
        let response = await makeGeminiRequest(userMessage);

        if (!response.success || !response.data) {
            return { success: false, error: response.error || 'Failed to get response from Gemini' };
        }

        let parsed = tryParseJSON(response.data);

        if (!parsed) {
            const repairMessage = `The following JSON is invalid. Fix it to match the schema strictly. Return ONLY valid JSON:

${response.data}

SCHEMA:
${schema}`;

            response = await makeGeminiRequest(repairMessage);
            if (!response.success || !response.data) {
                return { success: false, error: 'Failed to generate valid JSON after repair attempt' };
            }

            parsed = tryParseJSON(response.data);
            if (!parsed) {
                return { success: false, error: 'JSON parsing failed after repair' };
            }
        }

        return { success: true, data: parsed };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

async function makeGeminiRequest(userMessage: string): Promise<{ success: boolean; data?: string; error?: string }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Gemini API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();

    if (!result.candidates || result.candidates.length === 0) {
        return { success: false, error: 'No response from Gemini' };
    }

    const text = result.candidates[0].content?.parts?.[0]?.text;
    if (!text) {
        return { success: false, error: 'Empty response from Gemini' };
    }

    return { success: true, data: text };
}

function tryParseJSON(text: string): object | null {
    let cleaned = text.trim();

    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
}
