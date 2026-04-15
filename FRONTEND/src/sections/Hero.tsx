import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { LiquidButton } from '@/components/ui/liquid-glass-button'

gsap.registerPlugin(ScrollTrigger)

export function Hero() {
    const headlineRef = useRef<HTMLHeadingElement>(null)
    const subtitleRef = useRef<HTMLParagraphElement>(null)
    const ctaRef = useRef<HTMLDivElement>(null)
    const badgeRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        tl.fromTo(badgeRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6 }
        )
            .fromTo(headlineRef.current,
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, duration: 0.8 },
                '-=0.3'
            )
            .fromTo(subtitleRef.current,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.7 },
                '-=0.4'
            )
            .fromTo(ctaRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6 },
                '-=0.3'
            )

        // Storytelling scroll transition (Fade and parallax out)
        // Storytelling scroll transition (Fade and parallax out)
        gsap.to(containerRef.current, {
            y: 150,
            opacity: 0,
            scale: 0.95,
            ease: 'none',
            scrollTrigger: {
                trigger: '#home',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            },
        })
    }, [])

    return (
        <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Content overlay */}
            <div className="relative z-10 w-full max-w-[95vw] mx-auto px-4 sm:px-6 text-center">
                <div ref={containerRef} className="py-20 md:py-40 flex flex-col items-center">
                    {/* Badge */}
                    <div ref={badgeRef} className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] glass">
                        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        </span>
                        <span className="text-xs text-green-400 font-mono">Building the Future of Payments</span>
                    </div>

                    {/* Headline */}
                    <h1
                        ref={headlineRef}
                        className="font-display mb-12 text-white text-center tracking-[-0.05em] leading-[0.9] uppercase"
                    >
                        <span className="block font-black text-[clamp(4rem,14vw,14rem)]">
                            Send Crypto
                        </span>
                        <span className="block font-light text-[var(--primary)] text-[clamp(3rem,10vw,10rem)] -mt-2 md:-mt-6">
                            Via SMS
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p
                        ref={subtitleRef}
                        className="font-sans text-[var(--muted-foreground)] text-center text-base md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed mb-6"
                    >
                        PIGEON lets anyone send and receive crypto on Algorand using simple text messages.
                        Powered by NVIDIA NIM AI intent parsing and encrypted wallet management.
                    </p>

                    {/* Status indicator */}
                    <div className="my-6 flex items-center justify-center gap-2">
                        <span className="relative flex h-3 w-3 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--primary)]"></span>
                        </span>
                        <p className="text-xs text-[var(--primary-light)] font-mono">Built on Algorand</p>
                    </div>

                    {/* CTA Buttons */}
                    <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                        <LiquidButton
                            className="text-white border border-[var(--primary)]/30 rounded-full"
                            size="xl"
                            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Explore PIGEON
                        </LiquidButton>
                        <a
                            href="https://github.com/HimanshuM685/PIGEON"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-3 rounded-full text-sm font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-white transition-all duration-300"
                        >
                            View on GitHub →
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}
