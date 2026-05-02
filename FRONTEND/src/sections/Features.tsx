'use client';

import {
    Wallet, MessageCircle, Brain, KeyRound,
    Smartphone, Shield, SendHorizontal
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

const features = [
    { title: 'Send via SMS',        icon: MessageCircle,   description: 'Transfer ALGO and ASAs via text.', className: 'col-span-12 md:col-span-8 bg-dark-ink text-white p-12 md:p-20' },
    { title: 'Post-Quantum',        icon: Shield,     description: 'Quantum-resistant Falcon signatures.', className: 'col-span-12 md:col-span-4 bg-vibrant-yellow text-[var(--text)] p-12' },
    { title: 'AI Intent',           icon: Brain,      description: 'NLP parsing for SMS commands.', className: 'col-span-12 md:col-span-4 bg-[var(--bg-pink)] text-white p-12' },
    { title: 'Check Balance',       icon: Wallet,     description: 'Text "balance" anytime.', className: 'col-span-12 md:col-span-4 bg-white text-[var(--text)] p-12 border border-gray-200' },
    { title: 'Send via Telegram',   icon: SendHorizontal, description: 'Using Telegram bot.', className: 'col-span-12 md:col-span-4 bg-[var(--bg-blue)] text-white p-12' },
    { title: 'Encrypted Keys',      icon: KeyRound,   description: 'AES-encrypted mnemonics stored on-chain.', className: 'col-span-12 md:col-span-6 bg-dark-ink text-white p-12 md:p-20' },
    { title: 'Phone Wallets',       icon: Smartphone, description: 'Your number IS your wallet.', className: 'col-span-12 md:col-span-6 bg-[var(--bg-purple)] text-white p-12 md:p-20' },
]

export function Features() {
    return (
        <section id="features" className="relative z-10 w-full">
            {/* Boundless Asymmetric Grid */}
            <div className="grid grid-cols-12 gap-0 w-full">
                
                {/* Massive Header Block */}
                <div className="col-span-12 bg-white text-[var(--text)] px-8 py-32 md:py-48 flex flex-col items-center justify-center text-center border-b border-gray-200">
                    <motion.span 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ duration: 0.6 }}
                        className="mb-6 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-300 text-xs font-bold uppercase tracking-widest"
                    >
                        Core Capabilities
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="editorial-heading text-huge text-[var(--text)]"
                    >
                        EVERYTHING<br/>YOU NEED.
                    </motion.h2>
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] opacity-40 text-dark-ink"
                    >
                        Comprehensive Toolset for Modern Finance
                    </motion.span>
                </div>

                {/* Grid Blocks */}
                {features.map((feature, i) => (
                    <AnimatedBlock key={i} className={`flex flex-col justify-between ${feature.className}`}>
                        <div className="flex justify-between items-start mb-16">
                            <feature.icon className="w-12 h-12 md:w-16 md:h-16 opacity-80" strokeWidth={1.5} />
                            <span className="font-mono text-xs font-bold opacity-50 uppercase tracking-widest">0{i+1}</span>
                        </div>
                        <div>
                            <h3 className="editorial-heading text-4xl md:text-5xl mb-4 leading-none">{feature.title}</h3>
                            <p className="font-sans font-medium text-lg md:text-xl opacity-80 max-w-sm">{feature.description}</p>
                        </div>
                    </AnimatedBlock>
                ))}

            </div>
        </section>
    )
}

function AnimatedBlock({ className, children }: { className: string, children: React.ReactNode }) {
    const shouldReduceMotion = useReducedMotion()
    if (shouldReduceMotion) return <div className={className}>{children}</div>

    return (
        <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.8 }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
