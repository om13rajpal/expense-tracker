"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import Lottie from "lottie-react"
import { IconTrophy } from "@tabler/icons-react"
import { scaleIn } from "@/lib/motion"

interface CompletionCelebrationProps {
  itemName: string | null
  onDismiss: () => void
}

export function CompletionCelebration({ itemName, onDismiss }: CompletionCelebrationProps) {
  const [confettiData, setConfettiData] = useState<object | null>(null)

  useEffect(() => {
    if (!itemName) return
    fetch("/animations/fire-mascot.json")
      .then((res) => res.json())
      .then(setConfettiData)
      .catch(() => {})
  }, [itemName])

  useEffect(() => {
    if (!itemName) return
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [itemName, onDismiss])

  return (
    <AnimatePresence>
      {itemName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onDismiss}
        >
          {/* Confetti layer */}
          {confettiData && (
            <div className="absolute inset-0 pointer-events-none">
              <Lottie animationData={confettiData} loop={false} className="w-full h-full" />
            </div>
          )}

          {/* Center card */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="relative z-10 bg-background rounded-2xl border border-border/50 p-8 text-center max-w-sm mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confettiData ? (
              <div className="size-24 mx-auto mb-4">
                <Lottie animationData={confettiData} loop autoplay className="w-full h-full" />
              </div>
            ) : (
              <div className="size-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <IconTrophy className="size-8 text-amber-500" />
              </div>
            )}
            <h2 className="text-xl font-black mb-1">Dream Achieved!</h2>
            <p className="text-sm text-muted-foreground mb-3">{itemName}</p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-lime-500/10 px-3 py-1.5 text-sm font-semibold text-lime-600 dark:text-lime-400">
              <IconTrophy className="size-4" />
              +50 XP Earned
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
