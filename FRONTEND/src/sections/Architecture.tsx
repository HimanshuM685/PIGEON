import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Marquee } from '@/components/ui/marquee'
import { MessageSquare, Radio, Brain, Phone, GitFork, Lock, Link2, CheckCircle } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const pipelineNodes = [
    { icon: MessageSquare, title: 'SMS Message',               description: 'User sends a text command from any phone',                                                   accent: 'var(--bg-blue)', tag: 'INPUT'      },
    { icon: Radio,         title: 'ESP32 + SIM800L / httpSMS', description: 'Hardware GSM module or cloud SMS gateway receives the message',                              accent: 'var(--bg-green)',      tag: 'GATEWAY'    },
    { icon: Brain,         title: 'Intent Parser (Gemma 7B)',  description: 'Parser extracts intent, amount, recipient, and parameters',                                  accent: 'var(--bg-yellow)', tag: 'PARSER'     },
    { icon: Phone,         title: 'Phone Validation',          description: 'Sender phone is matched to an on-chain wallet record',                                       accent: 'var(--bg-pink)', tag: 'IDENTITY'   },
    { icon: GitFork,       title: 'Intent Router',             description: 'Routes to onboard, send, balance, fund, address, or txn handler',                           accent: 'var(--bg-red)',      tag: 'ROUTING'    },
    { icon: Lock,          title: 'Wallet Decrypt & Sign',     description: 'AES-encrypted mnemonic is decrypted with user password, transaction signed via algosdk',    accent: 'var(--bg-blue)', tag: 'CRYPTO'     },
    { icon: Link2,         title: 'Algorand Testnet',          description: 'Signed transaction is broadcast and confirmed on-chain',                                     accent: 'var(--bg-green)', tag: 'BLOCKCHAIN' },
    { icon: CheckCircle,   title: 'SMS Confirmation',          description: 'Transaction result is sent back to the user via SMS',                                        accent: 'var(--bg-yellow)',      tag: 'OUTPUT'     },
]

const techStack = [
    { name: 'Node.js' }, { name: 'TypeScript' }, { name: 'Algorand' },
    { name: 'AlgoKit' }, { name: 'Intent Engine' }, { name: 'algosdk' },
    { name: 'Puya TS' }, { name: 'Express' },
]

