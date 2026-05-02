import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MessageSquare, Brain, Shield, Radio, CheckCircle } from 'lucide-react'
import { motion } from 'motion/react'

gsap.registerPlugin(ScrollTrigger)

const steps = [
    { icon: MessageSquare, number: '01', title: 'User Sends SMS', description: '"Send 30 ALGO to 99XXXXXXXX"', bg: 'bg-dark-ink', text: 'text-white' },
    { icon: Brain, number: '02', title: 'AI Parses Intent', description: 'Intent parser extracts: intent=send, amount=30, asset=ALGO, to=99XXXXXXXX', bg: 'bg-vibrant-yellow', text: 'text-[var(--text)]' },
    { icon: Shield, number: '03', title: 'Decrypt & Sign', description: 'Your wallet mnemonic is decrypted with your password and the transaction is signed locally.', bg: 'bg-[var(--bg-pink)]', text: 'text-white' },
    { icon: Radio, number: '04', title: 'Broadcast', description: 'Signed transaction is broadcast to Algorand for execution.', bg: 'bg-[var(--bg-purple)]', text: 'text-white' },
    { icon: CheckCircle, number: '05', title: 'SMS Confirmation', description: 'User receives an SMS with the transaction hash and status.', bg: 'bg-white', text: 'text-[var(--text)]' },
]

export function HowItWorks() {
    const containerRef = useRef<HTMLElement>(null)

    return (
        <section id="how-it-works" ref={containerRef} className="relative w-full z-20">
            {/* Header */}
            <div className="w-full bg-[var(--bg)] text-[var(--text)] px-8 py-32 md:py-48 flex flex-col items-center justify-center text-center border-b border-gray-200">
                <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.6 }}
                    className="mb-6 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-300 text-xs font-bold uppercase tracking-widest"
                >
                    The Pipeline
                </motion.span>
                <motion.h2
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="editorial-heading text-huge"
                >
                    HOW IT<br />WORKS.
                </motion.h2>
                <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] opacity-40"
                >
                    From SMS Ingress to On-Chain Settlement
                </motion.span>
            </div>

            {/* Overlapping Sticky Steps */}
            <div className="relative">
                {steps.map((step, i) => (
                    <div
                        key={step.number}
                        className={`sticky top-0 w-full min-h-screen flex items-center justify-center overflow-hidden ${step.bg} ${step.text} border-t border-black/10 will-change-transform transform-gpu`}
                        style={{ zIndex: i + 1 }}
                    >
                        {/* Massive Background Number */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] md:opacity-[0.05] select-none flex will-change-transform transform-gpu">
                            <span className="font-display text-[30vw] md:text-[50vw] leading-none tracking-tighter">
                                {step.number}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 py-24 flex flex-col md:flex-row items-start md:items-center justify-between gap-12">
                            <div className="flex-1">
                                <div className="flex items-center gap-6 mb-8">
                                    <step.icon className="w-16 h-16 md:w-24 md:h-24 opacity-80" strokeWidth={1} />
                                    <span className="font-mono text-3xl font-bold opacity-50 uppercase tracking-widest">{step.number}</span>
                                </div>
                                <h3 className="editorial-heading text-5xl md:text-7xl lg:text-8xl mb-6 leading-[0.9]">
                                    {step.title}
                                </h3>
                                <p className="font-sans font-medium text-xl md:text-3xl opacity-90 max-w-2xl leading-tight">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
