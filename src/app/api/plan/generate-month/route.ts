import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are AXIOM, a precision planning engine that generates highly specific daily tasks.
Each task must be CONCRETE and EXECUTABLE with exact parameters.

IMPORTANT REGIONAL SETTINGS:
- Use ONLY European metric system: km, min/km, meters (NEVER miles, min/mile)
- Paces in format: X:XX/km (e.g., 5:30/km, 6:00/km)
- Distances in km or meters
- Language: Generate task names and descriptions in German

CRITICAL RULES FOR SPECIFICITY:
1. NEVER use vague terms like "lockerer Lauf" or "Krafttraining" without specifics
2. ALWAYS include exact numbers, durations, sets, reps, paces, or zones
3. Use the athlete's actual pace data to calculate training zones

TASK SPECIFICITY REQUIREMENTS BY TYPE:

TRAINING (type: "train"):
- Running: Include exact pace (e.g., "5:30/km"), HR zone (e.g., "Zone 2: 130-145bpm"), AND duration
- Example: "45min @ 6:00/km (Zone 2, 130-140bpm) - Aerobe Basis"
- Intervals: Specify reps, distance, pace, recovery (e.g., "6x800m @ 4:15/km, 90s Trabpause")
- Strength: Exact exercises, sets, reps, rest (e.g., "3x12 Bulgarische Kniebeugen pro Bein, 3x15 Wadenheben, 60s Pause")

BUILD/THINK tasks:
- Include specific deliverables, word counts, or measurable outcomes
- Example: "Ernährungsplan erstellen: 500 Wörter über Carb-Timing, Hydration"

RECOVERY:
- Specify exact activities (e.g., "20min Foam Rolling: IT-Band 3min/Seite, Quads 2min/Seite")

CALCULATE TRAINING ZONES from race times if provided:
- Easy/Zone 2: race pace + 60-90 sec/km
- Tempo/Zone 3: race pace + 20-30 sec/km  
- Threshold/Zone 4: race pace + 0-15 sec/km
- VO2max/Zone 5: race pace - 15-30 sec/km

