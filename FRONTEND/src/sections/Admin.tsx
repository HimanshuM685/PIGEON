import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { defaultStatsData } from './ProgressStats';
import type { StatsData, StatCategory } from './ProgressStats';

export function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const [stats, setStats] = useState<StatsData>(defaultStatsData);

    useEffect(() => {
        const savedAuth = sessionStorage.getItem('pigeon_admin_auth');
        if (savedAuth === 'true') setIsAuthenticated(true);

        const savedStats = localStorage.getItem('pigeon_stats');
        if (savedStats) {
            try {
                setStats(JSON.parse(savedStats));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'Pigeon' && password === 'nude@69') {
            setIsAuthenticated(true);
            sessionStorage.setItem('pigeon_admin_auth', 'true');
            setError('');
        } else {
            setError('Invalid credentials');
        }
    };

    const handleSave = () => {
        localStorage.setItem('pigeon_stats', JSON.stringify(stats));
        alert('Stats successfully saved!');
    };

    const updateCategory = (id: number, field: keyof StatCategory, value: string | number) => {
        setStats(prev => {
            const updatedCategories = prev.categories.map(c => c.id === id ? { ...c, [field]: value } : c);
            const totalTasks = updatedCategories.reduce((sum, cat) => sum + Number(cat.total || 0), 0);
            const completedTasks = updatedCategories.reduce((sum, cat) => sum + Number(cat.completed || 0), 0);
            const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            return {
                ...prev,
                categories: updatedCategories,
                totalTasks,
                overallPercentage
            };
        });
    };

    const addCategory = () => {
        setStats(prev => ({
            ...prev,
            categories: [...prev.categories, {
                id: Date.now(),
                name: 'New Category',
                completed: 0,
                total: 10,
                color: '#89933a',
                bgColor: '#4b5126'
            }]
        }));
    };

    const removeCategory = (id: number) => {
        setStats(prev => {
            const updatedCategories = prev.categories.filter(c => c.id !== id);
            const totalTasks = updatedCategories.reduce((sum, cat) => sum + Number(cat.total || 0), 0);
            const completedTasks = updatedCategories.reduce((sum, cat) => sum + Number(cat.completed || 0), 0);
            const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            return {
                ...prev,
                categories: updatedCategories,
                totalTasks,
                overallPercentage
            };
        });
    };

    if (!isAuthenticated) {
        return (
            <section className="relative min-h-screen pt-32 pb-20 px-6 flex items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm glass-strong p-8 rounded-2xl border border-[var(--border)] glow-effect"
                >
                    <h2 className="text-3xl font-bold text-white mb-6 text-center">Admin Access</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <div>
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-black/50 border border-[var(--border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-[var(--border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                            />
                        </div>
                        <button type="submit" className="w-full bg-[var(--primary)] text-black font-bold py-3 rounded-lg hover:brightness-110 transition-all">
                            Login
                        </button>
                    </form>
                </motion.div>
            </section>
        );
    }

    return (
        <section className="relative min-h-screen pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto glass-strong p-8 rounded-2xl border border-[var(--border)] glow-effect text-white">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Manage Build-In-Public Stats</h1>
                    <button onClick={handleSave} className="bg-[var(--primary)] text-black font-bold px-6 py-2 rounded-lg hover:brightness-110">
                        Save Changes
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Title</label>
                            <input type="text" value={stats.title} onChange={e => setStats({...stats, title: e.target.value})} className="w-full bg-black/50 border border-[var(--border)] rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Overall % (Auto)</label>
                            <input type="number" readOnly value={stats.overallPercentage} className="w-full bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-gray-400 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Total Tasks (Auto)</label>
                            <input type="number" readOnly value={stats.totalTasks} className="w-full bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-gray-400 cursor-not-allowed" />
                        </div>
                    </div>

                    <div className="border-t border-[var(--border)] pt-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Categories</h3>
                            <button onClick={addCategory} className="bg-gray-800 text-white border border-[var(--border)] text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                                + Add Category
                            </button>
                        </div>
                        {stats.categories.map((cat) => (
                            <div key={cat.id} className="grid grid-cols-1 md:grid-cols-[1fr_min-content_min-content_min-content_min-content_min-content] gap-4 items-end bg-black/30 p-4 rounded border border-[var(--border)]">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Name</label>
                                    <input type="text" value={cat.name} onChange={e => updateCategory(cat.id, 'name', e.target.value)} className="w-full bg-black/50 border border-[var(--border)] rounded px-3 py-2 text-white text-sm" />
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs text-gray-400 mb-1">Completed</label>
                                    <input type="number" value={cat.completed} onChange={e => updateCategory(cat.id, 'completed', Number(e.target.value))} className="w-full bg-black/50 border border-[var(--border)] rounded px-3 py-2 text-white text-sm" />
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs text-gray-400 mb-1">Total</label>
                                    <input type="number" value={cat.total} onChange={e => updateCategory(cat.id, 'total', Number(e.target.value))} className="w-full bg-black/50 border border-[var(--border)] rounded px-3 py-2 text-white text-sm" />
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs text-gray-400 mb-1">Fill Color</label>
                                    <input type="color" value={cat.color} onChange={e => updateCategory(cat.id, 'color', e.target.value)} className="w-full h-9 bg-black/50 border border-[var(--border)] rounded p-1 cursor-pointer" />
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs text-gray-400 mb-1">BG Color</label>
                                    <input type="color" value={cat.bgColor} onChange={e => updateCategory(cat.id, 'bgColor', e.target.value)} className="w-full h-9 bg-black/50 border border-[var(--border)] rounded p-1 cursor-pointer" />
                                </div>
                                <div className="w-10 flex justify-center pb-[#2px]">
                                    <button onClick={() => removeCategory(cat.id)} className="text-red-500 hover:text-red-400 text-2xl font-bold rounded" title="Remove">
                                        &times;
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-[var(--border)]">
                        <label className="block text-sm text-gray-400 mb-1">Footer Text</label>
                        <input type="text" value={stats.footerText} onChange={e => setStats({...stats, footerText: e.target.value})} className="w-full bg-black/50 border border-[var(--border)] rounded px-3 py-2 text-white" />
                    </div>
                </div>
            </div>
        </section>
    );
}