import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const navLinks = [
    { label: 'Home',         href: '#home' },
    { label: 'Features',     href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Team',         href: '#team' },
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
                'fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-[95%] max-w-7xl rounded-full',
                scrolled
                    ? 'rough-glass py-3 px-6'
                    : 'bg-transparent py-4 px-6'
            )}
        >
            <div className="flex items-center justify-between">
                {/* Logo */}
                <a
                    href="#home"
                    onClick={(e) => handleNavClick(e, '#home')}
                    className="flex items-center gap-3 group select-none"
                >
                    <img 
                        src="/favicon.svg" 
                        alt="Pigeon Logo" 
                        width="32" 
                        height="32" 
                        className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[15deg] drop-shadow-md"
                    />
                    <span className="editorial-heading text-2xl tracking-[0.05em] text-[var(--text)] group-hover:text-vibrant-yellow transition-colors duration-300">
                        PIGEON
                    </span>
                </a>

                {/* Desktop Links */}
                <div className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className="text-xs font-bold tracking-widest uppercase text-[var(--text)] hover:text-dark-ink transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[2px] after:bg-dark-ink after:transition-all after:duration-300 hover:after:w-full hover:-translate-y-0.5"
                        >
                            {link.label}
                        </a>
                    ))}
                    <a
                        href="https://github.com/HimanshuM685/PIGEON"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-editorial py-2.5 px-6 text-xs"
                    >
                        GitHub
                    </a>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="lg:hidden flex flex-col gap-1.5 p-2 rounded-full hover:bg-[var(--bg-surface)] transition-colors"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={cn('block w-6 h-0.5 bg-[var(--text)] transition-all duration-300 rounded-full', mobileOpen && 'rotate-45 translate-y-2')} />
                    <span className={cn('block w-6 h-0.5 bg-[var(--text)] transition-all duration-300 rounded-full', mobileOpen && 'opacity-0')} />
                    <span className={cn('block w-6 h-0.5 bg-[var(--text)] transition-all duration-300 rounded-full', mobileOpen && '-rotate-45 -translate-y-2')} />
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={cn(
                'lg:hidden overflow-hidden transition-all duration-500 ease-in-out absolute top-full left-0 right-0 mt-4 mx-2 rounded-3xl backdrop-blur-[60px] bg-white/40',
                mobileOpen
                    ? 'max-h-[600px] opacity-100 scale-100'
                    : 'max-h-0 opacity-0 scale-95 pointer-events-none'
            )}>
                <div className="px-6 py-8 flex flex-col gap-4 text-center">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className="editorial-heading text-xl text-[var(--text)] hover:text-dark-ink transition-all duration-200"
                        >
                            {link.label}
                        </a>
                    ))}
                    <a
                        href="https://github.com/HimanshuM685/PIGEON"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-editorial mt-4"
                    >
                        GitHub
                    </a>
                </div>
            </div>
        </nav>
    )
}
