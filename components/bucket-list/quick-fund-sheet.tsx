"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { IconCoin, IconCheck } from "@tabler/icons-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatINR } from "@/lib/format"
import type { BucketListItem } from "@/lib/types"

interface QuickFundSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: BucketListItem | null
  onFund: (id: string, amount: number) => void
  isPending?: boolean
}

const PRESETS = [500, 1000, 2000, 5000]

export function QuickFundSheet({ open, onOpenChange, item, onFund, isPending }: QuickFundSheetProps) {
  const [customAmount, setCustomAmount] = useState("")
  const [funded, setFunded] = useState(false)

  if (!item) return null

  const progress = item.targetAmount > 0
    ? Math.min(100, Math.round((item.savedAmount / item.targetAmount) * 100))
    : 0
  const remaining = Math.max(0, item.targetAmount - item.savedAmount)

  const handleFund = (amount: number) => {
    const actual = Math.min(amount, remaining)
    if (actual <= 0) return
    onFund(item.id, actual)
    setFunded(true)
    setTimeout(() => {
      setFunded(false)
      setCustomAmount("")
      onOpenChange(false)
    }, 1200)
  }

  const handleCustomSubmit = () => {
    const val = Number(customAmount)
    if (val > 0) handleFund(val)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setCustomAmount(""); setFunded(false) } }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
        <div className="mx-auto w-full max-w-lg">
          {/* Drag handle indicator */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
          </div>

          <SheetHeader className="px-6 pt-3 pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center size-8 rounded-xl bg-amber-500/10">
                <IconCoin className="size-4 text-amber-500" />
              </div>
              Quick Fund
            </SheetTitle>
            <SheetDescription className="text-xs">Add savings toward <span className="font-medium text-foreground">{item.name}</span></SheetDescription>
          </SheetHeader>

          <div className="px-6 pb-8 pt-2 space-y-5">
            {/* Current progress */}
            <div className="rounded-2xl bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatINR(item.savedAmount)} <span className="text-muted-foreground/50">of</span> {formatINR(item.targetAmount)}
                </span>
                <span className="font-black tracking-tight tabular-nums">{progress}%</span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/60">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-lime-500 to-lime-400"
                  animate={{ width: `${Math.max(progress, 2)}%` }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{formatINR(remaining)}</span> remaining
              </p>
            </div>

            {funded ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2 py-8"
              >
                <div className="size-14 rounded-full bg-lime-500/10 flex items-center justify-center">
                  <IconCheck className="size-7 text-lime-500" />
                </div>
                <p className="text-sm font-semibold">Funds Added!</p>
              </motion.div>
            ) : (
              <>
                {/* Preset amounts */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Quick amounts</p>
                  <div className="grid grid-cols-4 gap-2.5">
                    {PRESETS.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold h-10"
                        disabled={isPending || amount > remaining}
                        onClick={() => handleFund(amount)}
                      >
                        {formatINR(amount).replace("₹", "₹")}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Custom amount</p>
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        className="pl-7 h-10"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                        min={1}
                        max={remaining}
                      />
                    </div>
                    <Button
                      className="h-10 px-5"
                      disabled={isPending || !customAmount || Number(customAmount) <= 0}
                      onClick={handleCustomSubmit}
                    >
                      Add Funds
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
