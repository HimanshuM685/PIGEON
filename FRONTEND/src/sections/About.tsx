'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { Smartphone, Shield, Brain } from 'lucide-react'
import { GlareCard } from '@/components/ui/glare-card'

const cards = [
    {
        icon: Smartphone,
        title: 'SMS-Based',
        description: 'No smartphone app needed. Send and receive crypto with any phone capable of SMS. True financial inclusion.',
        color: '#06B6D4',
        // Animation config for individual fan cards map to [scroll start, scroll end]
        yInput: [0, 1],
        yOutput: [150, 20],
        rotateOutput: [0, -12],
        xOutput: [0, -340],
        zIndex: 1,
    },
    {
        icon: Shield,
        title: 'Encrypted Wallets',
        description: 'Your wallet mnemonic is encrypted with your password and stored on-chain. No one else can access your funds.',
        color: '#8B5CF6',
        yInput: [0, 1],
        yOutput: [150, -20],
        rotateOutput: [0, 0],
        xOutput: [0, 0],
        zIndex: 2,
    },
    {
        icon: Brain,
        title: 'AI-Powered',
        description: 'Natural language intent parsing via Gemini AI. Just text "send 30 ALGO to 9912345678" and it works.',
        color: '#10B981',
        yInput: [0, 1],
        yOutput: [150, 20],
        rotateOutput: [0, 12],
        xOutput: [0, 340],
        zIndex: 1,
    },
]

export function About() {
    const sectionRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Framer Motion scroll tracking.
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        // Trigger from when the top of the section enters the bottom of the viewport ('start end')
        // up to when the bottom of the section hits the top of the viewport ('end start')
        offset: ['start end', 'end start'],
    })

    // Header scrub animation
    const headerOpacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 1])
    const headerY = useTransform(scrollYProgress, [0.1, 0.3], [60, 0])

    return (
        <section id="about" ref={sectionRef} className="relative z-10 py-32 md:py-48 px-6 min-h-[120vh]">
            <div className="max-w-7xl mx-auto h-full flex flex-col justify-start">

                {/* Section Header */}
                <motion.div
                    style={{ opacity: headerOpacity, y: headerY }}
                    className="section-header flex flex-col items-center text-center mb-16 relative"
                >
                    <span className="inline-block px-4 py-1.5 text-xs tracking-[0.3em] uppercase font-mono text-[var(--primary)] mb-6">
                        [ What Is PIGEON ]
                    </span>
                    <h2 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-[-0.05em] mb-8 leading-[0.9]">
                        Crypto For<br />
                        <span className="text-[var(--primary)]">Everyone</span>
                    </h2>
                    <p className="text-[var(--muted-foreground)] max-w-3xl text-base md:text-lg lg:text-xl leading-relaxed">
                        PIGEON bridges the gap between traditional SMS and blockchain technology,
                        making cryptocurrency accessible to billions without internet access.
                    </p>
                </motion.div>

                {/* Sticky Container for the Cards */}
                <div className="relative w-full h-[600px] flex items-center justify-center top-20">
                    <div
                        ref={containerRef}
                        className="cards-grid sticky top-1/2 -translate-y-1/2 flex justify-center items-center h-[500px] w-full max-w-5xl mx-auto"
                    >
                        {cards.map((card, _i) => {
                            // eslint-disable-next-line react-hooks/rules-of-hooks
                            const y = useTransform(scrollYProgress, [0.1, 0.4], [card.yOutput[0], card.yOutput[1]])
                            // eslint-disable-next-line react-hooks/rules-of-hooks
                            const rotate = useTransform(scrollYProgress, [0.1, 0.4], [0, card.rotateOutput[1]])
                            // eslint-disable-next-line react-hooks/rules-of-hooks
                            const x = useTransform(scrollYProgress, [0.1, 0.4], [0, card.xOutput[1]])
                            // eslint-disable-next-line react-hooks/rules-of-hooks
                            const opacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 1])

                            return (
                                <motion.div
                                    key={card.title}
                                    style={{
                                        y,
                                        rotate,
                                        x,
                                        opacity,
                                        zIndex: card.zIndex,
                                    }}
                                    className="absolute origin-bottom transition-all duration-300 ease-out hover:z-50 hover:scale-105"
                                >
                                    <GlareCard className="flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0a] border border-white/10 w-[300px] h-[400px]">
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                                            style={{
                                                backgroundColor: `${card.color}15`,
                                                color: card.color,
                                                boxShadow: `0 0 20px ${card.color}20`,
                                            }}
                                        >
                                            <card.icon size={30} />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 text-white">{card.title}</h3>
                                        <p className="text-sm text-neutral-400 leading-relaxed max-w-[250px]">
                                            {card.description}
                                        </p>
                                    </GlareCard>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}
