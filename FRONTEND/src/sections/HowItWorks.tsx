import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MessageSquare, Brain, Shield, Radio, CheckCircle } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const steps = [
    { icon: MessageSquare, number: '01', title: 'User Sends SMS',     description: '"Send 30 ALGO to 9912345678"',                                                                     accent: 'var(--bg-blue)' },
    { icon: Brain,         number: '02', title: 'AI Parses Intent',   description: 'Intent parser extracts: intent=send, amount=30, asset=ALGO, to=9912345678',                         accent: 'var(--bg-yellow)' },
    { icon: Shield,        number: '03', title: 'Decrypt & Sign',     description: 'Your wallet mnemonic is decrypted with your password and the transaction is signed locally.',        accent: 'var(--bg-pink)' },
    { icon: Radio,         number: '04', title: 'Broadcast to Chain', description: 'Signed transaction is broadcast to Algorand for execution.',                                        accent: 'var(--bg-green)' },
    { icon: CheckCircle,   number: '05', title: 'SMS Confirmation',   description: 'User receives an SMS with the transaction hash and status.',                                         accent: 'var(--bg-red)' },
]

export function HowItWorks() {
    const sectionRef = useRef<HTMLElement>(null)
    const stepsRef   = useRef<HTMLDivElement[]>([])
    const lineRef    = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sectionRef.current) return

        gsap.fromTo(
            sectionRef.current.querySelector('.section-header'),
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 1, ease: 'power3.out',
              scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', end: 'top 50%', scrub: 1 } }
        )

        if (lineRef.current) {
            gsap.fromTo(lineRef.current, { scaleY: 0 }, {
                scaleY: 1,
                scrollTrigger: {
                    trigger: sectionRef.current.querySelector('.timeline-container'),
                    start: 'top 70%', end: 'bottom 60%', scrub: 1,
                },
            })
        }

        stepsRef.current.forEach((step, i) => {
            const isLeft = i % 2 === 0
            gsap.fromTo(step,
                { opacity: 0, x: isLeft ? -120 : 120, rotateY: isLeft ? 15 : -15, scale: 0.85 },
                { opacity: 1, x: 0, rotateY: 0, scale: 1, duration: 1.5, ease: 'power4.out',
                  scrollTrigger: { trigger: step, start: 'top 90%', end: 'top 50%', scrub: 1.5 } }
            )
        })
    }, [])

    return (
        <section id="how-it-works" ref={sectionRef} className="relative z-10 py-32 md:py-48 px-4 sm:px-6">
            {/* Blush background band */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(228,218,232,0.25) 50%, transparent 100%)' }} />

            <div className="max-w-5xl mx-auto relative">
                {/* Header */}
                <div className="section-header flex flex-col items-center text-center mb-24 md:mb-32">
                    <span className="candy-tag candy-tag-blue mb-6">How It Works</span>
                    <h2 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold uppercase tracking-[-0.04em] mb-8 leading-[0.9] text-[var(--text)]">
                        SMS To<br />
                        <span className="text-[var(--bg-blue)] text-stroke">Blockchain</span>
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-3xl text-base md:text-lg lg:text-xl leading-relaxed">
                        Five simple steps. One powerful pipeline.
                    </p>
                </div>

                {/* Timeline */}
                <div className="timeline-container perspective-container relative">
                    {/* Vertical line */}
                    <div
                        ref={lineRef}
                        className="absolute left-5 md:left-1/2 top-0 bottom-0 w-0.5 origin-top"
                        style={{ background: 'linear-gradient(to bottom, var(--accent-light), var(--primary), var(--accent-light))' }}
                    />

                    <div className="flex flex-col gap-12 md:gap-14">
                        {steps.map((step, i) => (
                            <div
                                key={step.number}
                                ref={(el) => { if (el) stepsRef.current[i] = el }}
                                className={`card-3d flex items-start gap-6 md:gap-12 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                            >
                                {/* Content */}
                                <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} pl-14 md:pl-0`}>
                                    <div
                                        className="spotlight-card p-5 md:p-6 group transition-all duration-300"
                                        onMouseMove={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect()
                                            e.currentTarget.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`)
                                            e.currentTarget.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`)
                                            e.currentTarget.style.setProperty('--spotlight-color', 'rgba(69,39,118,0.05)')
                                        }}
                                    >
                                        <div className="flex items-center gap-3 mb-2" style={{ justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                                            <span className="text-xs font-mono font-bold tracking-[0.2em] text-[var(--accent)]">{step.number}</span>
                                            <h3 className="text-sm md:text-base font-semibold text-[var(--text)]">{step.title}</h3>
                                        </div>
                                        <p className="text-xs md:text-sm text-[var(--text-muted)] font-mono leading-relaxed">{step.description}</p>
                                    </div>
                                </div>

                                {/* Center icon */}
                                <div className="absolute left-1 md:left-1/2 md:-translate-x-1/2 flex-shrink-0">
                                    <div
                                        className="w-9 h-9 flex items-center justify-center shadow-[var(--shadow-sm)]"
                                        style={{
                                            backgroundColor: step.accent,
                                            color: 'var(--text)',
                                            borderRadius: 'var(--radius-pill)',
                                            border: '2px solid var(--border)'
                                        }}
                                    >
                                        <step.icon size={16} strokeWidth={3} />
                                    </div>
                                </div>

                                {/* Spacer */}
                                <div className="flex-1 hidden md:block" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
