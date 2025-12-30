import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export const maxDuration = 120; // 2 minutes for master plan (it's lightweight)

const MASTER_PLAN_PROMPT = `You are AXIOM, a neutral planning engine.
Generate a MASTER PLAN structure for long-term goal achievement.
This is NOT a detailed daily plan - it's a high-level structure that will guide monthly task generation.

RULES:
- No emojis, no motivational language
- Neutral, technical tone
- Focus on structure and progression

OUTPUT: Return ONLY valid JSON matching this schema:
{
  "name": "string (project name)",
  "oneLineIntent": "string",
  "definitionOfDone": "string",
  "assumptions": ["string"],
  "masterPlan": {
    "overview": "string (high-level description of the approach)",
    "principles": ["string (key training/planning principles to follow)"],
    "weeklyTemplate": "string (e.g., 'Mon: strength, Tue: run, Wed: rest, Thu: run, Fri: strength, Sat: long run, Sun: rest')",
    "phases": [{
      "phaseNumber": number,
      "name": "string",
      "startWeek": number,
      "endWeek": number,
      "focus": "string (what this phase develops)",
      "weeklyPattern": "string (e.g., '3 run + 2 strength + 2 rest')",
      "targetVolume": "string (e.g., '30-40km/week')",
      "keyWorkouts": ["string (types of workouts)"],
      "progressionRules": "string (how to increase load)"
    }],
    "skillProgression": [{
      "skillName": "string",
      "startLevel": 0,
      "endLevel": 10,
      "milestones": ["string"]
    }]
  },
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
  }
}`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userText, timeHorizonDays, constraints, startDate } = body;

        if (!userText || !timeHorizonDays || !startDate) {
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

        console.log(`[Master Plan] Generating for ${timeHorizonDays} days...`);

        const weeks = Math.ceil(timeHorizonDays / 7);
        const userMessage = `${MASTER_PLAN_PROMPT}

USER INPUT:
"${userText}"

TIME HORIZON: ${timeHorizonDays} days (${weeks} weeks)
START DATE: ${startDate}
CONSTRAINTS: ${constraints || 'None specified'}

Generate a master plan with:
- ${Math.min(Math.ceil(weeks / 4), 8)} phases (roughly monthly)
- 4-8 key skills to develop
- Weekly template pattern
- Progression rules for each phase

Return ONLY valid JSON.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
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

        // Parse JSON
        let parsed;
        try {
            let cleaned = text.trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
            cleaned = cleaned.trim();

            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                cleaned = cleaned.slice(firstBrace, lastBrace + 1);
            }

            parsed = JSON.parse(cleaned);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Failed to parse master plan JSON' },
                { status: 500 }
            );
        }

        const now = new Date().toISOString();
        const projectId = uuidv4();

        // Build project with master plan but NO tasks yet
        const project = {
            projectId,
            name: parsed.name || 'New Project',
            oneLineIntent: parsed.oneLineIntent || '',
            definitionOfDone: parsed.definitionOfDone || '',
            status: 'active',
            createdAt: now,
            updatedAt: now,
            startDate,
            timeHorizonDays,
            createdFrom: {
                rawInput: userText,
                constraints: constraints || ''
            },
            pause: { isPaused: false },
            roadmap: parsed.roadmap || { phases: [] },
            tasks: [], // Empty - will be generated monthly
            todayCardRules: { maxTasksPerDay: 3, selectionLogic: 'priority' },
            skillTree: parsed.skillTree || { skills: [] },
            progress: { history: [] },
            assumptions: parsed.assumptions || [],
            masterPlan: parsed.masterPlan,
            generatedUntilDay: 0,
            lastGeneratedContext: ''
        };

        console.log('[Master Plan] Success! Now generate first month tasks.');

        return NextResponse.json({
            success: true,
            project,
            needsTaskGeneration: true // Flag to trigger first month generation
        });
    } catch (error) {
        console.error('[Master Plan] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
