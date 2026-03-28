"use client"

import { useState, useEffect } from "react"

export const BREAKPOINTS = {
  MOBILE_MAX: 768,
  TABLET_MIN: 769,
  TABLET_MAX: 1280,
  DESKTOP_MIN: 1281,
} as const

export type BreakpointName = "mobile" | "tablet" | "desktop"

export function useBreakpoint(): BreakpointName {
  const [breakpoint, setBreakpoint] = useState<BreakpointName>("mobile")

  useEffect(() => {
    const getBreakpoint = (): BreakpointName => {
      const w = typeof window === "undefined" ? 0 : window.innerWidth
      if (w <= BREAKPOINTS.MOBILE_MAX) return "mobile"
      if (w <= BREAKPOINTS.TABLET_MAX) return "tablet"
      return "desktop"
    }

    setBreakpoint(getBreakpoint())
    const handleResize = () => setBreakpoint(getBreakpoint())
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return breakpoint
}
