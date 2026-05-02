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
        { id: 1, name: "Media",        completed: 0,   total: 0,   color: "var(--bg-purple)", bgColor: "rgba(168, 85, 247, 0.1)" },
        { id: 2, name: "Code",         completed: 181, total: 255, color: "var(--bg-yellow)", bgColor: "rgba(255, 214, 0, 0.1)" },
        { id: 3, name: "Bug/Issue",    completed: 0,   total: 0,   color: "var(--text)", bgColor: "rgba(0, 0, 0, 0.05)" },
        { id: 4, name: "Smart Contract", completed: 84,  total: 87,  color: "var(--bg-pink)", bgColor: "rgba(236, 72, 153, 0.1)" },
    ],
    footerText: "2 Changes in last 24hrs"
};

import { getDevelopmentStats, updateDevelopmentStats } from '@/lib/neon';

interface GithubCommit {
    sha: string;
    message: string;
    url: string;
}

export function ProgressStats() {
    const [stats, setStats] = useState<StatsData>(defaultStatsData);
    const [latestCommit, setLatestCommit] = useState<GithubCommit | null>(null);
    const [commitCount, setCommitCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const dbStats = await getDevelopmentStats();
            if (dbStats) {
                const dbCatNames = dbStats.categories.map(c => c.name).join(',');
                const defaultCatNames = defaultStatsData.categories.map(c => c.name).join(',');
                
                if (dbCatNames !== defaultCatNames) {
                    const mergedCategories = defaultStatsData.categories.map(defCat => {
                        const oldMatch = dbStats.categories.find(c => 
                            c.name === defCat.name || 
                            (c.name === 'Smart Contracts' && defCat.name === 'SmartContrat') ||
                            (c.name === 'Bugs/Issues' && defCat.name === 'Bug/Issue') ||
                            (c.name === 'BugandIssues' && defCat.name === 'Bug/Issue')
                        );
                        return oldMatch ? { ...defCat, completed: oldMatch.completed, total: oldMatch.total } : defCat;
                    });
                    const newStats = { ...dbStats, categories: mergedCategories };
                    setStats(newStats);
                    updateDevelopmentStats(newStats).catch(console.error);
                } else {
                    setStats(dbStats);
                }
            } else {
                const saved = localStorage.getItem('pigeon_stats');
                if (saved) {
                    try { setStats(JSON.parse(saved)); }
                    catch (e) { console.error("Failed to parse local stats", e); }
                }
            }
        };

        const fetchCommit = async () => {
            try {
                const res = await fetch('https://api.github.com/repos/HimanshuM685/PIGEON/commits?per_page=100');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setLatestCommit({
                            sha: data[0].sha.substring(0, 7),
                            message: data[0].commit.message.split('\n')[0],
                            url: data[0].html_url
                        });

                        const yesterday = new Date();
                        yesterday.setHours(yesterday.getHours() - 24);
                        
                        const recentCommits = data.filter((commit: any) => {
                            const commitDate = new Date(commit.commit.committer.date);
                            return commitDate >= yesterday;
                        });
                        
                        setCommitCount(recentCommits.length);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch commit", e);
            }
        };

        fetchStats();
        fetchCommit();
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
                    <div className="text-[7rem] sm:text-[10rem] md:text-[18rem] leading-none font-display tracking-tighter text-vibrant-yellow mb-4">
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
                    <div className="pt-8 border-t border-gray-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                        <div className="text-sm font-mono font-bold uppercase tracking-widest text-gray-400">
                            {commitCount !== null ? `${commitCount} Changes in last 24hrs` : stats.footerText}
                        </div>
                        {latestCommit && (
                            <a 
                                href={latestCommit.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[var(--text)] hover:text-white hover:bg-dark-ink transition-all duration-300 bg-white border border-gray-200 px-4 py-2 rounded-full truncate max-w-full"
                            >
                                <span className="opacity-60 whitespace-nowrap">Latest:</span>
                                <span className="truncate">{latestCommit.message}</span>
                                <span className="opacity-40 whitespace-nowrap">({latestCommit.sha})</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

        </section>
    )
}