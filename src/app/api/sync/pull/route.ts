import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing userId' },
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

        // Get the app state
        const result = await sql`
      SELECT app_state, updated_at FROM axiom_sync WHERE user_id = ${userId}
    `;

        if (result.rows.length === 0) {
            return NextResponse.json({ appState: null });
        }

        return NextResponse.json({
            appState: result.rows[0].app_state,
            updatedAt: result.rows[0].updated_at
        });
    } catch (error) {
        console.error('Sync pull error:', error);

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
