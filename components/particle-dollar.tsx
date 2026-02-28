"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"

export function ParticleDollar() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      w = rect?.width || window.innerWidth
      h = rect?.height || window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    // --- Sample $ sign from offscreen canvas ---
    const sampleDollar = (cx: number, cy: number, size: number): { x: number; y: number }[] => {
      const off = document.createElement("canvas")
      off.width = w
      off.height = h
      const oc = off.getContext("2d")
      if (!oc) return []
      oc.fillStyle = "white"
      // Use system monospace/sans-serif to avoid font loading race condition
      oc.font = `600 ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
      oc.textAlign = "center"
      oc.textBaseline = "middle"
      oc.fillText("$", cx, cy)

      const pts: { x: number; y: number }[] = []
      const img = oc.getImageData(0, 0, w, h).data
      // Use step=10 for a well-defined $ with enough points but not too dense
      const step = 10
      for (let py = 0; py < h; py += step) {
        for (let px = 0; px < w; px += step) {
          if (img[(py * w + px) * 4 + 3] > 80) { // Lower threshold to catch antialiased edges
            pts.push({ x: px, y: py })
          }
        }
      }
      return pts
    }

    // --- $ sign configuration ---
    const leftCx = w * 0.25
    const rightCx = w * 0.75
    const centerY = h * 0.4
    const fontSize = Math.min(w * 0.2, h * 0.4)

    const leftTargets = sampleDollar(leftCx, centerY, fontSize)
    const rightTargets = sampleDollar(rightCx, centerY, fontSize)
    const totalTargets = leftTargets.length + rightTargets.length

    // Ensure enough particles: all target points + ambient particles
    const TOTAL_PARTICLES = Math.max(500, totalTargets + 150)

    interface Particle {
      x: number; y: number
      homeX: number; homeY: number
      size: number; alpha: number
      isLime: boolean; isSwarming: boolean
    }

    const particles: Particle[] = []

    // Distribute uniformly via grid with jitter
    const cols = Math.ceil(Math.sqrt(TOTAL_PARTICLES * (w / h)))
    const rows = Math.ceil(TOTAL_PARTICLES / cols)
    const cellW = w / cols
    const cellH = h / rows

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const sx = col * cellW + Math.random() * cellW
      const sy = row * cellH + Math.random() * cellH
      particles.push({
        x: sx, y: sy, homeX: sx, homeY: sy,
        size: 1.0 + Math.random() * 0.8,
        alpha: 0.15 + Math.random() * 0.15,
        isLime: false, isSwarming: false,
      })
    }

    // Gentle floating
    const floatAnims = particles.map((p) =>
      gsap.to(p, {
        x: `+=${Math.random() * 30 - 15}`,
        y: `+=${Math.random() * 30 - 15}`,
        duration: 4 + Math.random() * 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })
    )

    // --- Hover ---
    let hovering = false
    let swarmIndices: number[] = []
    const triggerRadius = Math.min(w, h) * 0.28

    // Greedy nearest-neighbor: pull ONLY the closest particle per target point.
    const assignNearest = (targets: { x: number; y: number }[], used: Set<number>) => {
      const assignments: { pIdx: number; target: { x: number; y: number } }[] = []
      for (const t of targets) {
        let bestIdx = -1
        let bestDist = Infinity
        for (let i = 0; i < particles.length; i++) {
          if (used.has(i)) continue
          const p = particles[i]
          const d = Math.hypot(p.x - t.x, p.y - t.y)
          if (d < bestDist) { bestDist = d; bestIdx = i }
        }
        if (bestIdx >= 0) {
          used.add(bestIdx)
          assignments.push({ pIdx: bestIdx, target: t })
        }
      }
      return assignments
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const dist = Math.hypot(mx - w / 2, my - h / 2)

      if (dist < triggerRadius && !hovering) {
        hovering = true
        formDollars()
      } else if (dist > triggerRadius * 1.3 && hovering) {
        disperse()
      }
    }

    const formDollars = () => {
      const used = new Set<number>()
      const leftAssign = assignNearest(leftTargets, used)
      const rightAssign = assignNearest(rightTargets, used)
      const allAssign = [...leftAssign, ...rightAssign]

      swarmIndices = allAssign.map((a) => a.pIdx)

      allAssign.forEach(({ pIdx, target }) => {
        const p = particles[pIdx]
        floatAnims[pIdx]?.pause()
        p.isSwarming = true

        gsap.to(p, {
          x: target.x + (Math.random() * 4 - 2),
          y: target.y + (Math.random() * 4 - 2),
          alpha: 0.6 + Math.random() * 0.4,
          size: 1.4 + Math.random() * 0.6,
          duration: 1.0 + Math.random() * 0.8,
          ease: "expo.out",
          overwrite: "auto",
          onStart: () => { p.isLime = true },
        })
      })
    }

    const disperse = () => {
      hovering = false
      swarmIndices.forEach((idx) => {
        const p = particles[idx]
        p.isSwarming = false
        gsap.to(p, {
          x: p.homeX + (Math.random() * 60 - 30),
          y: p.homeY + (Math.random() * 60 - 30),
          alpha: 0.15 + Math.random() * 0.15,
          size: 1.0 + Math.random() * 0.8,
          duration: 2 + Math.random() * 1,
          ease: "power2.out",
          overwrite: "auto",
          onStart: () => { p.isLime = false },
          onComplete: () => {
            if (!p.isSwarming) floatAnims[idx]?.play()
          },
        })
      })
      swarmIndices = []
    }

    const onLeave = () => { if (hovering) disperse() }

    canvas.addEventListener("mousemove", onMove)
    canvas.addEventListener("mouseleave", onLeave)

    // --- Render ---
    let raf: number
    const render = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.isLime ? "#a3e635" : "#ffffff"
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("mousemove", onMove)
      canvas.removeEventListener("mouseleave", onLeave)
      floatAnims.forEach((a) => a.kill())
      gsap.killTweensOf(particles)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ maxHeight: "100%", overflow: "hidden" }}
    />
  )
}