Each task name should include the key specifics, not generic labels.
Good: "6x400m Intervalle @ 4:00/km + 30min Core-Training"
Bad: "Intervalltraining - Woche 1"`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { project, monthNumber, daysToGenerate } = body;

        if (!project || monthNumber === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { success: false, error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        const days = daysToGenerate || 30;
        const startDay = (project.generatedUntilDay || 0) + 1;
        const endDay = Math.min(startDay + days - 1, project.timeHorizonDays);

        console.log(`[Generate Month] Days ${startDay}-${endDay}...`);

        const masterPlan = project.masterPlan;
        if (!masterPlan) {
            return NextResponse.json(
                { success: false, error: 'Project has no master plan' },
                { status: 400 }
            );
        }

        const currentWeek = Math.ceil(startDay / 7);
        const currentPhase = masterPlan.phases?.find(
            (p: { startWeek: number; endWeek: number }) => currentWeek >= p.startWeek && currentWeek <= p.endWeek
        ) || masterPlan.phases?.[0];

        const recentTasks = project.tasks?.slice(-10).map((t: { name: string; state: string }) =>
            `${t.name} (${t.state})`
        ).join(', ') || 'None';

        // Extract athlete data from original input for zone calculations
        const userInput = project.createdFrom?.rawInput || '';

        const taskSchema = `{
  "tasks": [{
    "taskId": "task_xxx",
    "phaseId": "string",
    "name": "string (MUST include specific numbers, paces, durations)",
    "type": "train | build | think | explore | admin | recover | social",
    "effort": "low | medium | high",
    "durationMinutes": number,
    "details": {
      "steps": ["string (each step must be specific and measurable)"],
      "definitionOfDone": "string (concrete completion criteria)",
      "training": {
        "sessionType": "easy | tempo | intervals | long | recovery | strength | cross-training",
        "warmup": "string (e.g., '10min jog @ 6:30/km + dynamic stretches')",
        "mainSet": "string (e.g., '30min @ 5:45/km Zone 2' or '5x1000m @ 4:30/km, 2min rest')",
        "cooldown": "string (e.g., '10min easy jog + stretching')",
        "targetPace": "string (e.g., '5:30-5:45/km')",
        "targetHeartRate": "string (e.g., '130-145bpm / Zone 2')",
        "rpe": "string (e.g., 'RPE 4-5 / conversational')"
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
  }]
}`;

        const userMessage = `${SYSTEM_PROMPT}

PROJECT: ${project.name}
GOAL: ${project.oneLineIntent}
START DATE: ${project.startDate}

ATHLETE'S ORIGINAL INPUT (use this to calculate exact paces/zones):
"""
${userInput.substring(0, 2000)}
"""

MASTER PLAN:
${masterPlan.overview}

CURRENT PHASE: ${currentPhase?.name || 'Phase 1'}
- Focus: ${currentPhase?.focus || 'Base building'}
- Weekly Pattern: ${currentPhase?.weeklyPattern || masterPlan.weeklyTemplate}
- Target Volume: ${currentPhase?.targetVolume || 'Progressive'}
- Key Workouts: ${currentPhase?.keyWorkouts?.join(', ') || 'Varied'}
- Progression: ${currentPhase?.progressionRules || 'Gradual increase'}

SKILLS TO DEVELOP: ${project.skillTree?.skills?.map((s: { skillId: string; name: string }) =>
            `${s.skillId}: ${s.name}`
        ).join(', ')}

PHASES: ${project.roadmap?.phases?.map((p: { phaseId: string; name: string }) =>
            `${p.phaseId}: ${p.name}`
        ).join(', ')}

RECENT CONTEXT: ${project.lastGeneratedContext || 'Starting fresh'}
RECENT TASKS: ${recentTasks}

GENERATE FOR DAYS ${startDay} to ${endDay} (${endDay - startDay + 1} days)

REQUIREMENTS:
1. Generate ${Math.ceil((endDay - startDay + 1) * 0.7)} tasks (include rest days)
2. Each task name MUST contain specific numbers/paces/durations
3. Use the athlete's race times to calculate correct training zones
4. Spread tasks evenly: recommendedDay between ${startDay} and ${endDay}
5. Follow weekly pattern but make each task UNIQUE and SPECIFIC

OUTPUT SCHEMA:
${taskSchema}

Return ONLY valid JSON.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 16000,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Generate Month] Gemini error:', errorText);
            return NextResponse.json(
                { success: false, error: `Gemini error: ${response.status}` },
                { status: 500 }
            );
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return NextResponse.json(
                { success: false, error: 'Empty response from Gemini' },
                { status: 500 }
            );
        }

        let parsed;
        try {
            let cleaned = text.trim();

            // Log first 500 chars for debugging
            console.log('[Generate Month] Raw response (first 500):', cleaned.substring(0, 500));

            // Remove markdown code fences
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
            cleaned = cleaned.trim();

            // Find JSON object bounds
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                cleaned = cleaned.slice(firstBrace, lastBrace + 1);
            }

            // Try direct parse
            try {
                parsed = JSON.parse(cleaned);
            } catch {
                // Try fixing trailing commas
                const fixed = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                parsed = JSON.parse(fixed);
            }
        } catch (e) {
            console.error('[Generate Month] JSON parse error:', e);
            console.error('[Generate Month] Response text (first 1000):', text.substring(0, 1000));
            return NextResponse.json(
                { success: false, error: 'Failed to parse tasks. The AI returned malformed JSON.' },
                { status: 500 }
            );
        }

        const newTasks = parsed.tasks || [];
        const now = new Date().toISOString();

        const validatedTasks = newTasks.map((task: Record<string, unknown>, idx: number) => ({
            ...task,
            taskId: task.taskId || `task_${uuidv4().slice(0, 8)}`,
            phaseId: task.phaseId || project.roadmap?.phases?.[0]?.phaseId || 'phase_1',
            state: 'todo',
            lastUpdated: now,
            schedule: task.schedule || { recommendedDay: startDay + idx, latestDay: startDay + idx + 7 },
            details: task.details || { steps: [], definitionOfDone: '' },
            skillImpact: task.skillImpact || [],
            dependsOnTaskIds: task.dependsOnTaskIds || []
        }));

        const contextSummary = `Month ${monthNumber + 1}: ${validatedTasks.length} tasks for days ${startDay}-${endDay}. Focus: ${currentPhase?.focus || 'Training'}.`;

        console.log(`[Generate Month] Generated ${validatedTasks.length} tasks.`);

        return NextResponse.json({
            success: true,
            tasks: validatedTasks,
            generatedUntilDay: endDay,
            lastGeneratedContext: contextSummary
        });
    } catch (error) {
        console.error('[Generate Month] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
