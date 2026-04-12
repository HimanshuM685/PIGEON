import { Zap, Wind, Terminal, CircleDashed } from 'lucide-react'

export function LogoVariants() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-10 overflow-y-auto backdrop-blur-md">
            <div className="max-w-4xl w-full bg-[#111] border border-white/10 rounded-2xl p-10 relative">
                <h1 className="text-2xl font-bold mb-8 text-center tracking-tight">PIGEON Logo Concepts</h1>
                <p className="text-center text-white/50 mb-12">Review these styles and let me know which one you prefer.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Variant 1: Current (Gradient Block) */}
                    <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-xl bg-black/50 hover:bg-white/5 transition">
                        <div className="text-sm text-white/40 mb-6 font-mono absolute top-4 left-4">Option 1: Modern Gradient</div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
                                P
                            </div>
                            <span className="text-lg font-bold tracking-tight">PIGEON</span>
                        </div>
                    </div>

                    {/* Variant 2: Minimalist Tech (Monospace + Terminal) */}
                    <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-xl bg-black/50 hover:bg-white/5 transition relative">
                        <div className="text-sm text-white/40 mb-6 font-mono absolute top-4 left-4">Option 2: Terminal / Code</div>
                        <div className="flex items-center gap-2 font-mono">
                            <Terminal size={20} className="text-[var(--accent)]" />
                            <span className="text-xl font-bold tracking-tight">&gt;_PIGEON</span>
                        </div>
                    </div>

                    {/* Variant 3: Speed / Swift (Wind icon + Italic) */}
                    <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-xl bg-black/50 hover:bg-white/5 transition relative">
                        <div className="text-sm text-white/40 mb-6 font-mono absolute top-4 left-4">Option 3: Swift / Motion</div>
                        <div className="flex items-center gap-1.5 italic">
                            <Wind size={22} className="text-[var(--primary)]" />
                            <span className="text-2xl font-extrabold tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>PIGEON</span>
                        </div>
                    </div>

                    {/* Variant 4: Cyberpunk / Neo (Brackets + Glow) */}
                    <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-xl bg-black/50 hover:bg-white/5 transition relative">
                        <div className="text-sm text-white/40 mb-6 font-mono absolute top-4 left-4">Option 4: Cyberpunk</div>
                        <div className="flex items-center gap-1">
                            <span className="text-[var(--accent)] text-2xl font-light opacity-50">[</span>
                            <Zap size={18} className="text-[var(--primary)] fill-[var(--primary)]" />
                            <span className="text-xl font-bold tracking-[0.2em] uppercase ml-1">Pigeon</span>
                            <span className="text-[var(--accent)] text-2xl font-light opacity-50">]</span>
                        </div>
                    </div>

                    {/* Variant 5: Abstract / Elegant (Dashed Circle) */}
                    <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-xl bg-black/50 hover:bg-white/5 transition relative">
                        <div className="text-sm text-white/40 mb-6 font-mono absolute top-4 left-4">Option 5: Abstract Blockchain</div>
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center">
                                <CircleDashed size={28} className="text-[var(--muted-foreground)] animate-[spin_10s_linear_infinite]" />
                                <div className="absolute w-2 h-2 rounded-full bg-[var(--primary)]" />
                            </div>
                            <span className="text-xl font-medium tracking-widest uppercase">Pigeon</span>
                        </div>
                    </div>

                    {/* Variant 6: Lettermark (Giant P) */}
                    <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-xl bg-black/50 hover:bg-white/5 transition relative">
                        <div className="text-sm text-white/40 mb-6 font-mono absolute top-4 left-4">Option 6: Sleek Lettermark</div>
                        <div className="flex items-center gap-[-2px]">
                            <span className="text-4xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">P</span>
                            <span className="text-xl font-bold tracking-tighter -ml-1">IGEON</span>
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-center text-sm text-[var(--muted-foreground)]">
                    Please tell me which option number you prefer!
                </div>
            </div>
        </div>
    )
}
