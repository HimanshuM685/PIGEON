import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export interface StatCategory {
    id: number; name: string; completed: number; total: number; color: string; bgColor: string;
}

export interface StatsData {
    title: string; overallPercentage: number; totalTasks: number;
    categories: StatCategory[]; footerText: string;
}

export const defaultStatsData: StatsData = {
    title: "Tech Update",
    overallPercentage: 86,
    totalTasks: 670,
    categories: [
        { id: 1, name: "Frontend",        completed: 196, total: 197, color: "var(--bg-red)", bgColor: "white" },
        { id: 2, name: "Backend",         completed: 119, total: 131, color: "var(--bg-blue)", bgColor: "white" },
        { id: 3, name: "Smart Contracts", completed: 84,  total: 87,  color: "var(--bg-yellow)", bgColor: "white" },
        { id: 4, name: "Code",            completed: 181, total: 255, color: "var(--bg-green)", bgColor: "white" },
        { id: 5, name: "Bugs/Issues",     completed: 0,   total: 0,   color: "var(--bg-pink)", bgColor: "white" },
    ],
    footerText: "2 Changes in last 24hrs"
};

export function ProgressStats() {
    const [stats, setStats] = useState<StatsData>(defaultStatsData);

    useEffect(() => {
        const saved = localStorage.getItem('pigeon_stats');
        if (saved) {
            try { setStats(JSON.parse(saved)); }
            catch (e) { console.error("Failed to parse stats", e); }
        }
    }, []);

    return (
        <section id="stats" className="relative py-24 px-4 sm:px-6 flex flex-col items-center justify-center">
            {/* Header */}
            <div className="text-center mb-12">
                <span className="candy-tag candy-tag-yellow mb-4 inline-flex">Build In Public</span>
                <h2 className="mt-4 font-display text-4xl md:text-5xl font-extrabold uppercase tracking-[-0.04em] text-[var(--text)]">
                    Dev <span className="text-[var(--bg-red)] text-stroke">Progress</span>
                </h2>
                <p className="mt-3 text-[var(--text-muted)] text-sm">Tracking our development progress in real-time</p>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-2xl bg-[var(--bg-blue)] p-6 md:p-8 rounded-3xl border-4 border-[var(--border)] brutal-shadow relative overflow-hidden"
            >

                {/* Header row */}
                <div className="flex flex-wrap justify-between items-end mb-6 border-b border-[var(--border)] pb-4 gap-3">
                    <h3 className="text-xl text-[var(--text)] font-bold tracking-tight font-display">
                        {stats.title}
                        <span className="text-[var(--text)] text-base font-medium ml-2 opacity-80">— {stats.overallPercentage}%</span>
                    </h3>
                    <div
                        className="text-[var(--text)] bg-[var(--bg-yellow)] px-4 py-1 text-sm font-bold tracking-widest uppercase border-2 border-[var(--border)] rounded-full shadow-[2px_2px_0px_#111111]"
                    >
                        {stats.totalTasks} Tasks
                    </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-2.5">
                    {stats.categories.map((cat) => {
                        const pct = cat.total === 0 ? 0 : Math.round((cat.completed / cat.total) * 100)
                        const displayPerc = cat.total === 0 ? "Fixed" : `${pct}%`
                        const statsText   = cat.total === 0 ? "[0/0]" : `[${cat.completed}/${cat.total}]`

                        return (
                            <div key={cat.id} className="relative h-10 rounded-xl overflow-hidden flex items-center px-4 border-2 border-[var(--border)] shadow-[2px_2px_0px_#111111]"
                                style={{ backgroundColor: cat.bgColor }}>
                                {/* Fill */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: cat.total === 0 ? '100%' : `${pct}%` }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                    className="absolute top-0 left-0 bottom-0 z-0 opacity-80"
                                    style={{ backgroundColor: cat.color }}
                                />
                                {/* Label */}
                                <div className="relative z-10 flex justify-between w-full text-[var(--text)]">
                                    <span className="font-bold text-sm tracking-wide uppercase">{cat.name}</span>
                                    <span className="font-medium text-xs flex gap-2 items-center opacity-95">
                                        <span className="opacity-75">{statsText}</span>
                                        <span className="text-sm font-bold">{displayPerc}</span>
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="mt-5 text-[var(--text-muted)] text-xs font-mono text-right">{stats.footerText}</div>
            </motion.div>
        </section>
    )
}