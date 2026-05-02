import { Network, Smartphone, Server, Database, Shield } from 'lucide-react'
import { motion } from 'motion/react'

const nodes = [
    { id: 'user', icon: Smartphone, label: 'User Device', desc: 'Basic SMS capable phone', accent: 'var(--bg-yellow)', tag: 'Client' },
    { id: 'twilio', icon: Network, label: 'Twilio Gateway', desc: 'Receives SMS & forwards to webhook', accent: 'var(--bg-pink)', tag: 'Ingress' },
    { id: 'parser', icon: Server, label: 'Intent Parser', desc: 'NLP extracts intent & parameters', accent: 'var(--bg-purple)', tag: 'Processing' },
    { id: 'wallet', icon: Database, label: 'Key Manager', desc: 'Decrypts mnemonic & signs txn locally', accent: 'var(--bg-blue)', tag: 'Security' },
    { id: 'algo', icon: Shield, label: 'Algorand Node', desc: 'Broadcasts Falcon-signed txn', accent: 'var(--bg-yellow)', tag: 'Consensus' },
]

export function Architecture() {
    return (
        <section id="architecture" className="w-full bg-dark-ink text-white relative border-t border-white/10">
            {/* Header */}
            <div className="w-full px-8 py-32 md:py-48 flex flex-col items-center justify-center text-center border-b border-white/10 overflow-hidden">
                <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.6 }}
                    className="mb-6 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/30 text-xs font-bold uppercase tracking-widest text-white/80"
                >
                    System Design
                </motion.span>
                <motion.h2
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="editorial-heading text-[11.3vw] leading-none whitespace-nowrap"
                >
                    ARCHITECTURE
                </motion.h2>
                <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] opacity-40 text-white"
                >
                    Post-Quantum Secure Distributed Network
                </motion.span>
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mt-12 text-xl md:text-3xl font-medium max-w-3xl leading-tight opacity-80 text-white"
                >
                    A seamless pipeline from SMS ingress to on-chain execution, designed for extreme accessibility and post-quantum security.
                </motion.p>
            </div>

            {/* Boundless Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 w-full">
                {nodes.map((node, i) => (
                    <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className={`col-span-1 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center text-center p-8 md:p-16 transition-colors duration-500 hover:bg-white/5`}
                    >
                        <div
                            className="w-24 h-24 mb-10 flex items-center justify-center rounded-full text-dark-ink"
                            style={{ backgroundColor: node.accent }}
                        >
                            <node.icon size={40} strokeWidth={1.5} />
                        </div>
                        <span className="font-mono text-xs font-bold uppercase tracking-widest opacity-60 mb-4">{node.tag}</span>
                        <h3 className="editorial-heading text-3xl mb-4 leading-none text-white">{node.label}</h3>
                        <p className="font-medium text-lg opacity-80 text-white/70">{node.desc}</p>
                    </motion.div>
                ))}
            </div>

            {/* Massive Bottom Text */}
            <div className="w-full overflow-hidden pointer-events-none opacity-5 select-none flex py-12 will-change-transform transform-gpu">
                <span className="font-display text-[7vw] md:text-[9.8vw] leading-[0.8] tracking-tighter whitespace-nowrap text-white will-change-transform transform-gpu">
                    SYSTEM OVERVIEW
                </span>
            </div>
        </section>
    )
}
