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
        { id: 1, name: "Frontend",        completed: 196, total: 197, color: "var(--bg-pink)", bgColor: "rgba(236, 72, 153, 0.1)" },
        { id: 2, name: "Backend",         completed: 119, total: 131, color: "var(--bg-blue)", bgColor: "rgba(59, 130, 246, 0.1)" },
        { id: 3, name: "Smart Contracts", completed: 84,  total: 87,  color: "var(--bg-yellow)", bgColor: "rgba(255, 214, 0, 0.1)" },
        { id: 4, name: "Code",            completed: 181, total: 255, color: "var(--bg-purple)", bgColor: "rgba(168, 85, 247, 0.1)" },
        { id: 5, name: "Bugs/Issues",     completed: 0,   total: 0,   color: "var(--text)", bgColor: "rgba(0, 0, 0, 0.05)" },
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
        <section id="stats" className="w-full relative flex flex-col lg:flex-row min-h-[80vh]">
            
            {/* Left Side: Massive Typography */}
            <div className="w-full lg:w-1/2 bg-dark-ink text-white p-12 md:p-24 flex flex-col justify-between">
                <div>
                    <span className="font-mono text-xs font-bold uppercase tracking-widest opacity-60">Build In Public</span>
                    <h2 className="editorial-heading text-5xl md:text-7xl mt-4 leading-none">
                        DEV<br/>PROGRESS.
                    </h2>
                </div>
                <div className="mt-20">
                    <div className="text-[12rem] md:text-[18rem] leading-none font-display tracking-tighter text-vibrant-yellow mb-4">
                        {stats.overallPercentage}%
                    </div>
                    <div className="text-xl font-medium opacity-80 max-w-sm">
                        Tracking our development pipeline transparently. {stats.totalTasks} total tasks mapped.
                    </div>
                </div>
            </div>

            {/* Right Side: Detailed Bars */}
            <div className="w-full lg:w-1/2 bg-white p-12 md:p-24 flex flex-col justify-center">
                <div className="space-y-12 w-full max-w-xl mx-auto">
                    {stats.categories.map((cat) => {
                        const pct = cat.total === 0 ? 0 : Math.round((cat.completed / cat.total) * 100)
                        const displayPerc = cat.total === 0 ? "Fixed" : `${pct}%`
                        const statsText   = cat.total === 0 ? "[0/0]" : `[${cat.completed}/${cat.total}]`

                        return (
                            <div key={cat.id} className="relative w-full">
                                {/* Header */}
                                <div className="flex justify-between items-end mb-3">
                                    <span className="editorial-heading text-xl md:text-2xl text-[var(--text)]">{cat.name}</span>
                                    <span className="font-mono text-sm font-bold text-[var(--text-muted)] tracking-widest">{statsText} / {displayPerc}</span>
                                </div>
                                {/* Bar */}
                                <div className="relative h-2 w-full overflow-hidden" style={{ backgroundColor: cat.bgColor }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: cat.total === 0 ? '100%' : `${pct}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                        className="absolute top-0 left-0 bottom-0"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                    <div className="pt-8 border-t border-gray-200 text-sm font-mono font-bold uppercase tracking-widest text-gray-400">
                        {stats.footerText}
                    </div>
                </div>
            </div>

        </section>
    )
}