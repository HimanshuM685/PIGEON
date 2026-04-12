import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Github } from 'lucide-react'
import { CircularTestimonials } from '@/components/ui/circular-testimonials'

gsap.registerPlugin(ScrollTrigger)

const team = [
    {
        quote: 'Building the bridge between SMS and blockchain. Passionate about decentralized systems and making crypto accessible to everyone.',
        name: 'Koushik Mondal',
        designation: 'Full Stack Developer',
        src: '/team/koushik.jpg',
    },
    {
        quote: 'Designing secure cryptographic protocols and scalable backend systems. Driven by the vision of financial inclusion through technology.',
        name: 'Himanshu Malik',
        designation: 'Full Stack Developer',
        src: '/team/himanshu.jpg',
    },
    {
        quote: 'Crafting seamless user experiences and robust backend systems. Passionate about building decentralized solutions that empower everyday users.',
        name: 'Ratnadwip Sarkar',
        designation: 'Full Stack Developer',
        src: '/team/ratnadwip.jpg',
    },
]

const githubLinks: Record<string, string> = {
    'Koushik Mondal': 'https://github.com/Koushikmondal06',
    'Himanshu Malik': 'https://github.com/himanshumalik552',
    'Ratnadwip Sarkar': 'https://github.com/RealRatnadwip',
}

export function Team() {
    const sectionRef = useRef<HTMLElement>(null)

    useEffect(() => {
        if (!sectionRef.current) return

        gsap.fromTo(
            sectionRef.current.querySelector('.section-header'),
            { opacity: 0, y: 60 },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 80%',
                    end: 'top 50%',
                    scrub: 1,
                },
            }
        )

        gsap.fromTo(
            sectionRef.current.querySelector('.team-carousel'),
            { opacity: 0, y: 60 },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: sectionRef.current.querySelector('.team-carousel'),
                    start: 'top 85%',
                    end: 'top 55%',
                    scrub: 1,
                },
            }
        )
    }, [])

    return (
        <section id="team" ref={sectionRef} className="relative z-10 py-32 md:py-48 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="section-header flex flex-col items-center text-center mb-16 md:mb-24">
                    <span className="inline-block px-4 py-1.5 text-xs tracking-[0.3em] uppercase font-mono text-[var(--primary)] mb-6">
                        [ The Team ]
                    </span>
                    <h2 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-[-0.05em] mb-8 leading-[0.9]">
                        Built By<br />
                        <span className="text-[var(--primary)]">Builders</span>
                    </h2>
                    <p className="text-[var(--muted-foreground)] max-w-3xl text-base md:text-lg lg:text-xl leading-relaxed">
                        Three developers on a mission to make crypto accessible through the simplest interface — SMS.
                    </p>
                </div>

                {/* Circular Testimonials Carousel */}
                <div className="team-carousel flex items-center justify-center">
                    <CircularTestimonials
                        testimonials={team}
                        autoplay={true}
                        colors={{
                            name: '#f7f7ff',
                            designation: '#94A3B8',
                            testimony: '#CBD5E1',
                            arrowBackground: '#1E293B',
                            arrowForeground: '#f1f1f7',
                            arrowHoverBackground: 'var(--primary)',
                        }}
                        fontSizes={{
                            name: '28px',
                            designation: '14px',
                            quote: '17px',
                        }}
                    />
                </div>

                {/* GitHub Links */}
                <div className="flex flex-wrap justify-center gap-4 mt-12">
                    {team.map((member) => (
                        <a
                            key={member.name}
                            href={githubLinks[member.name]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] spotlight-card text-sm font-medium hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-300"
                        >
                            <Github size={16} />
                            {member.name}
                        </a>
                    ))}
                </div>

                {/* Project Link */}
                <div className="text-center mt-10">
                    <a
                        href="https://github.com/Koushikmondal06/PIGEON"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-[var(--border)] spotlight-card text-sm font-medium hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-300"
                    >
                        <Github size={16} />
                        View Project on GitHub
                    </a>
                </div>
            </div>
        </section>
    )
}
