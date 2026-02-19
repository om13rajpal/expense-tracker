"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { IconSparkles, IconBrain } from "@tabler/icons-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useCompletion } from "@ai-sdk/react"

interface SpotlightAIInlineProps {
  query: string
}

const THINKING_PHASES = [
  "Understanding your question…",
  "Analyzing your financial data…",
  "Preparing insights…",
]

/** Animated shimmer skeleton lines shown while waiting for first token. */
function ThinkingSkeleton() {
  const [phaseIdx, setPhaseIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setPhaseIdx((p) => (p + 1) % THINKING_PHASES.length)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-3">
      {/* Phase text with animated icon */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <IconBrain className="size-3.5 text-purple-400" stroke={1.5} />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.span
            key={phaseIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-xs font-medium text-purple-400/90"
          >
            {THINKING_PHASES[phaseIdx]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Shimmer skeleton lines */}
      <div className="space-y-2">
        {[100, 85, 60].map((width, i) => (
          <div
            key={i}
            className="relative h-2.5 rounded-full overflow-hidden bg-purple-500/[0.06]"
            style={{ width: `${width}%` }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/15 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Renders plain text during streaming with a blinking cursor. */
function StreamingText({ text }: { text: string }) {
  return (
    <div className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
      {text}
      <motion.span
        className="inline-block w-1.5 h-3.5 bg-purple-400/80 rounded-sm ml-0.5 align-middle"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5], ease: "linear" }}
      />
    </div>
  )
}

/** Renders final markdown response after streaming completes. */
function FinishedResponse({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed [&_p]:mb-1.5 [&_ul]:my-1 [&_li]:text-[13px] [&_strong]:text-foreground"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </motion.div>
  )
}

export function SpotlightAIInline({ query }: SpotlightAIInlineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)

  const { completion, isLoading, error, complete, stop } = useCompletion({
    api: "/api/spotlight/chat",
    credentials: "include",
    streamProtocol: "text",
    experimental_throttle: 100,
  })

  // Fire the request on mount
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true
    complete(query)
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (isLoading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [completion, isLoading])

  // Memoize the finished markdown so it doesn't re-render on parent state changes
  const finishedContent = useMemo(() => {
    if (!isLoading && completion) {
      return <FinishedResponse text={completion} />
    }
    return null
  }, [isLoading, completion])

  const isThinking = isLoading && !completion
  const isStreaming = isLoading && !!completion
  const isDone = !isLoading && !!completion

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="border-t border-purple-500/20 overflow-hidden"
    >
      {/* Gradient background */}
      <div className="bg-gradient-to-b from-purple-500/[0.06] via-purple-500/[0.03] to-transparent">
        {/* Header pill */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
            className="flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/15 px-2.5 py-1"
          >
            <IconSparkles className="size-3 text-purple-500" stroke={2} />
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              AI Answer
            </span>
          </motion.div>
          {isDone && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium"
            >
              Done
            </motion.span>
          )}
        </div>

        {/* Response body */}
        <div
          ref={scrollRef}
          className="px-4 py-3 max-h-[340px] overflow-y-auto scrollbar-thin"
        >
          <AnimatePresence mode="wait">
            {error ? (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive"
              >
                {error.message || "Something went wrong"}
              </motion.p>
            ) : isThinking ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <ThinkingSkeleton />
              </motion.div>
            ) : isStreaming ? (
              <motion.div
                key="streaming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                <StreamingText text={completion} />
              </motion.div>
            ) : isDone ? (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {finishedContent}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
