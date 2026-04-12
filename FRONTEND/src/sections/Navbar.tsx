import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Zap } from 'lucide-react'

const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Team', href: '#team' },
]

export function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault()
        const el = document.querySelector(href)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
            setMobileOpen(false)
        }
    }

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
                scrolled
                    ? 'glass-strong py-3 shadow-lg shadow-black/20'
                    : 'py-5 bg-transparent'
            )}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <a href="#home" className="flex items-center gap-1 group">
                    <span className="text-[var(--accent)] text-2xl font-light opacity-50 group-hover:opacity-100 transition-opacity">[</span>
                    <Zap size={18} className="text-[var(--primary)] fill-[var(--primary)] group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-bold tracking-[0.2em] uppercase ml-1 group-hover:text-white transition-colors">Pigeon</span>
                    <span className="text-[var(--accent)] text-2xl font-light opacity-50 group-hover:opacity-100 transition-opacity">]</span>
                </a>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors duration-300 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[var(--primary)] after:transition-all after:duration-300 hover:after:w-full"
                        >
                            {link.label}
                        </a>
                    ))}
                    <a
                        href="https://github.com/Koushikmondal06/PIGEON"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-full text-sm font-medium border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-300"
                    >
                        GitHub
                    </a>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden flex flex-col gap-1.5 p-2"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={cn(
                        'block w-6 h-0.5 bg-white transition-all duration-300',
                        mobileOpen && 'rotate-45 translate-y-2'
                    )} />
                    <span className={cn(
                        'block w-6 h-0.5 bg-white transition-all duration-300',
                        mobileOpen && 'opacity-0'
                    )} />
                    <span className={cn(
                        'block w-6 h-0.5 bg-white transition-all duration-300',
                        mobileOpen && '-rotate-45 -translate-y-2'
                    )} />
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={cn(
                'md:hidden overflow-hidden transition-all duration-300 glass-strong',
                mobileOpen ? 'max-h-96 border-t border-[var(--border)] mt-3' : 'max-h-0'
            )}>
                <div className="px-6 py-4 flex flex-col gap-4">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className="text-[var(--muted-foreground)] hover:text-white transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            </div>
        </nav>
    )
}