export function Architecture() {
    const sectionRef    = useRef<HTMLElement>(null)
    const nodesRef      = useRef<(HTMLDivElement | null)[]>([])
    const connectorsRef = useRef<(HTMLDivElement | null)[]>([])
    const pulseRef      = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sectionRef.current) return
        const ctx = gsap.context(() => {
            gsap.fromTo('.arch-header', { opacity: 0, y: 60 }, {
                opacity: 1, y: 0, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', end: 'top 50%', scrub: 1 },
            })

            nodesRef.current.forEach((node, i) => {
                if (!node) return
                gsap.fromTo(node, { opacity: 0, x: i % 2 === 0 ? -60 : 60, scale: 0.9 }, {
                    opacity: 1, x: 0, scale: 1, duration: 0.8, ease: 'power3.out',
                    scrollTrigger: { trigger: node, start: 'top 90%', end: 'top 65%', scrub: 1 },
                })
            })

            connectorsRef.current.forEach((line) => {
                if (!line) return
                gsap.fromTo(line, { scaleY: 0 }, {
                    scaleY: 1, ease: 'none',
                    scrollTrigger: { trigger: line, start: 'top 90%', end: 'bottom 70%', scrub: 1 },
                })
            })

            if (pulseRef.current) {
                const pipeline = sectionRef.current?.querySelector('.pipeline-container')
                if (pipeline) {
                    gsap.fromTo(pulseRef.current, { top: '0%' }, {
                        top: '100%', ease: 'none',
                        scrollTrigger: { trigger: pipeline, start: 'top 60%', end: 'bottom 40%', scrub: 1.5 },
                    })
                }
            }

            const techStackEl = sectionRef.current?.querySelector('.tech-stack')
            sectionRef.current?.querySelectorAll('.tech-badge')?.forEach((badge, i) => {
                gsap.fromTo(badge, { opacity: 0, y: 20, scale: 0.8 }, {
                    opacity: 1, y: 0, scale: 1, duration: 0.5, delay: i * 0.06, ease: 'back.out(1.5)',
                    scrollTrigger: { trigger: techStackEl, start: 'top 85%', end: 'top 65%', scrub: 1 },
                })
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    return (
        <section id="architecture" ref={sectionRef} className="relative z-10 py-32 md:py-48 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="arch-header flex flex-col items-center text-center mb-20 md:mb-24">
                    <span className="candy-tag candy-tag-yellow mb-6">Architecture</span>
                    <h2 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold uppercase tracking-[-0.04em] mb-8 leading-[0.9] text-[var(--text)]">
                        System<br />
                        <span className="text-[var(--bg-red)] text-stroke">Design</span>
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-3xl text-base md:text-lg lg:text-xl leading-relaxed">
                        A robust pipeline from SMS to blockchain, powered by intent engine and encrypted wallet management.
                    </p>
                </div>

                {/* Pipeline */}
                <div className="pipeline-container relative">
                    {/* Traveling pulse */}
                    <div ref={pulseRef} className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none" style={{ top: '0%' }}>
                        <div className="relative">
                            <div className="w-3 h-3 bg-[var(--primary)] animate-pulse"
                                style={{ borderRadius: 'var(--radius-pill)', boxShadow: 'var(--glow-yellow)' }} />
                        </div>
                    </div>

                    {/* Track */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-[var(--border-mid)]" />

                    {pipelineNodes.map((node, i) => (
                        <div key={node.title}>
                            <div ref={(el) => { nodesRef.current[i] = el }} className="relative flex items-center gap-6 md:gap-10">
                                {/* Center dot */}
                                <div className="absolute left-1/2 -translate-x-1/2 z-20">
                                    <div
                                        className="w-3 h-3 border-2 border-white shadow-[var(--shadow-sm)]"
                                        style={{ backgroundColor: node.accent, borderRadius: 'var(--radius-pill)' }}
                                    />
                                </div>

                                {/* Card */}
                                <div className={`w-full md:w-[calc(50%-2rem)] ${i % 2 === 0 ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'} pl-8 md:pl-0`}>
                                    <div
                                        className="group spotlight-card p-4 md:p-5 transition-all duration-300"
                                        onMouseMove={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect()
                                            e.currentTarget.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`)
                                            e.currentTarget.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`)
                                            e.currentTarget.style.setProperty('--spotlight-color', 'rgba(69,39,118,0.04)')
                                        }}
                                    >
                                        <div className={`flex items-start gap-3 ${i % 2 === 0 ? 'md:flex-row-reverse md:text-right' : ''}`}>
                                            {/* Icon */}
                                            <div
                                                className="flex-shrink-0 w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 border-2 border-[var(--border)]"
                                                style={{ backgroundColor: node.accent, color: 'var(--text)', borderRadius: 'var(--radius-pill)' }}
                                            >
                                                <node.icon size={16} />
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className={`flex items-center gap-2 mb-1 ${i % 2 === 0 ? 'md:justify-end' : ''}`}>
                                                    <span
                                                        className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase px-2 py-0.5 border-2 border-[var(--border)] rounded-full"
                                                        style={{ backgroundColor: node.accent, color: 'var(--text)' }}
                                                    >
                                                        {node.tag}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-semibold text-[var(--text)] mb-0.5">{node.title}</h3>
                                                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{node.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Connector */}
                            {i < pipelineNodes.length - 1 && (
                                <div className="relative h-10 md:h-12">
                                    <div
                                        ref={(el) => { connectorsRef.current[i] = el }}
                                        className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px origin-top"
                                        style={{ background: `linear-gradient(to bottom, ${node.accent}, ${pipelineNodes[i + 1].accent})` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Tech Stack */}
                <div className="tech-stack mt-24">
                    <h3 className="text-center text-[10px] tracking-[0.25em] uppercase font-mono text-[var(--text-muted)] mb-6">Built With</h3>
                    <Marquee speed={25} pauseOnHover>
                        {techStack.map((tech) => (
                            <div
                                key={tech.name}
                                className="tech-badge mx-3 px-5 py-2 border-2 border-[var(--border)] bg-white text-sm font-bold uppercase tracking-widest text-[var(--text)] hover:bg-[var(--bg-yellow)] transition-all duration-300 cursor-default flex items-center gap-2.5 whitespace-nowrap brutal-shadow-hover rounded-full"
                            >
                                <div className="w-2 h-2 flex-shrink-0 bg-[var(--bg-red)] border border-[var(--border)]"
                                    style={{ borderRadius: 'var(--radius-pill)' }} />
                                {tech.name}
                            </div>
                        ))}
                    </Marquee>
                </div>
            </div>
        </section>
    )
}
