import { Github, ExternalLink } from 'lucide-react'

export function Footer() {
    return (
        <footer className="relative z-10 overflow-hidden flex flex-col items-center"
            style={{ background: 'var(--accent)' }}>
            {/* Top stripe */}
            <div className="w-full h-0.5 bg-[var(--primary)] opacity-50" />

            {/* Main content */}
            <div className="w-full max-w-7xl px-4 sm:px-6 pt-16 pb-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">
                    {/* Brand */}
                    <div className="sm:col-span-2 md:col-span-2">
                        <div className="flex items-center gap-2 mb-5">
                            <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
                                <polygon points="8,44 24,20 40,28 32,48"  fill="#F2F2DF"/>
                                <polygon points="24,20 48,14 40,28"        fill="#B7B0F3"/>
                                <polygon points="24,20 34,10 40,18 32,26" fill="#F2F2DF"/>
                                <polygon points="34,10 44,8 38,16"         fill="#FFDD7C"/>
                                <circle  cx="35" cy="16" r="2.5"           fill="#FFDD7C"/>
                                <polygon points="8,44 4,54 16,46"          fill="#5158A6"/>
                            </svg>
                            <span className="font-display font-bold text-lg tracking-[0.15em] uppercase text-[#F2F2DF]">Pigeon</span>
                        </div>
                        <p className="text-[13px] text-[rgba(242,242,223,0.6)] leading-relaxed mb-6 max-w-[260px]">
                            Peer Integrated Gateway for Encrypted On-chain Network
                        </p>
                        <p className="text-xs text-[rgba(242,242,223,0.35)] font-mono tracking-wide">
                            &copy; {new Date().getFullYear()} PIGEON
                        </p>
                    </div>

                    {/* About */}
                    <div className="md:col-span-1">
                        <h4 className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-6 text-[rgba(242,242,223,0.5)] font-mono">About</h4>
                        <ul className="space-y-3.5">
                            {['Team', 'Features', 'Architecture'].map((link) => (
                                <li key={link}>
                                    <a href={`#${link.toLowerCase()}`}
                                        className="text-[13px] text-[rgba(242,242,223,0.7)] hover:text-[var(--primary)] transition-colors duration-200">
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="md:col-span-1">
                        <h4 className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-6 text-[rgba(242,242,223,0.5)] font-mono">Resources</h4>
                        <ul className="space-y-3.5">
                            <li>
                                <a href="#how-it-works" className="text-[13px] text-[rgba(242,242,223,0.7)] hover:text-[var(--primary)] transition-colors duration-200">
                                    How It Works
                                </a>
                            </li>
                            <li>
                                <a href="https://github.com/HimanshuM685/PIGEON" target="_blank" rel="noopener noreferrer"
                                    className="text-[13px] text-[rgba(242,242,223,0.7)] hover:text-[var(--primary)] transition-colors duration-200 inline-flex items-center gap-1">
                                    Docs <ExternalLink size={11} className="opacity-50" />
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div className="md:col-span-1">
                        <h4 className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-6 text-[rgba(242,242,223,0.5)] font-mono">Connect</h4>
                        <ul className="space-y-3.5">
                            <li>
                                <a href="https://github.com/HimanshuM685/PIGEON" target="_blank" rel="noopener noreferrer"
                                    className="text-[13px] text-[rgba(242,242,223,0.7)] hover:text-[var(--primary)] transition-colors duration-200 inline-flex items-center gap-1.5">
                                    <Github size={12} className="opacity-60" /> GitHub
                                </a>
                            </li>
                            <li>
                                <a href="https://testnet.explorer.perawallet.app/" target="_blank" rel="noopener noreferrer"
                                    className="text-[13px] text-[rgba(242,242,223,0.7)] hover:text-[var(--primary)] transition-colors duration-200 inline-flex items-center gap-1.5">
                                    <ExternalLink size={12} className="opacity-60" /> Algo Explorer
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Giant wordmark — clipped at top of letters */}
            <div className="w-full flex flex-col items-center justify-start overflow-hidden h-[22vw] md:h-[18vw]">
                <h2
                    className="font-display font-black text-[30vw] md:text-[23vw] leading-[0.75] tracking-[-0.02em] select-none pointer-events-none uppercase flex-shrink-0"
                    style={{ color: 'rgba(255,255,255,0.06)' }}
                >
                    PIGEON
                </h2>
            </div>
        </footer>
    )
}
