import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function Hero() {
    const headlineRef  = useRef<HTMLHeadingElement>(null)
    const subtitleRef  = useRef<HTMLParagraphElement>(null)
    const ctaRef       = useRef<HTMLDivElement>(null)
    const badgeRef     = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.fromTo(badgeRef.current,    { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 })
          .fromTo(headlineRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.3')
          .fromTo(subtitleRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.4')
          .fromTo(ctaRef.current,      { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')

        gsap.to(containerRef.current, {
            y: 120, opacity: 0, scale: 0.97, ease: 'none',
            scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true },
        })
    }, [])

    return (
        <section
            id="home"
            className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6"
        >
            {/* Decorative background shapes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Large soft purple blob — top left */}
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, var(--accent-light) 0%, transparent 70%)' }} />
                {/* Yellow blob — bottom right */}
                <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full opacity-25"
                    style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }} />
                {/* Blush blob — center right */}
                <div className="absolute top-1/2 right-[5%] w-[300px] h-[300px] rounded-full opacity-30"
                    style={{ background: 'radial-gradient(circle, var(--accent-blush) 0%, transparent 70%)' }} />

                {/* Subtle dot grid */}
                <div className="absolute inset-0 opacity-[0.35]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(69,39,118,0.25) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-[95vw] mx-auto text-center">
                <div ref={containerRef} className="py-24 md:py-40 flex flex-col items-center">

                    {/* Live Badge */}
                    <div ref={badgeRef} className="mb-8 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border-2 border-[var(--border)] shadow-[4px_4px_0px_#111111]">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        </span>
                        <span className="text-[10px] text-[var(--accent)] font-mono tracking-[0.25em] uppercase font-semibold">
                            Building the Future of Payments
                        </span>
                    </div>

                    {/* Headline */}
                    <h1
                        ref={headlineRef}
                        className="font-display mb-10 text-center tracking-[-0.04em] leading-[0.88] uppercase"
                    >
                        <span className="block font-extrabold text-[var(--text)] text-[clamp(3.5rem,13vw,13rem)]">
                            Send Crypto
                        </span>
                        <span
                            className="block font-black text-stroke text-[clamp(2.8rem,10vw,10rem)] -mt-2 md:-mt-4"
                        >
                            Via SMS
                        </span>
                    </h1>

                    {/* Candy stripe */}
                    <div className="candy-stripe w-48 md:w-72 mb-8 mx-auto" />

                    {/* Subtitle */}
                    <p
                        ref={subtitleRef}
                        className="text-[var(--text-muted)] text-center text-base md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-6 px-4"
                    >
                        PIGEON lets anyone send and receive crypto on Algorand using simple text messages.
                        Powered by Falcon post-quantum cryptography and encrypted wallet management.
                    </p>

                    {/* Algorand pill */}
                    <div className="my-5 flex items-center justify-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-light)] opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-light)]"></span>
                        </span>
                        <p className="text-[10px] text-[var(--accent)] font-mono tracking-[0.2em] uppercase font-semibold">Built on Algorand</p>
                    </div>

                    {/* CTA Buttons */}
                    <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                        {/* Primary CTA */}
                        <button
                            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-candy group relative"
                        >
                            <span className="relative z-10 tracking-wide">Explore PIGEON</span>
                        </button>

                        {/* Ghost CTA */}
                        <a
                            href="https://github.com/HimanshuM685/PIGEON"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-3.5 text-sm font-bold uppercase tracking-wide border-2 border-[var(--border)] text-[var(--text)] bg-[var(--bg-surface)] hover:bg-[var(--bg-pink)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_#111111] transition-all duration-200 rounded-full"
                        >
                            View on GitHub →
                        </a>
                    </div>

                    {/* Scroll hint */}
                    <div className="mt-16 flex flex-col items-center gap-2 opacity-40">
                        <span className="text-[9px] font-mono tracking-[0.3em] uppercase text-[var(--text-muted)]">Scroll</span>
                        <div className="w-px h-10 bg-gradient-to-b from-[var(--accent)] to-transparent" />
                    </div>
                </div>
            </div>
        </section>
    )
}
