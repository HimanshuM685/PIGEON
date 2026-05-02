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

    useEffect(() => {
        getWaitlistCount().then(setCount).catch(() => setCount(null))
    }, [])

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', once: true } })
            tl.fromTo(badgeRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
                .fromTo(headlineRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.25')
                .fromTo(subtitleRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.35')
                .fromTo(cardRef.current, { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, '-=0.3')
                .fromTo(formRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '-=0.35')
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
            if (result === 'duplicate') { setState('duplicate') }
            else { setState('success'); setEmail(''); setCount(prev => prev !== null ? prev + 1 : 1) }
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : 'Network error. Please check your connection and try again.')
            setState('error')
        }
    }

    const handleReset = () => { setState('idle'); setErrorMsg(''); setEmail('') }

    return (
        <section
            id="waitlist"
            ref={sectionRef}
            className="relative py-32 md:py-48 flex items-center justify-center overflow-hidden px-4 sm:px-6"
        >
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Lilac blush gradient background */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,245,244,0.8) 0%, rgba(228,218,232,0.5) 50%, rgba(242,242,223,0.8) 100%)' }} />
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(69,39,118,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                <div className="candy-stripe absolute top-0 left-0 right-0" />
                <div className="candy-stripe absolute bottom-0 left-0 right-0" />
            </div>

            <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
                {/* Badge */}
                <div ref={badgeRef} className="opacity-0 mb-6 inline-flex items-center gap-2.5 px-4 py-2 bg-[var(--bg-yellow)] border-2 border-[var(--border)] shadow-[2px_2px_0px_#111111] rounded-full">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                    </span>
                    <span className="text-[10px] text-[var(--accent)] font-mono tracking-[0.25em] uppercase font-semibold">
                        Early Access — Limited Spots
                    </span>
                </div>

                {/* Headline */}
                <h2
                    ref={headlineRef}
                    className="opacity-0 font-display font-extrabold text-[var(--text)] text-center uppercase tracking-tight mb-6"
                    style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', lineHeight: 0.95 }}
                >
                    Join the{' '}
                    <span className="text-[var(--bg-red)] text-stroke">Waitlist</span>
                </h2>

                {/* Subtitle */}
                <p ref={subtitleRef} className="opacity-0 text-[var(--text-muted)] text-center text-base md:text-lg leading-relaxed max-w-4xl mx-auto mb-10">
                    Be among the first to send crypto via SMS. Get early access, exclusive updates,
                    and a chance to shape PIGEON before public launch.
                </p>

                {/* Social proof */}
                {count !== null && count > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-6 text-sm text-[var(--text-muted)]">
                        <Users size={14} className="text-[var(--accent)]" />
                        <span className="font-mono font-semibold text-[var(--accent)]">{count.toLocaleString()}</span>
                        <span>people already on the list</span>
                    </div>
                )}

                {/* Card */}
                <div
                    ref={cardRef}
                    className="opacity-0 relative p-7 md:p-10 bg-[var(--bg-pink)] border-4 border-[var(--border)] brutal-shadow rounded-3xl"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        e.currentTarget.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`)
                        e.currentTarget.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`)
                        e.currentTarget.style.setProperty('--spotlight-color', 'rgba(69,39,118,0.04)')
                    }}
                >
                    {/* Success */}
                    {state === 'success' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 bg-green-100 border border-green-200 flex items-center justify-center rounded-2xl">
                                <CheckCircle2 size={26} className="text-green-600" />
                            </div>
                            <div className="text-center">
                                <p className="text-[var(--text)] font-display font-bold text-xl mb-2">You're on the list! 🎉</p>
                                <p className="text-[var(--text-muted)] text-sm leading-relaxed">We'll reach out when PIGEON is ready. Keep an eye on your inbox.</p>
                            </div>
                            <button onClick={handleReset} className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors underline underline-offset-4">Add another email</button>
                        </div>
                    )}

                    {/* Duplicate */}
                    {state === 'duplicate' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 flex items-center justify-center rounded-2xl"
                                style={{ background: 'rgba(255,221,124,0.2)' }}>
                                <Mail size={22} className="text-[var(--accent)]" />
                            </div>
                            <div className="text-center">
                                <p className="text-[var(--text)] font-display font-bold text-xl mb-2">Already registered!</p>
                                <p className="text-[var(--text-muted)] text-sm">This email is already on the waitlist. We've got you covered.</p>
                            </div>
                            <button onClick={handleReset} className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors underline underline-offset-4">Try a different email</button>
                        </div>
                    )}

                    {/* Form */}
                    {(state === 'idle' || state === 'loading' || state === 'error') && (
                        <div ref={formRef} className="opacity-0">
                            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" noValidate>
                                <div className="relative flex-1 group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                        <Mail size={15} className="text-[var(--text-light)] group-focus-within:text-[var(--accent)] transition-colors duration-300" />
                                    </div>
                                    <input
                                        id="waitlist-email"
                                        type="email"
                                        required
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
                                        disabled={state === 'loading'}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-[var(--border)] text-[var(--text)] placeholder-[var(--text-light)] text-sm outline-none transition-all duration-300 focus:border-[var(--text)] focus:shadow-[2px_2px_0px_#111111] disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-bold"
                                    />
                                </div>
                                <button
                                    id="waitlist-submit-btn"
                                    type="submit"
                                    disabled={state === 'loading' || !email.trim()}
                                    className="btn-candy"
                                >
                                    {state === 'loading' ? (
                                        <><Loader2 size={15} className="animate-spin relative z-10" /><span className="relative z-10">Joining...</span></>
                                    ) : (
                                        <><Send size={13} className="relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" /><span className="relative z-10">Join Waitlist</span></>
                                    )}
                                </button>
                            </form>

                            {state === 'error' && errorMsg && (
                                <div className="mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200">
                                    <AlertCircle size={14} className="text-[var(--danger)] shrink-0" />
                                    <p className="text-sm text-[var(--danger)]">{errorMsg}</p>
                                </div>
                            )}

                            <p className="mt-5 text-xs text-[var(--text-light)] text-center">
                                No spam, ever. Unsubscribe anytime.{' '}
                                <span className="text-[var(--accent)] font-mono">Your privacy is sacred.</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Feature pills */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                    {[
                        { icon: '⚡', text: 'Algorand-powered' },
                        { icon: '📱', text: 'SMS-native UX' },
                        { icon: '🔐', text: 'E2E Encrypted' },
                        { icon: '🤖', text: 'NVIDIA NIM AI' },
                    ].map(({ icon, text }) => (
                        <div
                            key={text}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--text)] bg-white border-2 border-[var(--border)] hover:bg-[var(--bg-yellow)] transition-all duration-300 shadow-[2px_2px_0px_#111111] rounded-full"
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
