import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const CHAT_SYSTEM_PROMPT = `You are AXIOM, a neutral planning assistant for a personal roadmap app.
You have access to the user's current project data including their roadmap, tasks, and skills.
Respond to their questions and requests in a neutral, matter-of-fact tone.

RULES:
- No emojis
- No motivational language
- No praise or encouragement
- Brief, helpful responses
- If you're going to modify their plan, explain what you would change

When the user asks to modify their plan (e.g., "reduce my run to 20 minutes"), provide:
1. A brief acknowledgment of what they want
2. The specific changes you recommend
3. Ask if they want to apply these changes

Keep responses under 150 words unless detail is needed.`;

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(request: NextRequest) {
    try {
        const { messages, project } = await request.json();

        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { success: false, error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        if (!messages || !project) {
            return NextResponse.json(
                { success: false, error: 'Missing messages or project context' },
                { status: 400 }
            );
        }

        // Build context from project
        const projectContext = `
PROJECT CONTEXT:
Name: ${project.name}
Goal: ${project.oneLineIntent}
Status: ${project.status}
Time Horizon: ${project.timeHorizonDays} days
Start Date: ${project.startDate}

PHASES:
${project.roadmap.phases.map((p: { name: string; intent: string; order: number }) => `- ${p.name}: ${p.intent}`).join('\n')}

TASKS (${project.tasks.length} total):
${project.tasks.slice(0, 20).map((t: { name: string; type: string; durationMinutes: number; state: string }) => `- [${t.state}] ${t.name} (${t.type}, ${t.durationMinutes}min)`).join('\n')}
${project.tasks.length > 20 ? `... and ${project.tasks.length - 20} more tasks` : ''}

SKILLS:
${project.skillTree.skills.map((s: { name: string; level: number; maxLevel: number }) => `- ${s.name}: Level ${s.level}/${s.maxLevel}`).join('\n')}
`;

        // Build conversation for Gemini
        const conversationHistory = messages.map((m: Message) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Add system context to first message
        const fullContents = [
            {
                role: 'user',
                parts: [{ text: `${CHAT_SYSTEM_PROMPT}\n\n${projectContext}\n\nUser's first message will follow.` }]
            },
            {
                role: 'model',
                parts: [{ text: 'Understood. I have the project context. Ready to help.' }]
            },
            ...conversationHistory
        ];

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: fullContents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
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

        if (!result.candidates || result.candidates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No response from AI' },
                { status: 500 }
            );
        }

        const text = result.candidates[0].content?.parts?.[0]?.text;

        return NextResponse.json({
            success: true,
            message: text || 'No response'
        });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Chat failed' },
            { status: 500 }
        );
    }
}
