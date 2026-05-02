import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Github } from 'lucide-react'
import { CircularTestimonials } from '@/components/ui/circular-testimonials'

gsap.registerPlugin(ScrollTrigger)

const team = [
    {
        quote: 'Focused on building intuitive frontend interfaces and ensuring smooth user experiences through continuous testing and refinement.',
        name: 'Koushik Mondal',
        designation: 'Frontend Developer',
        src: '/team/koushik.jpg',
    },
    {
        quote: 'Leading system architecture, hardware design, and core development. Responsible for blockchain integration and smart contract engineering.',
        name: 'Himanshu Malik',
        designation: 'System Architect & Blockchain Engineer',
        src: '/team/himanshu.jpg',
    },
    {
        quote: 'Driving design, testing, and presentation workflows while contributing to idea generation and strategic brainstorming.',
        name: 'Ratnadwip Sarkar',
        designation: 'Design & Strategy Lead',
        src: '/team/ratnadwip.jpg',
    },
]

const githubLinks: Record<string, string> = {
    'Koushik Mondal':   'https://github.com/Koushikmondal06',
    'Himanshu Malik':   'https://github.com/HimanshuM685',
    'Ratnadwip Sarkar': 'https://github.com/RealRatnadwip',
}

export function Team() {
    const sectionRef = useRef<HTMLElement>(null)

    useEffect(() => {
        if (!sectionRef.current) return

        gsap.fromTo(sectionRef.current.querySelector('.section-header'),
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 1, ease: 'power3.out',
              scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', end: 'top 50%', scrub: 1 } }
        )

        gsap.fromTo(sectionRef.current.querySelector('.team-carousel'),
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 1, ease: 'power3.out',
              scrollTrigger: { trigger: sectionRef.current.querySelector('.team-carousel'), start: 'top 85%', end: 'top 55%', scrub: 1 } }
        )
    }, [])

    return (
        <section id="team" ref={sectionRef} className="relative z-10 py-32 md:py-48 px-4 sm:px-6">
            {/* Lilac background band */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(228,218,232,0.3) 50%, transparent 100%)' }} />

            <div className="max-w-6xl mx-auto relative">
                {/* Header */}
                <div className="section-header flex flex-col items-center text-center mb-16 md:mb-24">
                    <span className="candy-tag mb-6">[ The Team ]</span>
                    <h2 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold uppercase tracking-[-0.04em] mb-8 leading-[0.9] text-[var(--text)]">
                        Built By<br />
                        <span className="text-gradient-purple">Builders</span>
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-3xl text-base md:text-lg lg:text-xl leading-relaxed">
                        Three developers on a mission to make crypto accessible through the simplest interface — SMS.
                    </p>
                </div>

                {/* Circular Testimonials */}
                <div className="team-carousel flex items-center justify-center">
                    <CircularTestimonials
                        testimonials={team}
                        autoplay={true}
                        colors={{
                            name:               '#2D1B4E',
                            designation:        '#7A6B8A',
                            testimony:          '#452776',
                            arrowBackground:    '#FFFFFF',
                            arrowForeground:    '#452776',
                            arrowHoverBackground: '#FFDD7C',
                        }}
                        fontSizes={{
                            name:        '28px',
                            designation: '14px',
                            quote:       '17px',
                        }}
                    />
                </div>

                {/* GitHub Links */}
                <div className="flex flex-wrap justify-center gap-3 mt-12">
                    {team.map((member) => (
                        <a
                            key={member.name}
                            href={githubLinks[member.name]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--border)] bg-white/70 text-sm font-medium text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-white transition-all duration-300 shadow-[var(--shadow-sm)]"
                        >
                            <Github size={14} />
                            {member.name}
                        </a>
                    ))}
                </div>

                {/* Project Link */}
                <div className="text-center mt-6">
                    <a
                        href="https://github.com/HimanshuM685/PIGEON"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-7 py-3.5 border border-[var(--border-strong)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all duration-300 text-sm font-semibold shadow-[var(--shadow-sm)]"
                    >
                        <Github size={15} />
                        View Project on GitHub
                    </a>
                </div>
            </div>
        </section>
    )
}
