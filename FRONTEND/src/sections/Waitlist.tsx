import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Check, Mail, ArrowRight, ShieldCheck, Sparkles, Smartphone, AlertCircle } from 'lucide-react'
import { getWaitlistCount, insertWaitlistEmail } from '@/lib/neon'

gsap.registerPlugin(ScrollTrigger)

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function Waitlist() {
    const [email, setEmail] = useState('')
    const [state, setState] = useState<FormState>('idle')
    const [count, setCount] = useState<number | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const containerRef = useRef<HTMLElement>(null)

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const c = await getWaitlistCount();
                setCount(c);
            } catch (e) {
                console.error("Count fetch failed", e);
            }
        };
        fetchCount();

        if (!containerRef.current) return
        gsap.fromTo(
            containerRef.current.querySelector('.waitlist-content'),
            { opacity: 0, y: 100 },
            { opacity: 1, y: 0, duration: 1, ease: 'power4.out',
              scrollTrigger: { trigger: containerRef.current, start: 'top 70%' } }
        )
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setState('loading')
        setErrorMsg(null)
        
        try {
            await insertWaitlistEmail(email)
            setState('success')
            // Refresh count
            const c = await getWaitlistCount()
            setCount(c)
        } catch (error) {
            console.error("Waitlist error:", error)
            setState('error')
            setErrorMsg(error instanceof Error ? error.message : "Submission failed")
        }
    }

    return (
        <section id="waitlist" ref={containerRef} className="relative w-full bg-[var(--bg-blue)] text-white overflow-hidden flex items-center justify-center min-h-[90vh]">
            {/* Background Texture/Noise */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 80%)' }} />

            <div className="waitlist-content relative z-10 w-full flex flex-col lg:flex-row min-h-[90vh]">
                
                {/* Left Side: Massive Text */}
                <div className="w-full lg:w-1/2 p-12 md:p-24 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/20">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest opacity-80 mb-6 block">Early Access</span>
                    <h2 className="editorial-heading text-huge leading-none text-white mb-8">
                        JOIN<br/>THE<br/>REVOLUTION.
                    </h2>
                    <p className="text-xl md:text-3xl font-medium opacity-90 leading-tight max-w-xl">
                        Be among the first to experience SMS-based post-quantum secure payments on Algorand.
                    </p>
                </div>

                {/* Right Side: Form */}
                <div className="w-full lg:w-1/2 p-12 md:p-24 flex flex-col justify-center items-center relative">
                    <div className="w-full max-w-md rough-glass p-8 md:p-12 relative overflow-hidden text-[var(--text)]">
                        
                        <div className="mb-10">
                            <h3 className="editorial-heading text-3xl mb-2 text-dark-ink">Reserve Spot</h3>
                            <p className="text-dark-ink/70 font-medium mb-4">Limited spots available for the beta release.</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-dark-ink/5 rounded-full border border-dark-ink/10">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-dark-ink/60">
                                    {count !== null ? `${count.toLocaleString()}+ Users already joined` : 'Joining the revolution...'}
                                </span>
                            </div>
                        </div>

                        {state === 'success' ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center text-center py-8"
                            >
                                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 text-green-600">
                                    <Check size={40} strokeWidth={3} />
                                </div>
                                <h4 className="text-2xl font-bold text-dark-ink mb-2">You're on the list!</h4>
                                <p className="text-dark-ink/70 font-medium">We'll notify you when your spot is ready.</p>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={20} className="text-dark-ink/50" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
                                        disabled={state === 'loading'}
                                        className="w-full pl-12 pr-4 py-4 bg-white/50 border border-dark-ink/10 text-dark-ink placeholder-dark-ink/50 text-base outline-none transition-all duration-300 focus:border-dark-ink focus:bg-white disabled:opacity-50 font-bold rounded-2xl"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={state === 'loading'}
                                    className="btn-editorial w-full bg-dark-ink text-white hover:bg-black group"
                                >
                                    {state === 'loading' ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Processing
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2 w-full">
                                            Join Waitlist
                                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                        </span>
                                    )}
                                </button>
                                {state === 'error' && (
                                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                                        <AlertCircle size={14} />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}
                            </form>
                        )}

                        <div className="mt-12 flex flex-col gap-3">
                            {[
                                { icon: <ShieldCheck size={16} />, text: 'No spam, ever.' },
                                { icon: <Sparkles size={16} />, text: 'Early beta access.' },
                                { icon: <Smartphone size={16} />, text: 'Exclusive updates.' }
                            ].map(({ icon, text }) => (
                                <div key={text} className="flex items-center gap-3 text-sm font-bold text-dark-ink/70">
                                    <span className="opacity-70">{icon}</span>
                                    <span>{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
