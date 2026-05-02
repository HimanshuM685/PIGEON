import { motion } from 'motion/react'
import { useState, useEffect } from 'react'
import { Navbar } from '@/sections/Navbar'
import { Hero } from '@/sections/Hero'
import { About } from '@/sections/About'
import { Features } from '@/sections/Features'
import { HowItWorks } from '@/sections/HowItWorks'
import { Architecture } from '@/sections/Architecture'
import { Team } from '@/sections/Team'
import { Waitlist } from '@/sections/Waitlist'
import { Footer } from '@/sections/Footer'
import { Documentation } from '@/sections/Documentation'
import { ProgressStats } from '@/sections/ProgressStats'
import { Admin } from '@/sections/Admin'

function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div style={{ background: 'var(--gradient-page)', backgroundAttachment: 'fixed', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 1.0, ease: 'easeOut' }}
        className="w-full relative min-h-screen"
      >
        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <main className="relative">
          {currentHash === '#docs' ? (
            <Documentation />
          ) : currentHash === '#admin' ? (
            <Admin />
          ) : (
            <>
              <Hero />
              <About />
              <Features />
              <HowItWorks />
              <Architecture />
              <Team />
              <ProgressStats />
              <Waitlist />
            </>
          )}
        </main>

        {/* Footer */}
        <Footer />
      </motion.div>
    </div>
  )
}

export default App
