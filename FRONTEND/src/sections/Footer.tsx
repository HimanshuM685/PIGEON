import { Github, ExternalLink, Zap } from 'lucide-react'

export function Footer() {
    return (
        <footer className="relative z-10 bg-black overflow-hidden flex flex-col items-center">
            {/* Glowing top border */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-50 relative mt-px">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[20px] bg-white/20 blur-[10px] pointer-events-none"></div>
            </div>

            {/* Top section — info + links grid */}
            <div className="w-full max-w-7xl px-6 pt-20 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-8">
                    {/* Brand + Full Form */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-1.5 mb-5">
                            <span className="text-[#6D28D9] text-xl font-medium">[</span>
                            <Zap size={18} className="text-[#F97316] fill-[#F97316]" />
                            <span className="text-xl font-bold tracking-[0.2em] uppercase text-white ml-1 mr-0.5">Pigeon</span>
                            <span className="text-[#6D28D9] text-xl font-medium">]</span>
                        </div>
                        <p className="text-[13px] text-gray-400/90 leading-relaxed mb-6 max-w-[260px]">
                            Peer Integrated Gateway for Encrypted On-chain Network
                        </p>
                        <p className="text-xs text-gray-600 font-medium tracking-wide">
                            &copy; {new Date().getFullYear()} PIGEON
                        </p>
                    </div>

                    {/* About */}
                    <div className="md:col-span-1">
                        <h4 className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-6 text-white text-opacity-80">About</h4>
                        <ul className="space-y-4">
                            {['Team', 'Features', 'Architecture'].map((link) => (
                                <li key={link}>
                                    <a
                                        href={`#${link.toLowerCase()}`}
                                        className="text-[13px] text-gray-400/80 hover:text-white transition-colors"
                                    >
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="md:col-span-1">
                        <h4 className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-6 text-white text-opacity-80">Resources</h4>
                        <ul className="space-y-4">
                            <li>
                                <a href="#how-it-works" className="text-[13px] text-gray-400/80 hover:text-white transition-colors">
                                    How It Works
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/Koushikmondal06/PIGEON"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[13px] text-gray-400/80 hover:text-white transition-colors inline-flex items-center gap-1"
                                >
                                    Docs <ExternalLink size={12} className="text-gray-500" />
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div className="md:col-span-1">
                        <h4 className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-6 text-white text-opacity-80">Connect</h4>
                        <ul className="space-y-4">
                            <li>
                                <a
                                    href="https://github.com/Koushikmondal06/PIGEON"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[13px] text-gray-400/80 hover:text-white transition-colors inline-flex items-center gap-1.5"
                                >
                                    <Github size={13} className="text-gray-500" /> GitHub
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://testnet.explorer.perawallet.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[13px] text-gray-400/80 hover:text-white transition-colors inline-flex items-center gap-1.5"
                                >
                                    <ExternalLink size={13} className="text-gray-500" /> Algo Explorer
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Giant PIGEON text — partially hidden */}
            <div className="w-full flex flex-col items-center justify-start overflow-hidden mt-8 h-[22vw] md:h-[18vw]">
                <h2 className="font-display font-black text-[30vw] md:text-[23vw] leading-[0.75] tracking-[-0.02em] text-[#1a1a1a] select-none pointer-events-none uppercase flex-shrink-0">
                    PIGEON
                </h2>
            </div>
        </footer>
    )
}
