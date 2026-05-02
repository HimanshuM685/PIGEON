import { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Plus, Settings } from 'lucide-react';
import { getWaitlistCount } from '@/lib/neon';
import { useEffect } from 'react';

export function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            getWaitlistCount().then(setCount).catch(console.error);
        }
    }, [isAuthenticated]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'admin' && password === 'admin') setIsAuthenticated(true);
        else alert('Invalid credentials');
    };

    const inputClass = "w-full bg-white/50 border border-dark-ink/10 rounded-2xl px-5 py-4 text-dark-ink text-base outline-none focus:border-dark-ink focus:bg-white transition-all placeholder-dark-ink/50 font-bold";

    if (!isAuthenticated) {
        return (
            <section id="admin" className="relative w-full flex min-h-screen bg-vibrant-yellow overflow-hidden">
                <div className="w-full flex flex-col lg:flex-row min-h-screen">
                    {/* Left Side: Massive Typography */}
                    <div className="w-full lg:w-1/2 p-12 md:p-24 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-dark-ink/10 relative">
                        {/* Background Watermark */}
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 overflow-hidden pointer-events-none opacity-5">
                            <span className="font-display text-[30vw] leading-none tracking-tighter text-dark-ink">LOCK</span>
                        </div>
                        <div className="relative z-10">
                            <ShieldCheck size={64} className="text-dark-ink opacity-80 mb-12" strokeWidth={1.5} />
                            <h2 className="editorial-heading text-huge leading-none text-dark-ink">
                                ADMIN<br/>PORTAL.
                            </h2>
                            <p className="mt-8 text-xl md:text-3xl font-medium text-dark-ink/80 leading-tight max-w-lg">
                                Secure system management. Restricted access only.
                            </p>
                        </div>
                    </div>

                    {/* Right Side: Rough Glass Login */}
                    <div className="w-full lg:w-1/2 p-12 md:p-24 flex flex-col justify-center items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-md rough-glass p-12 text-dark-ink relative overflow-hidden"
                        >
                            <h3 className="editorial-heading text-3xl mb-8">Authenticate</h3>
                            <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className={inputClass} />
                                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
                                <button type="submit" className="btn-editorial w-full bg-dark-ink text-white hover:bg-black mt-4">
                                    Login Access
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="admin-dashboard" className="w-full bg-[var(--bg)] min-h-screen border-t border-gray-200">
            {/* Header */}
            <div className="w-full px-8 py-24 flex flex-col md:flex-row items-start md:items-end justify-between border-b border-gray-200 bg-white">
                <div>
                    <span className="mb-4 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-300 text-xs font-bold uppercase tracking-widest text-[var(--text)]">
                        Dashboard
                    </span>
                    <h2 className="editorial-heading text-6xl md:text-8xl text-[var(--text)] leading-none">
                        SYSTEM<br/>CONTROL.
                    </h2>
                </div>
                <button onClick={() => setIsAuthenticated(false)} className="btn-editorial mt-8 md:mt-0 border border-dark-ink bg-transparent text-dark-ink hover:text-white">
                    Logout
                </button>
            </div>

            <div className="w-full max-w-7xl mx-auto px-8 py-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    
                    {/* Settings Block */}
                    <div className="rough-glass p-12 text-[var(--text)]">
                        <div className="flex items-center gap-4 mb-8">
                            <Settings size={32} className="opacity-80" />
                            <h3 className="editorial-heading text-3xl">Global Settings</h3>
                        </div>
                        <div className="space-y-6">
                            {['Maintenance Mode', 'Beta Signups', 'API Access'].map((setting) => (
                                <div key={setting} className="flex justify-between items-center p-6 bg-white/50 border border-gray-200 rounded-2xl">
                                    <span className="font-bold uppercase tracking-widest text-sm">{setting}</span>
                                    <button className="btn-editorial py-2 px-6 text-xs bg-dark-ink text-white">Toggle</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats Block */}
                    <div className="rough-glass p-12 bg-vibrant-yellow text-dark-ink border-0">
                        <div className="flex justify-between items-center mb-12">
                            <h3 className="editorial-heading text-3xl">Active Users</h3>
                            <Plus size={32} />
                        </div>
                        <div className="text-[8rem] font-display leading-none tracking-tighter">
                            {count !== null ? count.toLocaleString() : '---'}
                        </div>
                        <p className="font-medium text-xl opacity-80 mt-4">Total waitlist registrations.</p>
                    </div>

                </div>
            </div>
        </section>
    );
}