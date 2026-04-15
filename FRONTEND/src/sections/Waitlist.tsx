import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getWaitlistCount, insertWaitlistEmail } from '@/lib/neon'
import { Mail, CheckCircle2, AlertCircle, Loader2, Send, Users } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

type SubmitState = 'idle' | 'loading' | 'success' | 'error' | 'duplicate'

export function Waitlist() {
    const [email, setEmail] = useState('')
    const [state, setState] = useState<SubmitState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [count, setCount] = useState<number | null>(null)

    const sectionRef = useRef<HTMLElement>(null)
    const headlineRef = useRef<HTMLHeadingElement>(null)
    const subtitleRef = useRef<HTMLParagraphElement>(null)
    const formRef = useRef<HTMLDivElement>(null)
    const badgeRef = useRef<HTMLDivElement>(null)
    const cardRef = useRef<HTMLDivElement>(null)

    // Fetch waitlist count for social proof
    useEffect(() => {
        getWaitlistCount()
            .then((waitlistCount) => {
                setCount(waitlistCount)
            })
            .catch(() => {
                setCount(null)
            })
    }, [])

    // GSAP scroll-triggered entrance animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 75%',
                    once: true,
                },
            })

            tl.fromTo(badgeRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
            )
                .fromTo(headlineRef.current,
                    { opacity: 0, y: 40 },
                    { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
                    '-=0.25'
                )
                .fromTo(subtitleRef.current,
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
                    '-=0.35'
                )
                .fromTo(cardRef.current,
                    { opacity: 0, y: 40, scale: 0.97 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' },
                    '-=0.3'
                )
                .fromTo(formRef.current,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
                    '-=0.35'
                )
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || state === 'loading') return

        setState('loading')
        setErrorMsg('')

        try {
            const result = await insertWaitlistEmail(email.trim().toLowerCase())

            if (result === 'duplicate') {
                setState('duplicate')
            } else {
                setState('success')
                setEmail('')
                // Increment local count for optimistic UX
                setCount(prev => (prev !== null ? prev + 1 : 1))
            }
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Network error. Please check your connection and try again.'

            setErrorMsg(message)
            setState('error')
        }
    }

    const handleReset = () => {
        setState('idle')
        setErrorMsg('')
        setEmail('')
    }

    return (
        <section
            id="waitlist"
            ref={sectionRef}
            className="relative py-32 md:py-48 flex items-center justify-center overflow-hidden"
        >
            {/* Background layers */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Radial glow */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)',
                    }}
                />
                {/* Subtle grid */}
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)
                        `,
                        backgroundSize: '48px 48px',
                    }}
                />
                {/* Horizontal accent lines */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            </div>

            <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 text-center">
                {/* Badge */}
                <div
                    ref={badgeRef}
                    className="opacity-0 mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-[var(--border)]"
                >
                    <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--primary)]" />
                    </span>
                    <span className="text-xs text-[var(--primary-light)] font-mono tracking-wider">
                        Early Access — Limited Spots
                    </span>
                </div>

                {/* Headline */}
                <h2
                    ref={headlineRef}
                    className="opacity-0 font-display font-black text-white uppercase tracking-tight mb-6"
                    style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', lineHeight: 0.95 }}
                >
                    Join the{' '}
                    <span className="text-gradient" style={{ fontStyle: 'italic' }}>Waitlist</span>
                </h2>

                {/* Subtitle */}
                <p
                    ref={subtitleRef}
                    className="opacity-0 text-[var(--muted-foreground)] text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-12"
                >
                    Be among the first to send crypto via SMS. Get early access, exclusive updates,
                    and a chance to shape PIGEON before public launch.
                </p>

                {/* Social proof */}
                {count !== null && count > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-8 text-sm text-[var(--muted-foreground)]">
                        <Users size={14} className="text-[var(--accent)]" />
                        <span className="font-mono text-[var(--accent-light)]">{count.toLocaleString()}</span>
                        <span>people already on the list</span>
                    </div>
                )}

                {/* Card */}
                <div
                    ref={cardRef}
                    className="opacity-0 relative spotlight-card card-glow-border p-8 md:p-10 rounded-2xl"
                    onMouseMove={(e) => {
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const y = e.clientY - rect.top;
                        (e.currentTarget as HTMLDivElement).style.setProperty('--spotlight-x', `${x}px`);
                        (e.currentTarget as HTMLDivElement).style.setProperty('--spotlight-y', `${y}px`);
                        (e.currentTarget as HTMLDivElement).style.setProperty('--spotlight-color', 'rgba(139,92,246,0.06)');
                    }}
                >
                    {/* Success state */}
                    {state === 'success' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl scale-150 animate-pulse" />
                                <div className="relative w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                                    <CheckCircle2 size={32} className="text-green-400" />
                                </div>
                            </div>
                            <div>
                                <p className="text-white font-display font-bold text-xl mb-2">You're on the list! 🎉</p>
                                <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                                    We'll reach out when PIGEON is ready for you. Keep an eye on your inbox.
                                </p>
                            </div>
                            <button
                                onClick={handleReset}
                                className="mt-2 text-xs text-[var(--muted-foreground)] hover:text-white underline underline-offset-4 transition-colors"
                            >
                                Add another email
                            </button>
                        </div>
                    )}

                    {/* Duplicate state */}
                    {state === 'duplicate' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-[var(--primary)]/20 blur-xl scale-150" />
                                <div className="relative w-16 h-16 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center">
                                    <Mail size={28} className="text-[var(--primary)]" />
                                </div>
                            </div>
                            <div>
                                <p className="text-white font-display font-bold text-xl mb-2">Already registered!</p>
                                <p className="text-[var(--muted-foreground)] text-sm">
                                    This email is already on the waitlist. We've got you covered.
                                </p>
                            </div>
                            <button
                                onClick={handleReset}
                                className="mt-2 text-xs text-[var(--muted-foreground)] hover:text-white underline underline-offset-4 transition-colors"
                            >
                                Try a different email
                            </button>
                        </div>
                    )}

                    {/* Form (idle / loading / error) */}
                    {(state === 'idle' || state === 'loading' || state === 'error') && (
                        <div ref={formRef} className="opacity-0">
                            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" noValidate>
                                {/* Email Input */}
                                <div className="relative flex-1 group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                        <Mail size={16} className="text-[var(--muted-foreground)] group-focus-within:text-[var(--accent)] transition-colors duration-300" />
                                    </div>
                                    <input
                                        id="waitlist-email"
                                        type="email"
                                        required
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            if (state === 'error') setState('idle')
                                        }}
                                        disabled={state === 'loading'}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-[var(--border)] text-white placeholder-[var(--muted-foreground)] text-sm font-sans outline-none transition-all duration-300 focus:border-[var(--accent)]/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    id="waitlist-submit-btn"
                                    type="submit"
                                    disabled={state === 'loading' || !email.trim()}
                                    className="relative flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white whitespace-nowrap transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--accent), var(--primary))',
                                        boxShadow: '0 0 20px rgba(139,92,246,0.25)',
                                    }}
                                >
                                    {/* Shimmer */}
                                    <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 rounded-xl" />
                                    {state === 'loading' ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin relative z-10" />
                                            <span className="relative z-10">Joining...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={14} className="relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                                            <span className="relative z-10">Join Waitlist</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Error message */}
                            {state === 'error' && errorMsg && (
                                <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-sm text-red-300">{errorMsg}</p>
                                </div>
                            )}

                            {/* Privacy note */}
                            <p className="mt-5 text-xs text-[var(--muted-foreground)] text-center">
                                No spam, ever. Unsubscribe anytime.{' '}
                                <span className="text-[var(--accent-light)]/60 font-mono">Your privacy is sacred.</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Feature pills */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                    {[
                        { icon: '⚡', text: 'Algorand-powered' },
                        { icon: '📱', text: 'SMS-native UX' },
                        { icon: '🔐', text: 'E2E Encrypted' },
                        { icon: '🤖', text: 'NVIDIA NIM AI' },
                    ].map(({ icon, text }) => (
                        <div
                            key={text}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[var(--muted-foreground)] glass border border-[var(--border)]/60 hover:border-[var(--accent)]/40 hover:text-white transition-all duration-300"
                        >
                            <span>{icon}</span>
                            <span className="font-mono">{text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
