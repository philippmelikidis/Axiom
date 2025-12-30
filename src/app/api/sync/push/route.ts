import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
    try {
        const { userId, appState } = await request.json();

        if (!userId || !appState) {
            return NextResponse.json(
                { error: 'Missing userId or appState' },
                { status: 400 }
            );
        }

        // Create table if not exists
        await sql`
      CREATE TABLE IF NOT EXISTS axiom_sync (
        user_id TEXT PRIMARY KEY,
        app_state JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

        // Upsert the app state
        await sql`
      INSERT INTO axiom_sync (user_id, app_state, updated_at)
      VALUES (${userId}, ${JSON.stringify(appState)}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET app_state = ${JSON.stringify(appState)}, updated_at = NOW()
    `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Sync push error:', error);

        // Check if it's a connection error (no database configured)
        if (error instanceof Error && error.message.includes('POSTGRES')) {
            return NextResponse.json(
                { error: 'Database not configured. Set up Vercel Postgres to enable sync.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Sync failed' },
            { status: 500 }
        );
    }
}
