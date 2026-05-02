import { CircularTestimonials } from '@/components/ui/circular-testimonials';
import { motion } from 'motion/react';

const testimonials = [
  {
    name: 'Real Ratnadwip',
    designation: 'PIGEON Founder',
    quote: "We're not just building a wallet, we're building the future of financial inclusion. PIGEON is designed to be accessible to anyone, anywhere.",
    src: '/team/ratnadwip.jpg',
  },
  {
    name: 'Himanshu M.',
    designation: 'Lead Engineer',
    quote: "Integrating post-quantum Falcon signatures on Algorand through an SMS interface was challenging, but the result is a perfectly secure, seamless experience.",
    src: '/team/himanshu.jpg',
  },
  {
    name: 'Koushik Mondal',
    designation: 'Frontend Engineer',
    quote: "Designing a seamless and engaging user interface was critical. We wanted the experience to feel magical, blending advanced technology with intuitive design.",
    src: '/team/koushik.jpeg',
    objectPosition: 'top',
  },
];

export function Team() {
    return (
        <section id="team" className="relative z-10 w-full bg-[var(--bg-pink)] text-white">
            <div className="w-full px-8 py-32 md:py-48 flex flex-col items-center justify-center text-center">
                <motion.span 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.6 }}
                    className="mb-6 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/30 text-xs font-bold uppercase tracking-widest bg-white/10 backdrop-blur-md"
                >
                    The Team
                </motion.span>
                <motion.h2 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="editorial-heading text-huge text-white"
                >
                    THE<br/>VISIONARIES.
                </motion.h2>
                <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] opacity-40 text-white"
                >
                    Building the Future of P2P Payments
                </motion.span>
                
                <div className="w-full mt-24">
                    <CircularTestimonials testimonials={testimonials} autoplay={false} />
                </div>
            </div>
        </section>
    )
}
