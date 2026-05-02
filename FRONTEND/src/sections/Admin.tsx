import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { defaultStatsData } from './ProgressStats';
import type { StatsData, StatCategory } from './ProgressStats';

export function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error,    setError]    = useState('');
    const [stats, setStats] = useState<StatsData>(defaultStatsData);

    useEffect(() => {
        if (sessionStorage.getItem('pigeon_admin_auth') === 'true') setIsAuthenticated(true);
        const saved = localStorage.getItem('pigeon_stats');
        if (saved) { try { setStats(JSON.parse(saved)); } catch (e) { console.error(e); } }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'Pigeon' && password === 'nude@69') {
            setIsAuthenticated(true);
            sessionStorage.setItem('pigeon_admin_auth', 'true');
            setError('');
        } else { setError('Invalid credentials'); }
    };

    const handleSave = () => {
        localStorage.setItem('pigeon_stats', JSON.stringify(stats));
        alert('Stats saved!');
    };

    const updateCategory = (id: number, field: keyof StatCategory, value: string | number) => {
        setStats(prev => {
            const cats = prev.categories.map(c => c.id === id ? { ...c, [field]: value } : c);
            const total = cats.reduce((s, c) => s + Number(c.total || 0), 0);
            const done  = cats.reduce((s, c) => s + Number(c.completed || 0), 0);
            return { ...prev, categories: cats, totalTasks: total, overallPercentage: total > 0 ? Math.round((done / total) * 100) : 0 };
        });
    };

    const addCategory = () => {
        setStats(prev => ({
            ...prev,
            categories: [...prev.categories, { id: Date.now(), name: 'New Category', completed: 0, total: 10, color: 'var(--bg-red)', bgColor: 'white' }],
        }));
    };

    const removeCategory = (id: number) => {
        setStats(prev => {
            const cats  = prev.categories.filter(c => c.id !== id);
            const total = cats.reduce((s, c) => s + Number(c.total || 0), 0);
            const done  = cats.reduce((s, c) => s + Number(c.completed || 0), 0);
            return { ...prev, categories: cats, totalTasks: total, overallPercentage: total > 0 ? Math.round((done / total) * 100) : 0 };
        });
    };

    const inputClass = "w-full bg-white border-2 border-[var(--border)] px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[var(--text)] focus:shadow-[2px_2px_0px_#111111] transition-all placeholder-[var(--text-light)] font-bold";

    /* ── Login ── */
    if (!isAuthenticated) {
        return (
            <section className="relative min-h-screen pt-32 pb-20 px-4 flex items-center justify-center">
                {/* Background */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(228,218,232,0.5) 0%, transparent 70%)' }} />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm bg-[var(--bg-blue)] p-8 rounded-3xl border-4 border-[var(--border)] brutal-shadow relative"
                >

                    <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-[var(--text)] mb-1 text-center">Admin</h2>
                    <p className="text-[var(--text-muted)] text-xs font-mono text-center mb-7 tracking-wider">[ RESTRICTED ACCESS ]</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <p className="text-[var(--danger)] text-xs text-center font-mono bg-red-50 border border-red-200 px-3 py-2">{error}</p>
                        )}
                        <input type="text"     placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className={inputClass} />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
                        <button type="submit"
                            className="w-full py-3 text-sm font-bold uppercase tracking-widest text-[var(--text)] bg-[var(--bg-red)] border-2 border-[var(--border)] hover:bg-white transition-all duration-300 brutal-shadow-hover rounded-full"
                        >
                            Login
                        </button>
                    </form>
                </motion.div>
            </section>
        );
    }

    /* ── Dashboard ── */
    return (
        <section className="relative min-h-screen pt-32 pb-20 px-4 sm:px-6">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 10%, rgba(228,218,232,0.4) 0%, transparent 60%)' }} />

            <div className="max-w-4xl mx-auto bg-[var(--bg-yellow)] p-6 md:p-8 rounded-3xl border-4 border-[var(--border)] brutal-shadow relative">

                {/* Header */}
                <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                    <div>
                        <span className="candy-tag mb-2 inline-flex">[ Admin Panel ]</span>
                        <h1 className="font-display text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-[var(--text)]">
                            Manage Build-In-Public Stats
                        </h1>
                    </div>
                    <button onClick={handleSave}
                        className="px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-[var(--text)] bg-white border-2 border-[var(--border)] hover:bg-[var(--bg-pink)] transition-all duration-300 brutal-shadow-hover rounded-full"
                    >
                        Save Changes
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Top fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-mono tracking-wider uppercase">Title</label>
                            <input type="text" value={stats.title} onChange={e => setStats({ ...stats, title: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-mono tracking-wider uppercase">Overall % (Auto)</label>
                            <input type="number" readOnly value={stats.overallPercentage} className="w-full bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--text-muted)] text-sm cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-mono tracking-wider uppercase">Total Tasks (Auto)</label>
                            <input type="number" readOnly value={stats.totalTasks} className="w-full bg-[var(--bg)] border border-[var(--border)] px-3 py-2 text-[var(--text-muted)] text-sm cursor-not-allowed" />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="border-t border-[var(--border)] pt-6 space-y-4">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-[var(--text)]">Categories</h3>
                            <button onClick={addCategory}
                                className="border-2 border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--bg-red)] text-xs font-bold uppercase tracking-widest px-4 py-2 transition-all duration-200 brutal-shadow-hover rounded-full">
                                + Add Category
                            </button>
                        </div>

                        {stats.categories.map((cat) => (
                            <div key={cat.id}
                                className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_52px_52px_36px] gap-3 items-end bg-[var(--bg)] p-4 border border-[var(--border)]">
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1 font-mono uppercase tracking-wider">Name</label>
                                    <input type="text" value={cat.name} onChange={e => updateCategory(cat.id, 'name', e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1 font-mono uppercase tracking-wider">Done</label>
                                    <input type="number" value={cat.completed} onChange={e => updateCategory(cat.id, 'completed', Number(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1 font-mono uppercase tracking-wider">Total</label>
                                    <input type="number" value={cat.total} onChange={e => updateCategory(cat.id, 'total', Number(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1 font-mono uppercase tracking-wider">Fill</label>
                                    <input type="color" value={cat.color} onChange={e => updateCategory(cat.id, 'color', e.target.value)} className="w-full h-9 border border-[var(--border)] p-1 cursor-pointer bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1 font-mono uppercase tracking-wider">BG</label>
                                    <input type="color" value={cat.bgColor} onChange={e => updateCategory(cat.id, 'bgColor', e.target.value)} className="w-full h-9 border border-[var(--border)] p-1 cursor-pointer bg-white" />
                                </div>
                                <div className="flex justify-center items-end pb-0.5">
                                    <button onClick={() => removeCategory(cat.id)} className="text-[var(--danger)] hover:opacity-70 text-xl font-bold transition-opacity">&times;</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer text */}
                    <div className="pt-4 border-t border-[var(--border)]">
                        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-mono tracking-wider uppercase">Footer Text</label>
                        <input type="text" value={stats.footerText} onChange={e => setStats({ ...stats, footerText: e.target.value })} className={inputClass} />
                    </div>
                </div>
            </div>
        </section>
    );
}