"use client"

import { CalendarIcon, FileTextIcon } from "@radix-ui/react-icons"
import { BellIcon, Share2Icon, SendIcon, MessageCircleIcon, LandmarkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import { Marquee } from "@/components/ui/marquee"
import { AnimatedList } from "@/components/ui/animated-list"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { useRef } from "react"

const files = [
  {
    name: "bitcoin.pdf",
    body: "Bitcoin is a cryptocurrency invented in 2008 by an unknown person or group of people using the name Satoshi Nakamoto.",
  },
  {
    name: "finances.xlsx",
    body: "A spreadsheet or worksheet is a file made of rows and columns that help sort data, arrange data easily, and calculate numerical data.",
  },
  {
    name: "logo.svg",
    body: "Scalable Vector Graphics is an Extensible Markup Language-based vector image format for two-dimensional graphics with support for interactivity and animation.",
  },
  {
    name: "keys.gpg",
    body: "GPG keys are used to encrypt and decrypt email, files, directories, and whole disk partitions and to authenticate messages.",
  },
  {
    name: "seed.txt",
    body: "A seed phrase, seed recovery phrase or backup seed phrase is a list of words which store all the information needed to recover Bitcoin funds on-chain.",
  },
]

// Super basic mock for the AnimatedList
function SimpleAnimatedList() {
  return (
    <AnimatedList className="w-full h-full flex flex-col gap-2 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-full h-12 rounded-lg bg-white/5 border border-white/10 flex items-center px-4 gap-3">
          <div className="w-6 h-6 rounded-full bg-lime-400/20 flex items-center justify-center">
            <BellIcon className="w-3 h-3 text-lime-400" />
          </div>
          <div className="h-2 w-16 bg-white/20 rounded-full" />
        </div>
      ))}
    </AnimatedList>
  )
}

// Mock for specific integrations (Bank, Telegram, WhatsApp)
function SimpleAnimatedBeam() {
  const containerRef = useRef<HTMLDivElement>(null)
  const source1Ref = useRef<HTMLDivElement>(null)
  const source2Ref = useRef<HTMLDivElement>(null)
  const source3Ref = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-between p-8">
      <div className="flex flex-col justify-center gap-6 z-10 w-1/3">
        <div ref={source1Ref} className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center backdrop-blur-md">
           <LandmarkIcon className="w-4 h-4 text-emerald-400" />
        </div>
        <div ref={source2Ref} className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center backdrop-blur-md">
           <SendIcon className="w-4 h-4 text-cyan-400" />
        </div>
        <div ref={source3Ref} className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center backdrop-blur-md">
           <MessageCircleIcon className="w-4 h-4 text-green-400" />
        </div>
      </div>
      <div className="flex w-1/3 justify-end items-center z-10">
        <div ref={targetRef} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-500/20 to-lime-500/5 flex items-center justify-center shadow-[0_0_30px_rgba(163,230,53,0.2)] border border-lime-500/20 backdrop-blur-lg">
           <div className="w-8 h-8 rounded-lg bg-lime-400" />
        </div>
      </div>
      
      {/* Three separate beams syncing to the central hub */}
      <AnimatedBeam containerRef={containerRef} fromRef={source1Ref} toRef={targetRef} duration={3} />
      <AnimatedBeam containerRef={containerRef} fromRef={source2Ref} toRef={targetRef} duration={3} delay={0.5} />
      <AnimatedBeam containerRef={containerRef} fromRef={source3Ref} toRef={targetRef} duration={3} delay={1} />
    </div>
  )
}


const features = [
  {
    Icon: FileTextIcon,
    name: "Save your files",
    description: "We automatically save your files as you type.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-1",
    background: (
      <Marquee
        pauseOnHover
        className="absolute top-10 [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] [--duration:20s]"
      >
        {files.map((f, idx) => (
          <figure
            key={idx}
            className={cn(
              "relative w-32 cursor-pointer overflow-hidden rounded-xl border p-4",
              "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10",
              "transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none"
            )}
          >
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col">
                <figcaption className="text-sm font-medium text-white">
                  {f.name}
                </figcaption>
              </div>
            </div>
            <blockquote className="mt-2 text-xs text-white/50">{f.body}</blockquote>
          </figure>
        ))}
      </Marquee>
    ),
  },
  {
    Icon: BellIcon,
    name: "Notifications",
    description: "Get notified when something happens.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="absolute top-4 right-2 h-[300px] w-full scale-75 border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90 overflow-hidden">
         <SimpleAnimatedList />
      </div>
    ),
  },
  {
    Icon: Share2Icon,
    name: "Integrations",
    description: "Supports 100+ integrations and counting.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="absolute top-4 right-2 h-[300px] w-full border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-105 overflow-hidden">
        <SimpleAnimatedBeam />
      </div>
    ),
  },
  {
    Icon: CalendarIcon,
    name: "Calendar",
    description: "Use the calendar to filter your files by date.",
    className: "col-span-3 lg:col-span-1",
    href: "#",
    cta: "Learn more",
    background: (
      <Calendar
        mode="single"
        selected={new Date(2022, 4, 11, 0, 0, 0)}
        className="absolute top-10 right-0 origin-top scale-75 rounded-md border border-white/10 bg-black/50 text-white [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90"
      />
    ),
  },
]

export function BentoDemo() {
  return (
    <BentoGrid>
      {features.map((feature, idx) => (
        <BentoCard key={idx} {...feature} />
      ))}
    </BentoGrid>
  )
}
