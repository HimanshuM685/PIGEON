import { CircularTestimonials } from '@/components/ui/circular-testimonials';
import { motion } from 'motion/react';

const testimonials = [
  {
    name: 'Himanshu Malik',
    designation: 'Lead Engineer & Architect',
    quote: "Designed and implemented the core blockchain integration, including smart contract development and system architecture.",
    src: '/team/himanshu.jpg',
    socials: {
      github: 'https://github.com/HimanshuM685',
      twitter: 'https://x.com/HimanshuM685',
      website: 'https://himanshum.com/',
      email: 'mailto:hello@himanshum.com',
    },
  },
  {
    name: 'Koushik Mondal',
    designation: 'Frontend Developer',
    quote: "Developed the user interface, focusing on performance, responsiveness, and seamless user experience.",
    src: '/team/koushik.jpg',
    objectPosition: 'top',
    socials: {
      github: 'https://github.com/Koushikmondal06',
      twitter: 'https://x.com/Koushikmondal69',
      website: 'https://002014.xyz/',
      email: 'mailto:koushik@002014.xyz',
    },
  },
  {
    name: 'Ratnadwip Sarkar',
    designation: 'Design & Strategy',
    quote: "Led product design and strategic direction, shaping user experience and overall system vision.",
    src: '/team/ratnadwip.jpg',
    socials: {
      github: 'https://github.com/RealRatnadwip',
      twitter: 'https://x.com/useridwas_taken',
      website: 'https://002014.xyz/',
      email: 'mailto:me@ratnadwip.com',
    },
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
