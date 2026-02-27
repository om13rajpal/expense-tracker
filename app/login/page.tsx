"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import Lottie from "lottie-react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  const [mascotData, setMascotData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch("/animations/fire-mascot.json")
      .then((r) => r.json())
      .then((data) => setMascotData(data))
      .catch(() => {})
  }, [])

  return (
    <div className="flex min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Left: Immersive Visual Half */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 border-r border-white/5 overflow-hidden">
        {/* Dynamic ambient backgrounds */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-lime-500/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/4 translate-y-1/4" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-lime-400" />
          <span className="text-xl font-bold tracking-tight">Finova</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          {mascotData && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
              className="relative w-[400px] h-[400px]"
            >
              {/* Backlight pulse */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-lime-500/20 to-cyan-500/20 blur-[80px]"
              />
              {/* Floating Lottie */}
              <motion.div
                animate={{ y: [-15, 15, -15], rotate: [-2, 2, -2] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-full h-full drop-shadow-2xl"
              >
                <Lottie animationData={mascotData} loop autoplay className="w-full h-full" />
              </motion.div>
            </motion.div>
          )}

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
            className="text-center mt-12"
          >
            <h2 className="text-4xl font-black uppercase tracking-tighter">Your Wealth, <br/> <span className="text-lime-400">Weaponized.</span></h2>
            <p className="mt-4 text-white/50 max-w-sm mx-auto text-lg leading-relaxed">
              Total financial supremacy. Real-time flows. Zero friction.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right: Auth Form Half */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative">
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2 z-10">
          <div className="h-5 w-5 rounded-md bg-lime-400" />
          <span className="text-lg font-bold tracking-tight">Finova</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="w-full max-w-md relative z-10"
        >
          <div className="mb-10 lg:mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
            <p className="text-white/50">Enter your credentials to access the grid.</p>
          </div>
          
          <LoginForm />
          
          <div className="mt-12 text-center text-sm text-white/40 font-medium">
            Don't have an account? <Link href="/" className="text-lime-400 hover:text-lime-300 transition-colors ml-1">Join the waitlist.</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
