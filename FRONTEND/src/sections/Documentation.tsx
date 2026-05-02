import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export function Documentation() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => { setIsLoading(false); }, 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section id="docs" className="relative min-h-screen pt-32 pb-20 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto flex flex-col items-center">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <div className="w-12 h-12 flex items-center justify-center mb-4 bg-[rgba(69,39,118,0.08)] rounded-2xl">
                            <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
                        </div>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                            className="text-[var(--accent)] text-sm font-mono tracking-wider"
                        >
                            Loading Documentation...
                        </motion.p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="w-full text-left bg-white/90 p-6 md:p-10 rounded-3xl border border-[var(--border)] shadow-[var(--shadow-lg)] relative"
                    >

                        <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-[-0.03em] mb-8 text-[var(--text)]">
                            PIGEON <span className="text-[var(--accent)]">Docs</span>
                        </h1>

                        <div className="space-y-8 text-[var(--text-muted)]">
                            <DocSection title="Overview">
                                <p className="mb-4 leading-relaxed">
                                    <strong className="text-[var(--text)]">PIGEON</strong> is a decentralized mobile wallet platform that enables anyone to send
                                    crypto (ALGO on Algorand) over SMS and Telegram without downloading an app or using a browser
                                    extension. It combines AI-powered intent parsing with post-quantum cryptography to provide
                                    accessible, secure digital asset transfers.
                                </p>
                                <ul className="space-y-2">
                                    {[
                                        ['Send ALGO via SMS or Telegram', 'Users text commands to receive, store, and send Algorand tokens.'],
                                        ['No app required', 'Works on basic SMS and Telegram, accessible in emerging markets.'],
                                        ['AI intent parsing', 'Natural language commands interpreted via OpenRouter/Gemma AI.'],
                                        ['Post-quantum secure', 'Falcon lattice-based cryptography alongside BIP39 mnemonics.'],
                                    ].map(([title, desc]) => (
                                        <li key={title} className="flex gap-3 items-start">
                                            <span className="mt-1.5 w-2 h-2 flex-shrink-0 bg-[var(--primary)] rounded-full" />
                                            <span><strong className="text-[var(--text)]">{title}</strong> — {desc}</span>
                                        </li>
                                    ))}
                                </ul>
                            </DocSection>

                            <DocSection title="Architecture">
                                <p className="mb-3 leading-relaxed">
                                    <strong className="text-[var(--text)]">Telegram:</strong> User sends command → Telegram Bot → Intent parser → Identity resolver → Action executed → Response returned.
                                </p>
                                <p className="mb-3 leading-relaxed">
                                    <strong className="text-[var(--text)]">SMS:</strong> User sends SMS → Gateway webhook → Backend processes → Two-step verification → Response returned.
                                </p>
                                <p className="leading-relaxed">
                                    <strong className="text-[var(--text)]">On-Chain:</strong> Wallet data → Mnemonic encrypted with AES-256-GCM + PBKDF2 → Stored in Algorand smart contract → Referenced by phone number or Telegram user ID.
                                </p>
                            </DocSection>

                            <DocSection title="Smart Contracts">
                                <p className="leading-relaxed">
                                    The core on-chain registry stores encrypted wallet data indexed by identity. By design it stores only encrypted mnemonics, preventing plaintext exposure. Supports mapped lookups via an admin-gated architecture.
                                </p>
                            </DocSection>

                            <DocSection title="Post-Quantum Wallet Security">
                                <p className="mb-3 leading-relaxed">
                                    <strong className="text-[var(--text)]">Hybrid Approach:</strong> A BIP39 Mnemonic derives both standard Algorand addresses and Falcon post-quantum keypairs, ensuring compatibility with standard transfers while providing lattice-based quantum resistance.
                                </p>
                                <p className="leading-relaxed">
                                    <strong className="text-[var(--text)]">Encryption Pipeline:</strong> User passwords undergo PBKDF2 derivation (100,000 iterations, SHA-256) to create an encryption key. The mnemonic is encrypted via AES-256-GCM. Passwords are never stored.
                                </p>
                            </DocSection>
                        </div>
                    </motion.div>
                )}
            </div>
        </section>
    );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-[var(--text)] mb-4 pb-2 border-b border-[var(--border)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[var(--primary)] flex-shrink-0 rounded-full" />
                {title}
            </h2>
            {children}
        </div>
    );
}