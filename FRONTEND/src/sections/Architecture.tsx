import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Marquee } from '@/components/ui/marquee'
import {
    MessageSquare,
    Radio,
    Brain,
    Phone,
    GitFork,
    Lock,
    Link2,
    CheckCircle,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const pipelineNodes = [
    {
        icon: MessageSquare,
        title: 'SMS Message',
        description: 'User sends a text command from any phone',
        color: '#06B6D4',
        tag: 'INPUT',
    },
    {
        icon: Radio,
        title: 'ESP32 + SIM800L / httpSMS',
        description: 'Hardware GSM module or cloud SMS gateway receives the message',
        color: '#8B5CF6',
        tag: 'GATEWAY',
    },
    {
        icon: Brain,
        title: 'Gemini 2.5 Flash',
        description: 'AI extracts intent, amount, recipient, and parameters',
        color: '#10B981',
        tag: 'AI ENGINE',
    },
    {
        icon: Phone,
        title: 'Phone Validation',
        description: 'Sender phone is matched to an on-chain wallet record',
        color: '#3B82F6',
        tag: 'IDENTITY',
    },
    {
        icon: GitFork,
        title: 'Intent Router',
        description: 'Routes to onboard, send, balance, fund, address, or txn handler',
        color: '#EC4899',
        tag: 'ROUTING',
    },
    {
        icon: Lock,
        title: 'Wallet Decrypt & Sign',
        description: 'AES-encrypted mnemonic is decrypted with user password, transaction signed via algosdk',
        color: '#F97316',
        tag: 'CRYPTO',
    },
    {
        icon: Link2,
        title: 'Algorand Testnet',
        description: 'Signed transaction is broadcast and confirmed on-chain',
        color: '#6366F1',
        tag: 'BLOCKCHAIN',
    },
    {
        icon: CheckCircle,
        title: 'SMS Confirmation',
        description: 'Transaction result is sent back to the user via SMS',
        color: '#22C55E',
        tag: 'OUTPUT',
    },
]

const techStack = [
    { name: 'Node.js', color: '#339933' },
    { name: 'TypeScript', color: '#3178C6' },
    { name: 'Algorand', color: '#000000' },
    { name: 'AlgoKit', color: '#6E40C9' },
    { name: 'Gemini AI', color: '#8B5CF6' },
    { name: 'algosdk', color: '#28A0F0' },
    { name: 'Puya TS', color: '#10B981' },
    { name: 'Express', color: '#FF6600' },
]

export function Architecture() {
    const sectionRef = useRef<HTMLElement>(null)
    const nodesRef = useRef<(HTMLDivElement | null)[]>([])
    const connectorsRef = useRef<(HTMLDivElement | null)[]>([])
    const pulseRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sectionRef.current) return

        const ctx = gsap.context(() => {
            // Header reveal
            gsap.fromTo(
                '.arch-header',
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

            // Each node: staggered fade + slide
            nodesRef.current.forEach((node, i) => {
                if (!node) return
                const fromX = i % 2 === 0 ? -60 : 60

                gsap.fromTo(
                    node,
                    { opacity: 0, x: fromX, scale: 0.9 },
                    {
                        opacity: 1,
                        x: 0,
                        scale: 1,
                        duration: 0.8,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: node,
                            start: 'top 90%',
                            end: 'top 65%',
                            scrub: 1,
                        },
                    }
                )
            })

            // Connector lines: grow (scaleY from 0 to 1)
            connectorsRef.current.forEach((line) => {
                if (!line) return
                gsap.fromTo(
                    line,
                    { scaleY: 0 },
                    {
                        scaleY: 1,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: line,
                            start: 'top 90%',
                            end: 'bottom 70%',
                            scrub: 1,
                        },
                    }
                )
            })

            // Traveling pulse: moves from first node to last
            if (pulseRef.current) {
                const pipeline = sectionRef.current?.querySelector('.pipeline-container')
                if (pipeline) {
                    gsap.fromTo(
                        pulseRef.current,
                        { top: '0%' },
                        {
                            top: '100%',
                            ease: 'none',
                            scrollTrigger: {
                                trigger: pipeline,
                                start: 'top 60%',
                                end: 'bottom 40%',
                                scrub: 1.5,
                            },
                        }
                    )
                }
            }

            // Tech badges — staggered reveal
            const techStackEl = sectionRef.current?.querySelector('.tech-stack')
            const badges = sectionRef.current?.querySelectorAll('.tech-badge') ?? []
            badges.forEach((badge, i) => {
                gsap.fromTo(
                    badge,
                    { opacity: 0, y: 20, scale: 0.8 },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.5,
                        delay: i * 0.06,
                        ease: 'back.out(1.5)',
                        scrollTrigger: {
                            trigger: techStackEl,
                            start: 'top 85%',
                            end: 'top 65%',
                            scrub: 1,
                        },
                    }
                )
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    return (
        <section id="architecture" ref={sectionRef} className="relative z-10 py-32 md:py-48 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="arch-header flex flex-col items-center text-center mb-24">
                    <span className="inline-block px-4 py-1.5 text-xs tracking-[0.3em] uppercase font-mono text-[var(--accent)] mb-6">
                        [ Architecture ]
                    </span>
                    <h2 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-[-0.05em] mb-8 leading-[0.9]">
                        System<br />
                        <span className="text-[var(--primary)]">Design</span>
                    </h2>
                    <p className="text-[var(--muted-foreground)] max-w-3xl text-base md:text-lg lg:text-xl leading-relaxed">
                        A robust pipeline from SMS to blockchain, powered by Gemini AI and encrypted wallet management.
                    </p>
                </div>

                {/* Animated Pipeline */}
                <div className="pipeline-container relative">
                    {/* Traveling pulse dot */}
                    <div
                        ref={pulseRef}
                        className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                        style={{ top: '0%' }}
                    >
                        <div className="relative">
                            <div className="w-4 h-4 rounded-full bg-[var(--primary)] animate-pulse" />
                            <div className="absolute inset-0 w-4 h-4 rounded-full bg-[var(--primary)] blur-md opacity-60" />
                            <div className="absolute -inset-2 w-8 h-8 rounded-full bg-[var(--primary)] blur-xl opacity-30" />
                        </div>
                    </div>

                    {/* Background track line */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-white/5" />

                    {pipelineNodes.map((node, i) => (
                        <div key={node.title}>
                            {/* Node Card */}
                            <div
                                ref={(el) => { nodesRef.current[i] = el }}
                                className="relative flex items-center gap-6 md:gap-10"
                            >
                                {/* Center dot on the vertical line */}
                                <div className="absolute left-1/2 -translate-x-1/2 z-20">
                                    <div
                                        className="w-3.5 h-3.5 rounded-full border-2 border-black"
                                        style={{
                                            backgroundColor: node.color,
                                            boxShadow: `0 0 12px ${node.color}60, 0 0 24px ${node.color}30`,
                                        }}
                                    />
                                </div>

                                {/* Card — alternates left/right on desktop */}
                                <div
                                    className={`w-full md:w-[calc(50%-2rem)] ${i % 2 === 0
                                        ? 'md:mr-auto md:pr-8'
                                        : 'md:ml-auto md:pl-8'
                                        } pl-10 md:pl-0`}
                                >
                                    <div
                                        className="group spotlight-card p-5 md:p-6 transition-all duration-500 hover:scale-[1.02]"
                                        style={{
                                            borderColor: `${node.color}15`,
                                        }}
                                        onMouseEnter={(e) => {
                                            const card = e.currentTarget
                                            card.style.borderColor = `${node.color}40`
                                            card.style.boxShadow = `0 0 30px ${node.color}15, inset 0 1px 0 ${node.color}20`
                                        }}
                                        onMouseLeave={(e) => {
                                            const card = e.currentTarget
                                            card.style.borderColor = `${node.color}15`
                                            card.style.boxShadow = 'none'
                                        }}
                                    >
                                        <div className={`flex items-start gap-4 ${i % 2 === 0 ? 'md:flex-row-reverse md:text-right' : ''}`}>
                                            {/* Icon */}
                                            <div
                                                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                                style={{
                                                    backgroundColor: `${node.color}12`,
                                                    color: node.color,
                                                    boxShadow: `0 0 20px ${node.color}15`,
                                                }}
                                            >
                                                <node.icon size={22} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className={`flex items-center gap-2 mb-1.5 ${i % 2 === 0 ? 'md:justify-end' : ''}`}>
                                                    <span
                                                        className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-full"
                                                        style={{
                                                            backgroundColor: `${node.color}15`,
                                                            color: node.color,
                                                        }}
                                                    >
                                                        {node.tag}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm md:text-base font-bold text-white mb-1">
                                                    {node.title}
                                                </h3>
                                                <p className="text-xs md:text-sm text-[var(--muted-foreground)] leading-relaxed">
                                                    {node.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Connector line between nodes */}
                            {i < pipelineNodes.length - 1 && (
                                <div className="relative h-10 md:h-14">
                                    <div
                                        ref={(el) => { connectorsRef.current[i] = el }}
                                        className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px origin-top"
                                        style={{
                                            background: `linear-gradient(to bottom, ${node.color}60, ${pipelineNodes[i + 1].color}60)`,
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Tech Stack Marquee */}
                <div className="tech-stack mt-24">
                    <h3 className="text-center text-[11px] tracking-[0.2em] uppercase font-mono text-[var(--muted-foreground)] mb-4">
                        Built With
                    </h3>
                    <Marquee speed={25} pauseOnHover>
                        {techStack.map((tech) => (
                            <div
                                key={tech.name}
                                className="tech-badge mx-3 px-5 py-2.5 rounded-full border border-[var(--border)] spotlight-card text-sm font-medium hover:border-[var(--primary)]/40 transition-all duration-300 cursor-default flex items-center gap-2.5 whitespace-nowrap"
                            >
                                <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: tech.color }}
                                />
                                {tech.name}
                            </div>
                        ))}
                    </Marquee>
                </div>
            </div>
        </section>
    )
}
