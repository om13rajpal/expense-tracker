"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { IconFlame } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

interface GamificationData { levelName: string; streak: number }

/* Animated fire particles background */
function FireParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3 + Math.random() * 4,
            height: 3 + Math.random() * 4,
            left: `${20 + Math.random() * 60}%`,
            bottom: 0,
            background: `oklch(0.75 0.18 ${30 + Math.random() * 20} / ${0.3 + Math.random() * 0.3})`,
          }}
          animate={{
            y: [0, -(60 + Math.random() * 80)],
            x: [0, (Math.random() - 0.5) * 30],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: 1.5 + Math.random() * 1.5,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  )
}

export default function StreakWidget({}: WidgetComponentProps) {
  const [gamification, setGamification] = useState<GamificationData | null>(null)
  const ref = useRef<HTMLAnchorElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

  useEffect(() => {
    fetch("/api/gamification").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      setGamification({ levelName: data.levelName || data.level?.name || "Beginner", streak: data.streak?.currentStreak || data.currentStreak || 0 })
    }).catch(() => {})
  }, [])

  const isOnFire = gamification ? gamification.streak > 0 : false

  return (
    <Link ref={ref} href="/gamification" className={`block p-5 h-full relative overflow-hidden ${isOnFire ? "widget-accent-fire" : ""}`}>
      {/* Animated fire particles when on fire */}
      {isOnFire && isInView && <FireParticles />}

      {/* Warm gradient glow at bottom when on fire */}
      {isOnFire && (
        <motion.div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 100%, oklch(0.7 0.18 35 / 12%), transparent 70%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
      )}

      <div className="relative flex flex-col h-full">
        {/* Flame icon with glow ring */}
        <motion.div
          className={`flex items-center justify-center size-11 rounded-xl mb-3 ${
            isOnFire
              ? "bg-orange-500/15 dark:bg-orange-500/20"
              : "bg-muted"
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: isInView ? 1 : 0.8, opacity: isInView ? 1 : 0 }}
          transition={{ delay: 0.1, duration: 0.4, type: "spring" }}
        >
          <IconFlame className={`size-5 ${
            isOnFire
              ? "text-orange-500 icon-glow-fire"
              : "text-muted-foreground"
          }`} />
        </motion.div>

        {gamification ? (
          <motion.div
            className="mt-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 8 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {/* Streak count with animated entrance */}
            <p className={`text-xl font-black tracking-tight tabular-nums ${
              isOnFire
                ? "text-orange-500 dark:text-orange-400"
                : "text-muted-foreground"
            }`}>
              {isOnFire ? (
                <>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                  >
                    {gamification.streak}
                  </motion.span>
                  <span className="text-sm font-bold ml-0.5">day streak</span>
                </>
              ) : (
                "No streak"
              )}
            </p>
            {/* Level name */}
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
              {gamification.levelName}
            </p>
          </motion.div>
        ) : (
          <div className="mt-auto space-y-1.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        )}
      </div>
    </Link>
  )
}
