import { Globe, Users, Zap } from 'lucide-react'
import { motion } from 'motion/react'


export function About() {
    return (
        <section id="about" className="relative z-10 w-full bg-white text-[var(--text)] border-b border-gray-200">
            {/* Header */}
            <div className="w-full px-8 py-32 md:py-48 flex flex-col items-center md:items-start justify-center text-center md:text-left">
                <motion.span 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.6 }}
                    className="mb-6 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-300 text-xs font-bold uppercase tracking-widest"
                >
                    The Mission
                </motion.span>
                <motion.h2 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="editorial-heading text-huge"
                >
                    EMPOWER<br/>EVERYONE.
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mt-12 text-xl md:text-3xl font-medium max-w-4xl leading-tight opacity-80"
                >
                    We believe financial access is a fundamental human right. PIGEON bridges the gap between advanced blockchain technology and basic mobile infrastructure.
                </motion.p>
            </div>

            {/* Asymmetric Info Grid */}
            <div className="grid grid-cols-12 w-full border-t border-gray-200">
                
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8 }}
                    className="col-span-12 md:col-span-4 p-12 md:p-24 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between h-full bg-vibrant-yellow text-[var(--text)]"
                >
                    <Globe className="w-16 h-16 opacity-80 mb-16" strokeWidth={1.5} />
                    <div>
                        <h3 className="editorial-heading text-4xl mb-4 leading-none">Global Reach</h3>
                        <p className="font-medium text-lg opacity-80">Accessible from any mobile phone, bridging the digital divide globally.</p>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="col-span-12 md:col-span-4 p-12 md:p-24 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between h-full bg-dark-ink text-white"
                >
                    <Zap className="w-16 h-16 opacity-80 mb-16" strokeWidth={1.5} />
                    <div>
                        <h3 className="editorial-heading text-4xl mb-4 leading-none">Instant Settles</h3>
                        <p className="font-medium text-lg opacity-80">Powered by Algorand for lightning-fast, final transactions in under 3 seconds.</p>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="col-span-12 md:col-span-4 p-12 md:p-24 flex flex-col justify-between h-full bg-white text-[var(--text)]"
                >
                    <Users className="w-16 h-16 opacity-80 mb-16" strokeWidth={1.5} />
                    <div>
                        <h3 className="editorial-heading text-4xl mb-4 leading-none">User First</h3>
                        <p className="font-medium text-lg opacity-80">No complex onboarding. No seed phrases. Just text and go.</p>
                    </div>
                </motion.div>

            </div>
        </section>
    )
}
