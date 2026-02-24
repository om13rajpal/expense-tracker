/**
 * Styled markdown renderer for AI insight content.
 * Uses react-markdown with remark-gfm and custom component overrides
 * that match the application design system.
 * @module components/insight-markdown
 */
"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

/** Custom react-markdown component overrides styled to match the Finova design system. */
const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-bold mt-4 mb-2 text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold mt-3 mb-1.5 text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mt-2.5 mb-1 text-foreground">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 ml-4 space-y-0.5 list-disc text-sm leading-relaxed">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 ml-4 space-y-0.5 list-decimal text-sm leading-relaxed">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ className, children, ...props }) => {
    if (className) {
      return (
        <code className="font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="my-2 rounded-xl bg-muted/60 p-3.5 overflow-x-auto text-xs leading-relaxed">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-border/50" />,
}

/**
 * Renders markdown content with GFM support and themed component overrides.
 * @param content - Raw markdown string from AI insight responses.
 */
export function InsightMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {content}
    </ReactMarkdown>
  )
}
