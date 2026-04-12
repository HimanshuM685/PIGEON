'use client';

import {
    Send,
    Wallet,
    History,
    Brain,
    KeyRound,
    PenTool,
    Smartphone,
    Blocks,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { FeatureCard } from '@/components/ui/grid-feature-cards'

const features = [
    {
        title: 'Send Crypto via SMS',
        icon: Send,
        description: 'Transfer ALGO and ASAs with a simple text message. No internet required.',
    },
    {
        title: 'Check Balance',
        icon: Wallet,
        description: 'Query your wallet balance anytime by texting "balance" to the service.',
    },
    {
        title: 'Transaction History',
        icon: History,
        description: 'Review past transactions and verify payment status via SMS.',
    },
    {
        title: 'AI Intent Classification',
        icon: Brain,
        description: 'Gemini AI parses natural language messages to understand user intent.',
    },
    {
        title: 'Encrypted Key Storage',
        icon: KeyRound,
        description: 'Wallet mnemonics are AES-encrypted with your password and stored securely on-chain.',
    },
    {
        title: 'Password-Signed Txns',
        icon: PenTool,
        description: 'Transactions are signed by decrypting your key with your password. No raw keys ever exposed.',
    },
    {
        title: 'Phone-Number Wallets',
        icon: Smartphone,
        description: 'Your phone number IS your wallet. No seed phrases to remember.',
    },
    {
        title: 'Algorand Network',
        icon: Blocks,
        description: 'Built on Algorand and solana for instant finality, low-cost transactions, and carbon-negative consensus.',
    },
]

export function Features() {
    return (
        <section id="features" className="relative z-10 py-32 md:py-48 px-6">
            <div className="mx-auto w-full max-w-7xl space-y-16">
                <AnimatedContainer className="mx-auto max-w-3xl text-center section-header flex flex-col items-center">
                    <span className="inline-block px-4 py-1.5 text-xs tracking-[0.3em] uppercase font-mono text-[var(--accent)] mb-6">
                        [ Features ]
                    </span>
                    <h2 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-[-0.05em] mb-8 leading-[0.9]">
                        Everything You Need<br />
                        <span className="text-[var(--primary)]">Nothing You Don't</span>
                    </h2>
                    <p className="text-[var(--muted-foreground)] text-base md:text-lg lg:text-xl leading-relaxed">
                        A complete crypto wallet experience delivered through the simplicity of SMS.
                    </p>
                </AnimatedContainer>

                <AnimatedContainer
                    delay={0.4}
                    className="grid grid-cols-1 divide-x divide-y border sm:grid-cols-2 lg:grid-cols-4 divide-white/10 border-white/10"
                >
                    {features.map((feature, i) => (
                        <FeatureCard key={i} feature={feature} />
                    ))}
                </AnimatedContainer>
            </div>
        </section>
    )
}

type ViewAnimationProps = {
    delay?: number
    className?: React.ComponentProps<typeof motion.div>['className']
    children: React.ReactNode
}

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
    const shouldReduceMotion = useReducedMotion()

    if (shouldReduceMotion) {
        return <div className={className}>{children}</div>
    }

    return (
        <motion.div
            initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
            whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay, duration: 0.8 }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
