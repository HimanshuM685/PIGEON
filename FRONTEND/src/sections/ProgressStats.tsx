import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export interface StatCategory {
    id: number;
    name: string;
    completed: number;
    total: number;
    color: string;
    bgColor: string;
}

export interface StatsData {
    title: string;
    overallPercentage: number;
    totalTasks: number;
    categories: StatCategory[];
    footerText: string;
}

export const defaultStatsData: StatsData = {
    title: "Tech Update",
    overallPercentage: 86,
    totalTasks: 670,
    categories: [
        { id: 1, name: "Frontend", completed: 196, total: 197, color: "#89933a", bgColor: "#4b5126" },
        { id: 2, name: "Backend", completed: 119, total: 131, color: "#dc5331", bgColor: "#733324" },
        { id: 3, name: "Smart Contracts", completed: 84, total: 87, color: "#e4ce36", bgColor: "#7b7125" },
        { id: 4, name: "Code", completed: 181, total: 255, color: "#5ea1b6", bgColor: "#395e6c" },
        { id: 5, name: "Bugs/Issues", completed: 0, total: 0, color: "#555b70", bgColor: "#363a4b" }
    ],
    footerText: "2 Changes in last 24hrs"
};

export function ProgressStats() {
    const [stats, setStats] = useState<StatsData>(defaultStatsData);

    useEffect(() => {
        const saved = localStorage.getItem('pigeon_stats');
        if (saved) {
            try {
                setStats(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse stats", e);
            }
        }
    }, []);

    return (
        <section id="stats" className="relative py-20 px-6 flex flex-col items-center justify-center">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Build In Public
                </h2>
                <p className="mt-4 text-[var(--muted-foreground)]">Tracking our development progress</p>
            </div>
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-2xl glass-strong p-8 rounded-2xl border border-[var(--border)] glow-effect font-sans relative overflow-hidden"
            >
                {/* Header */}
                <div className="flex justify-between items-end mb-6 border-b border-[var(--border)] pb-4">
                    <h2 className="text-2xl text-white font-bold tracking-tight">
                        {stats.title} <span className="text-[var(--primary)] text-xl font-medium tracking-normal ml-2 opacity-90">- {stats.overallPercentage}%</span>
                    </h2>
                    <div className="bg-[var(--primary)] text-black px-3 py-1 rounded-sm shadow-[0_0_10px_var(--primary)] text-sm font-bold tracking-wide">
                        {stats.totalTasks} Tasks
                    </div>
                </div>

                {/* Bars */}
                <div className="space-y-3 bg-black/40 border border-[var(--border)] p-2 rounded-lg backdrop-blur-sm">
                    {stats.categories.map((cat) => {
                        const percentage = cat.total === 0 ? 0 : Math.round((cat.completed / cat.total) * 100);
                        const displayPerc = cat.total === 0 ? "Fixed" : `${percentage}%`;
                        const statsText = cat.total === 0 ? "[0/0]" : `[${cat.completed}/${cat.total}]`;

                        return (
                            <div
                                key={cat.id}
                                className="relative h-10 rounded overflow-hidden flex items-center px-4 border border-white/5"
                                style={{ backgroundColor: cat.bgColor }}
                            >
                                {/* Fill */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: cat.total === 0 ? '100%' : `${percentage}%` }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                    className="absolute top-0 left-0 bottom-0 z-0 opacity-80"
                                    style={{ backgroundColor: cat.color }}
                                />

                                {/* Content */}
                                <div className="relative z-10 flex justify-between w-full text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                                    <span className="font-semibold tracking-wide">{cat.name}</span>
                                    <span className="font-medium opacity-90 text-sm flex gap-2 items-center">
                                        <span className="opacity-70">{statsText}</span> 
                                        <span className="text-[1.05rem]">{displayPerc}</span>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-6 text-[var(--muted-foreground)] text-sm font-medium text-right">
                    {stats.footerText}
                </div>
            </motion.div>
        </section>
    );
}