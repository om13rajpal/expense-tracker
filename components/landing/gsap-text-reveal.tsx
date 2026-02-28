"use client"

import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lottie, { LottieRefCurrentProps } from "lottie-react"

gsap.registerPlugin(ScrollTrigger)

interface GsapTextRevealProps {
  text: string
  className?: string
  lottieUrl?: string
}

export function GsapTextReveal({ text, className, lottieUrl }: GsapTextRevealProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)
  const [lottieLoaded, setLottieLoaded] = useState(false)

  useEffect(() => {
    if (!lottieUrl) return
    fetch(lottieUrl)
      .then((r) => r.json())
      .then((data) => setLottieData(data))
      .catch(() => {})
  }, [lottieUrl])

  useEffect(() => {
    if (!sectionRef.current || !textRef.current) return

    const wordsEls = textRef.current.querySelectorAll(".reveal-word")
    const lottieInst = lottieRef.current
    const totalFrames = (lottieInst && lottieLoaded) ? (lottieInst.getDuration(true) ?? 0) : 0

    const ctx = gsap.context(() => {
      // Build a single timeline for the word reveal
      const tl = gsap.timeline()
      wordsEls.forEach((word) => {
        tl.to(word, { opacity: 1, ease: "none", duration: 1 })
      })

      // One ScrollTrigger pins and scrubs the timeline + drives Lottie
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=150%",
        pin: true,
        pinReparent: true,
        scrub: 0.5,
        animation: tl,
        onUpdate: totalFrames > 0 && lottieInst
          ? (self) => {
              const frame = Math.round(self.progress * (totalFrames - 1))
              lottieInst.goToAndStop(frame, true)
            }
          : undefined,
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [text, lottieLoaded])

  const words = text.split(" ")
  const hasLottie = !!lottieUrl

  return (
    <section
      ref={sectionRef}
      className={`relative h-screen flex items-center justify-center px-6 md:px-12 lg:px-16 ${className || ""}`}
    >
      <div className={`flex items-center w-full max-w-7xl mx-auto ${hasLottie ? "gap-8 md:gap-12 lg:gap-16" : "justify-center"}`}>
        {/* Text */}
        <div
          ref={textRef}
          className={`flex flex-wrap ${
            hasLottie
              ? "flex-1 min-w-0 text-[1.35rem] sm:text-2xl md:text-[1.7rem] lg:text-[2rem] xl:text-[2.3rem] justify-start text-left leading-[1.5]"
              : "max-w-5xl text-2xl sm:text-3xl md:text-4xl lg:text-5xl justify-center text-center leading-[1.35]"
          } font-bold tracking-[-0.02em]`}
        >
          {words.map((word, i) => (
            <span key={i} className="reveal-word text-white/90 mx-[0.2em] my-[0.08em]" style={{ opacity: 0.1 }}>
              {word}
            </span>
          ))}
        </div>

        {/* Lottie — aspect ratio preserved (190:150 native) */}
        {hasLottie && lottieData && (
          <div className="hidden md:flex flex-shrink-0 items-center justify-center w-[280px] lg:w-[360px] xl:w-[420px] aspect-[190/150]">
            <Lottie
              lottieRef={lottieRef}
              animationData={lottieData}
              loop={false}
              autoplay={false}
              onDOMLoaded={() => setLottieLoaded(true)}
              className="w-full h-full"
            />
          </div>
        )}
      </div>
    </section>
  )
}
