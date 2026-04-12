import { AuroraBackground } from '@/components/ui/aurora-background'
import { motion } from 'motion/react'
import { Navbar } from '@/sections/Navbar'
import { Hero } from '@/sections/Hero'
import { About } from '@/sections/About'
import { Features } from '@/sections/Features'
import { HowItWorks } from '@/sections/HowItWorks'
import { Architecture } from '@/sections/Architecture'
import { Team } from '@/sections/Team'
import { Footer } from '@/sections/Footer'

function App() {
  return (
    <AuroraBackground className="bg-black dark:bg-black">
      {/* 
        This motion.div handles the dynamic entrance animation.
        For the first ~0.8s, only the AuroraBackground is visible.
        Then, the entire content fades in and slides up slowly over 1.5s.
      */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.8,
          duration: 1.5,
          ease: 'easeInOut',
        }}
        className="w-full relative min-h-screen text-white dark"
      >
        {/* Overlay gradient to slightly dim background behind content */}
        <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90 pointer-events-none z-[10]" />

        {/* Navbar — isolated so it stays readable */}
        <Navbar />

        {/* Main Content */}
        <main className="relative z-10 blend-difference">
          <Hero />
          <About />
          <Features />
          <HowItWorks />
          <Architecture />
          <Team />
        </main>

        {/* Footer — isolated from blend mode */}
        <Footer />
      </motion.div>
    </AuroraBackground>
  )
}

export default App
