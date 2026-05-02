import { CircularTestimonials } from '@/components/ui/circular-testimonials';

const testimonials = [
  {
    name: 'Real Ratnadwip',
    designation: 'PIGEON Founder',
    quote: "We're not just building a wallet, we're building the future of financial inclusion. PIGEON is designed to be accessible to anyone, anywhere.",
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
  },
  {
    name: 'Himanshu M.',
    designation: 'Lead Engineer',
    quote: "Integrating post-quantum Falcon signatures on Algorand through an SMS interface was challenging, but the result is a perfectly secure, seamless experience.",
    src: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1000&auto=format&fit=crop',
  },
];

export function Team() {
    return (
        <section id="team" className="relative z-10 w-full bg-[var(--bg-pink)] text-white">
            <div className="w-full px-8 py-32 md:py-48 flex flex-col items-center justify-center text-center">
                <span className="mb-6 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/30 text-xs font-bold uppercase tracking-widest bg-white/10 backdrop-blur-md">
                    The Team
                </span>
                <h2 className="editorial-heading text-huge text-white">
                    THE<br/>VISIONARIES.
                </h2>
                
                <div className="w-full mt-24">
                    <CircularTestimonials testimonials={testimonials} autoplay={false} />
                </div>
            </div>
        </section>
    )
}
