import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const navLinks = [
    { label: 'Home',         href: '#home' },
    { label: 'About',        href: '#about' },
    { label: 'Features',     href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Team',         href: '#team' },
    { label: 'Stats',        href: '#stats' },
    { label: 'Waitlist',     href: '#waitlist' },
    { label: 'Docs',         href: '#docs' },
]

export function Navbar() {
    const [scrolled,   setScrolled]   = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault()
        window.location.hash = href
        const el = document.querySelector(href)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
        else    window.scrollTo({ top: 0, behavior: 'smooth' })
        setMobileOpen(false)
    }

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-400',
                scrolled
                    ? 'glass-strong border-b-2 border-[var(--border)] py-3 shadow-[var(--shadow-xs)]'
                    : 'py-5 bg-transparent'
            )}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
                {/* Logo */}
                <a
                    href="#home"
                    onClick={(e) => handleNavClick(e, '#home')}
                    className="flex items-center gap-2 group select-none"
                >
                    <svg width="28" height="28" viewBox="0 0 64 64" fill="none" className="transition-transform duration-300 group-hover:scale-110 drop-shadow-[2px_2px_0px_#111111]">
                        <polygon points="8,44 24,20 40,28 32,48" fill="var(--bg-yellow)" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round"/>
                        <polygon points="24,20 48,14 40,28" fill="var(--bg-green)" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round"/>
                        <polygon points="24,20 34,10 40,18 32,26" fill="var(--bg-blue)" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round"/>
                        <polygon points="34,10 44,8 38,16" fill="var(--bg-red)" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round"/>
                        <circle cx="35" cy="16" r="2.5" fill="var(--text)"/>
                        <polygon points="8,44 4,54 16,46" fill="var(--bg-pink)" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round"/>
                    </svg>
                    <span className="font-display font-black text-2xl tracking-[0.05em] uppercase text-[var(--text)] group-hover:text-[var(--bg-red)] transition-colors duration-300">
                        Pigeon
                    </span>
                </a>

                {/* Desktop Links */}
                <div className="hidden lg:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className="text-xs font-bold tracking-widest uppercase text-[var(--text)] hover:text-[var(--bg-red)] transition-colors duration-300 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[var(--bg-red)] after:transition-all after:duration-300 hover:after:w-full"
                        >
                            {link.label}
                        </a>
                    ))}
                    <a
                        href="https://github.com/HimanshuM685/PIGEON"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border-2 border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-red)] hover:text-white transition-all duration-300 rounded-full brutal-shadow-hover"
                    >
                        GitHub
                    </a>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="lg:hidden flex flex-col gap-1.5 p-2"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                    id="mobile-menu-toggle"
                >
                    <span className={cn('block w-6 h-0.5 bg-[var(--text)] transition-all duration-300', mobileOpen && 'rotate-45 translate-y-2')} />
                    <span className={cn('block w-6 h-0.5 bg-[var(--text)] transition-all duration-300', mobileOpen && 'opacity-0')} />
                    <span className={cn('block w-6 h-0.5 bg-[var(--text)] transition-all duration-300', mobileOpen && '-rotate-45 -translate-y-2')} />
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={cn(
                'lg:hidden overflow-hidden transition-all duration-300',
                mobileOpen
                    ? 'max-h-[600px] border-t border-[var(--border)] glass-strong nav-mobile-open'
                    : 'max-h-0'
            )}>
                <div className="px-4 py-5 flex flex-col gap-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className="text-sm font-bold uppercase tracking-widest text-[var(--text)] hover:text-[var(--bg-red)] hover:bg-[var(--bg-surface)] transition-all duration-200 px-3 py-2.5 rounded-xl border-2 border-transparent hover:border-[var(--border)]"
                        >
                            {link.label}
                        </a>
                    ))}
                    <a
                        href="https://github.com/HimanshuM685/PIGEON"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 w-full px-4 py-2.5 text-sm font-bold uppercase tracking-widest border-2 border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-red)] hover:text-white transition-all duration-300 text-center rounded-full brutal-shadow"
                    >
                        GitHub
                    </a>
                </div>
            </div>
        </nav>
    )
}
