import { neon } from '@neondatabase/serverless'

const neonDatabaseUrl = import.meta.env.VITE_NEON_DATABASE_URL as string

if (!neonDatabaseUrl) {
    throw new Error('Missing Neon environment variable. Check your .env.local file.')
}

const sql = neon(neonDatabaseUrl)

export type WaitlistEntry = {
    id: string
    email: string
    created_at: string
}

export async function getWaitlistCount() {
    const rows = await sql`
        SELECT COUNT(*)::int AS count
        FROM waitlist
    ` as Array<{ count: number }>

    return rows[0]?.count ?? 0
}

export async function insertWaitlistEmail(email: string) {
    const rows = await sql`
        INSERT INTO waitlist (email)
        VALUES (${email})
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, created_at
    ` as WaitlistEntry[]

    return rows.length > 0 ? 'inserted' : 'duplicate'
}
