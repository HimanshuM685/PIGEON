import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export function Documentation() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate a loading time for the documentation data
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section id="docs" className="relative min-h-screen pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto flex flex-col items-center">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin mb-4" />
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                            className="text-[var(--accent)] text-lg"
                        >
                            Loading Documentation...
                        </motion.p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="w-full text-left bg-black/40 backdrop-blur-md p-8 md:p-12 rounded-2xl border border-[var(--border)] glow-effect prose prose-invert max-w-none"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-white">
                            PIGEON <span className="text-[var(--primary)]">Documentation</span>
                        </h1>
                        
                        <div className="space-y-8 text-gray-300">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4 border-b border-[var(--border)] pb-2">Overview</h2>
                                <p className="mb-4">
                                    <strong>PIGEON</strong> is a decentralized mobile wallet platform that enables anyone to send crypto (ALGO on Algorand) over SMS and Telegram without downloading an app or using a browser extension. It combines AI-powered intent parsing with post-quantum cryptography to provide accessible, secure digital asset transfers through messaging platforms.
                                </p>
                                <p className="mb-4">
                                    PIGEON democratizes crypto access by removing barriers to entry:
                                </p>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li><strong>Send ALGO via SMS or Telegram</strong> — Users text commands to receive, store, and send Algorand tokens.</li>
                                    <li><strong>No app required</strong> — Works on basic SMS and Telegram, making it accessible in emerging markets.</li>
                                    <li><strong>AI intent parsing</strong> — Natural language commands are interpreted via OpenRouter/Gemma AI.</li>
                                    <li><strong>Post-quantum secure</strong> — Uses Falcon lattice-based cryptography alongside BIP39 mnemonics for quantum resistance.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4 border-b border-[var(--border)] pb-2">Architecture</h2>
                                <h3 className="text-xl font-semibold text-white mt-4 mb-2">Communication Flow</h3>
                                <p className="mb-2"><strong>Telegram:</strong> User sends command &rarr; Telegram Bot &rarr; Intent parser extracts action &rarr; Identity resolver finds recipient &rarr; Action executed &rarr; Response returned.</p>
                                <p className="mb-4"><strong>SMS:</strong> User sends SMS &rarr; Gateway webhook &rarr; Backend processes &rarr; Two-step verification &rarr; Response returned.</p>
                                <h3 className="text-xl font-semibold text-white mt-4 mb-2">On-Chain Persistence</h3>
                                <p className="mb-4">Wallet data created &rarr; Mnemonic encrypted with AES-256-GCM + PBKDF2 &rarr; Stored in Algorand smart contract (ContractPigeon) &rarr; Referenced by phone number or Telegram user ID.</p>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4 border-b border-[var(--border)] pb-2">Smart Contracts</h2>
                                <p className="mb-4">The core on-chain registry stores encrypted wallet data indexed by identity (phone number or Telegram ID). By key design, it stores only encrypted mnemonics, preventing plaintext exposure and minimizing on-chain footprint. It supports mapped lookups via an admin-gated architecture.</p>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4 border-b border-[var(--border)] pb-2">Post-Quantum Wallet Security</h2>
                                <h3 className="text-xl font-semibold text-white mt-4 mb-2">Hybrid Approach</h3>
                                <p className="mb-4">A BIP39 Mnemonic derives both standard Algorand addresses and Falcon post-quantum keypairs. This ensures compatibility with standard transfers while providing lattice-based, NIST-standardized quantum resistance via Falcon signatures.</p>
                                <h3 className="text-xl font-semibold text-white mt-4 mb-2">Encryption Pipeline</h3>
                                <p className="mb-4">User passwords undergo PBKDF2 derivation (100,000 iterations, SHA-256) to create an encryption key. The mnemonic is then encrypted via AES-256-GCM. Passwords are never stored; decryption happens entirely on demand during sensitive operations.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </section>
    );
}