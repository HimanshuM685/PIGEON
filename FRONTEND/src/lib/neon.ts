import { neon } from '@neondatabase/serverless'

const neonDatabaseUrl = import.meta.env.VITE_NEON_DATABASE_URL as string

// if (!neonDatabaseUrl) {
//     throw new Error('Missing Neon environment variable. Check your .env.local file.')
// }

const sql: any = neonDatabaseUrl ? neon(neonDatabaseUrl) : () => { throw new Error('Database URL not configured') };

function toDatabaseError(error: unknown): Error {
    if (error instanceof Error) {
        const pgCode = (error as Error & { code?: string }).code
        const message = error.message.toLowerCase()

        if (pgCode === '42P01' || message.includes('relation "waitlist" does not exist')) {
            return new Error('Database table public.waitlist does not exist. Create it first, then retry.')
        }
    }

    return error instanceof Error
        ? error
        : new Error('Database request failed. Please try again.')
}

export type WaitlistEntry = {
    id: string
    email: string
    created_at: string
}

export async function getWaitlistCount() {
    try {
        const rows = await sql`
            SELECT COUNT(*)::int AS count
            FROM public.waitlist
        ` as Array<{ count: number }>

        return rows[0]?.count ?? 0
    } catch (error) {
        throw toDatabaseError(error)
    }
}

export async function insertWaitlistEmail(email: string) {
    try {
        const rows = await sql`
            INSERT INTO public.waitlist (email)
            VALUES (${email})
            ON CONFLICT (email) DO NOTHING
            RETURNING id, email, created_at
        ` as WaitlistEntry[]

        return rows.length > 0 ? 'inserted' : 'duplicate'
    } catch (error) {
        throw toDatabaseError(error)
    }
}

import { type StatsData } from '../sections/ProgressStats';

export async function getDevelopmentStats(): Promise<StatsData | null> {
    try {
        const rows = await sql`
            SELECT data
            FROM public.pigeon_stats
            WHERE id = 1
        `;
        if (rows.length > 0 && rows[0].data) {
            return rows[0].data as StatsData;
        }
        return null;
    } catch (error) {
        console.error('Failed to get stats from database:', error);
        return null;
    }
}

export async function updateDevelopmentStats(data: StatsData): Promise<void> {
    try {
        // Ensure table exists
        await sql`
            CREATE TABLE IF NOT EXISTS public.pigeon_stats (
                id INT PRIMARY KEY,
                data JSONB NOT NULL
            )
        `;
        
        await sql`
            INSERT INTO public.pigeon_stats (id, data)
            VALUES (1, ${JSON.stringify(data)}::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
        `;
    } catch (error) {
        console.error('Failed to update stats in database:', error);
        throw toDatabaseError(error);
    }
}
