"use client"

import { useEffect, useRef, useMemo } from "react"
import { motion } from "motion/react"
import { IconRobot } from "@tabler/icons-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useCompletion } from "@ai-sdk/react"

interface SpotlightAIInlineProps {
  query: string
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-purple-400/60"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

/** Renders plain text during streaming to avoid ReactMarkdown re-parse flicker. */
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
    <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed [&_p]:mb-1.5 [&_ul]:my-1 [&_li]:text-[13px] [&_strong]:text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
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

  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: "auto" }}
      exit={{ height: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="border-t border-purple-500/20 bg-purple-500/5 overflow-hidden"
    >
      <div
        ref={scrollRef}
        className="px-4 py-3 max-h-[200px] overflow-y-auto"
      >
        <div className="flex items-start gap-2.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-500/15 mt-0.5">
            <IconRobot className="size-3.5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            {error ? (
              <p className="text-xs text-destructive">
                {error.message || "Something went wrong"}
              </p>
            ) : isLoading && completion ? (
              <StreamingText text={completion} />
            ) : !isLoading && completion ? (
              finishedContent
            ) : isLoading ? (
              <div className="flex items-center gap-2 py-1.5">
                <ThinkingDots />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
