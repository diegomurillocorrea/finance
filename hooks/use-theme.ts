"use client"

import { useState, useCallback, useEffect } from "react"

const THEME_KEY = "theme"

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  const saved = localStorage.getItem(THEME_KEY)
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  if (saved === "dark" || saved === "light") return saved
  return prefersDark ? "dark" : "light"
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
    document.documentElement.classList.remove("light")
  } else {
    document.documentElement.classList.add("light")
    document.documentElement.classList.remove("dark")
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const initial = getInitialTheme()
    setTheme(initial)
    applyTheme(initial)
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    if (typeof localStorage !== "undefined") localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
  }, [theme])

  return { theme, toggleTheme }
}
