import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function Hero() {
    const heroRef = useRef<HTMLElement>(null)
    const glassRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!heroRef.current) return;
        
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.fromTo('.hero-text-anim', 
            { y: '100%', opacity: 0, rotate: 5 }, 
            { y: '0%', opacity: 1, rotate: 0, duration: 1.2, stagger: 0.1 }
        );

        tl.fromTo(glassRef.current,
            { opacity: 0, scale: 0.95, y: 50 },
            { opacity: 1, scale: 1, y: 0, duration: 1 },
            '-=0.8'
        );

        gsap.to(heroRef.current.querySelector('.hero-bg-text'), {
            y: 200,
            opacity: 0,
            force3D: true,
            scrollTrigger: {
                trigger: heroRef.current,
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    }, [])

    return (
        <section
            id="home"
            ref={heroRef}
            className="relative min-h-screen flex items-end px-4 sm:px-8 pb-12 pt-32 overflow-hidden bg-vibrant-yellow"
        >
            {/* Massive Background Text Watermark */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full overflow-hidden pointer-events-none opacity-10 md:opacity-20 select-none flex will-change-transform transform-gpu">
                <span className="hero-bg-text font-display text-[20vw] md:text-[25vw] leading-[0.8] tracking-tighter whitespace-nowrap text-dark-ink will-change-transform transform-gpu">
                    PIGEON
                </span>
            </div>

            <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-end gap-12">
                
                {/* Massive Headline */}
                <div className="flex-1">
                    <h1 className="font-display flex flex-col uppercase tracking-tighter w-full">
                        <div className="overflow-hidden">
                            <span className="hero-text-anim block text-massive text-dark-ink will-change-transform transform-gpu">SEND</span>
                        </div>
                        <div className="overflow-hidden">
                            <span className="hero-text-anim block text-massive text-dark-ink will-change-transform transform-gpu md:ml-[10vw]">CRYPTO</span>
                        </div>
                        <div className="overflow-hidden">
                            <span className="hero-text-anim block text-massive text-dark-ink will-change-transform transform-gpu">VIA SMS.</span>
                        </div>
                    </h1>
                </div>

                {/* Rough Glass CTA Box */}
                <div 
                    ref={glassRef} 
                    className="w-full md:w-[400px] lg:w-[450px] flex-shrink-0 rough-glass p-8 flex flex-col gap-6"
                >
                    <div className="inline-flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dark-ink opacity-75"></span>
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-dark-ink"></span>
                        </span>
                        <span className="text-xs font-bold tracking-widest uppercase text-dark-ink">
                            Powered by Falcon
                        </span>
                    </div>

                    <p className="text-dark-ink font-medium text-lg leading-snug">
                        PIGEON brings the Algorand blockchain to any mobile device in the world, no internet required. Post-quantum secure.
                    </p>

                    <div className="flex flex-col gap-3 mt-4">
                        <button
                            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-editorial w-full"
                        >
                            Explore Platform
                        </button>
                        <a
                            href="https://github.com/HimanshuM685/PIGEON"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-editorial w-full bg-transparent border-2 border-[var(--text)] text-[var(--text)] hover:text-white"
                        >
                            GitHub
                        </a>
                    </div>
                </div>

            </div>
        </section>
    )
}
