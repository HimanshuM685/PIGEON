'use client'

import { motion } from 'motion/react'

const cards = [
    {
        title: 'SMS-Based',
        description: 'No smartphone app needed. Send and receive crypto with any phone capable of SMS. True financial inclusion.',
        color: 'var(--text)',
        bg: 'var(--bg-blue)',
        emoji: '📱',
        rotation: -3,
    },
    {
        title: 'Encrypted Wallets',
        description: 'Your wallet mnemonic is encrypted with your password and stored on-chain. No one else can access your funds.',
        color: 'var(--text)',
        bg: 'var(--bg-green)',
        emoji: '🔐',
        rotation: 2,
    },
    {
        title: 'AI-Powered',
        description: 'Natural language intent parsing via intent engine + Falcon post-quantum cryptography. Just text "send 30 ALGO to 9912345678" and it works.',
        color: 'var(--text)',
        bg: 'var(--bg-red)',
        emoji: '🤖',
        rotation: -2,
    },
]

export function About() {
    return (
        <section id="about" className="relative z-10 py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center text-center mb-16 md:mb-24"
                >
                    <span className="candy-tag candy-tag-yellow mb-5">✨ What Is PIGEON</span>
                    <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight text-[var(--text)]">
                        Crypto For{' '}
                        <span className="text-[var(--bg-red)] text-stroke">Everyone</span>
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-2xl text-base md:text-lg leading-relaxed">
                        PIGEON bridges the gap between traditional SMS and blockchain technology,
                        making cryptocurrency accessible to billions without internet access.
                    </p>
                </motion.div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
                    {cards.map((card, i) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: i * 0.15 }}
                            whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                            className="relative group"
                        >
                            <div
                                className="candy-card h-full p-8 flex flex-col items-center text-center transition-all duration-300 border-2 border-[var(--border)] brutal-shadow"
                                style={{
                                    transform: `rotate(${card.rotation}deg)`,
                                    backgroundColor: 'white'
                                }}
                            >
                                {/* Icon circle */}
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl shadow-[2px_2px_0px_#111111] border-2 border-[var(--border)]"
                                    style={{ backgroundColor: card.bg }}
                                >
                                    {card.emoji}
                                </div>
                                <h3 className="text-xl font-display font-extrabold mb-3 uppercase tracking-widest text-[var(--text)]">
                                    {card.title}
                                </h3>
                                <p className="text-[var(--text-muted)] leading-relaxed">
                                    {card.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    )
}
