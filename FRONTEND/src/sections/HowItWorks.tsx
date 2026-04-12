import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MessageSquare, Brain, Shield, Radio, CheckCircle } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const steps = [
    {
        icon: MessageSquare,
        number: '01',
        title: 'User Sends SMS',
        description: '"Send 30 ALGO to 9912345678"',
        color: '#06B6D4',
    },
    {
        icon: Brain,
        number: '02',
        title: 'AI Parses Intent',
        description: 'Gemini AI extracts: intent=send, amount=30, asset=ALGO, to=9912345678',
        color: '#8B5CF6',
    },
    {
        icon: Shield,
        number: '03',
        title: 'Decrypt & Sign',
        description: 'Your wallet mnemonic is decrypted with your password and the transaction is signed locally.',
        color: '#F59E0B',
    },
    {
        icon: Radio,
        number: '04',
        title: 'Broadcast to Chain',
        description: 'Signed transaction is broadcast to Algorand for execution.',
        color: '#EF4444',
    },
    {
        icon: CheckCircle,
        number: '05',
        title: 'SMS Confirmation',
        description: 'User receives an SMS with the transaction hash and status.',
        color: '#10B981',
    },
]

export function HowItWorks() {
    const sectionRef = useRef<HTMLElement>(null)
    const stepsRef = useRef<HTMLDivElement[]>([])
    const lineRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sectionRef.current) return

        // Header — scrub animation
        gsap.fromTo(
            sectionRef.current.querySelector('.section-header'),
            { opacity: 0, y: 60 },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 80%',
                    end: 'top 50%',
                    scrub: 1,
                },
            }
        )

        // Vertical line — grow with scrub
        if (lineRef.current) {
            gsap.fromTo(
                lineRef.current,
                { scaleY: 0 },
                {
                    scaleY: 1,
                    scrollTrigger: {
                        trigger: sectionRef.current.querySelector('.timeline-container'),
                        start: 'top 70%',
                        end: 'bottom 60%',
                        scrub: 1,
                    },
                }
            )
        }

        // Steps — staggered 3D entrance with scrub
        stepsRef.current.forEach((step, i) => {
            const isLeft = i % 2 === 0
            gsap.fromTo(
                step,
                {
                    opacity: 0,
                    x: isLeft ? -120 : 120,
                    rotateY: isLeft ? 15 : -15,
                    scale: 0.85,
                },
                {
                    opacity: 1,
                    x: 0,
                    rotateY: 0,
                    scale: 1,
                    duration: 1.5,
                    ease: 'power4.out',
                    scrollTrigger: {
                        trigger: step,
                        start: 'top 90%',
                        end: 'top 50%',
                        scrub: 1.5,
                    },
                }
            )
        })
    }, [])

    return (
        <section id="how-it-works" ref={sectionRef} className="relative z-10 py-32 md:py-48 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="section-header flex flex-col items-center text-center mb-32">
                    <span className="inline-block px-4 py-1.5 text-xs tracking-[0.3em] uppercase font-mono text-[var(--primary)] mb-6">
                        [ How It Works ]
                    </span>
                    <h2 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-[-0.05em] mb-8 leading-[0.9]">
                        SMS To<br />
                        <span className="text-[var(--primary)]">Blockchain</span>
                    </h2>
                    <p className="text-[var(--muted-foreground)] max-w-3xl text-base md:text-lg lg:text-xl leading-relaxed">
                        Five simple steps. One powerful pipeline.
                    </p>
                </div>

                {/* Steps Timeline */}
                <div className="timeline-container perspective-container relative">
                    {/* Vertical line */}
                    <div
                        ref={lineRef}
                        className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--accent)] via-[var(--primary)] to-[#10B981] origin-top"
                    />

                    <div className="flex flex-col gap-14">
                        {steps.map((step, i) => (
                            <div
                                key={step.number}
                                ref={(el) => { if (el) stepsRef.current[i] = el }}
                                className={`card-3d flex items-start gap-6 md:gap-12 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                                    }`}
                            >
                                {/* Step Content */}
                                <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} pl-20 md:pl-0`}>
                                    <div className="spotlight-card p-6 group">
                                        <div className="flex items-center gap-3 mb-3" style={{ justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                                            <span className="text-xs font-mono font-bold" style={{ color: step.color }}>
                                                {step.number}
                                            </span>
                                            <h3 className="text-base font-bold">{step.title}</h3>
                                        </div>
                                        <p className="text-sm text-[var(--muted-foreground)] font-mono leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Center Icon */}
                                <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 flex-shrink-0">
                                    <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg"
                                        style={{
                                            backgroundColor: step.color,
                                            boxShadow: `0 0 20px ${step.color}40`,
                                        }}
                                    >
                                        <step.icon size={16} />
                                    </div>
                                </div>

                                {/* Spacer for alternating layout */}
                                <div className="flex-1 hidden md:block" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
