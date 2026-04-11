"use client"

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { inputClass, labelClass } from "@/lib/form-classes"

export interface SearchableSelectOption {
  id: string
  label: string
  /** Segunda línea en el listado (p. ej. teléfono); también entra en el filtro. */
  description?: string | null
}

export interface SearchableSelectProps {
  id: string
  name: string
  label: string
  options: SearchableSelectOption[]
  disabled?: boolean
  placeholder?: string
  emptyMessage?: string
  required?: boolean
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

const LIST_MAX_PX = 280
const VIEWPORT_PAD = 8
const GAP_PX = 4
/** Por encima del modal (z-50) y del panel interno (z-10). */
const LIST_Z = 200

export function SearchableSelect({
  id: inputId,
  name,
  label,
  options,
  disabled = false,
  placeholder = "Escribe para buscar…",
  emptyMessage = "Sin coincidencias",
  required = false,
}: SearchableSelectProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [inputValue, setInputValue] = useState("")
  const [activeIndex, setActiveIndex] = useState(-1)
  const [listBox, setListBox] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)

  const filtered = useMemo(() => {
    const q = normalize(inputValue)
    if (!q) return options
    return options.filter((o) => {
      if (normalize(o.label).includes(q)) return true
      const d = o.description?.trim()
      return d ? normalize(d).includes(q) : false
    })
  }, [options, inputValue])

  const selectOption = useCallback((opt: SearchableSelectOption) => {
    setSelectedId(opt.id)
    setInputValue(opt.label)
    setOpen(false)
    setActiveIndex(-1)
    setListBox(null)
  }, [])

  const updateListPosition = useCallback(() => {
    const el = anchorRef.current
    if (!el || !open) {
      setListBox(null)
      return
    }
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD
    const spaceAbove = rect.top - VIEWPORT_PAD
    const openDown = spaceBelow >= 100 || spaceBelow >= spaceAbove

    let top: number
    let maxHeight: number
    if (openDown) {
      maxHeight = Math.min(LIST_MAX_PX, Math.max(spaceBelow - GAP_PX, 80))
      top = rect.bottom + GAP_PX
    } else {
      maxHeight = Math.min(LIST_MAX_PX, Math.max(spaceAbove - GAP_PX, 80))
      top = rect.top - GAP_PX - maxHeight
    }
    top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - VIEWPORT_PAD - maxHeight))

    const left = Math.max(
      VIEWPORT_PAD,
      Math.min(rect.left, window.innerWidth - rect.width - VIEWPORT_PAD)
    )

    setListBox({
      top,
      left,
      width: Math.max(rect.width, 200),
      maxHeight,
    })
  }, [open])

  useLayoutEffect(() => {
    if (!open || disabled) {
      setListBox(null)
      return
    }
    updateListPosition()
    window.addEventListener("resize", updateListPosition)
    window.addEventListener("scroll", updateListPosition, true)
    return () => {
      window.removeEventListener("resize", updateListPosition)
      window.removeEventListener("scroll", updateListPosition, true)
    }
  }, [open, disabled, updateListPosition, filtered.length, inputValue])

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (containerRef.current?.contains(t) || listRef.current?.contains(t)) return
      setOpen(false)
      setActiveIndex(-1)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  const onInputChange = (value: string) => {
    setInputValue(value)
    setOpen(true)
    setActiveIndex(-1)
    if (selectedId) {
      const current = options.find((o) => o.id === selectedId)
      if (current && current.label !== value) {
        setSelectedId("")
      }
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) setOpen(true)
      setActiveIndex((i) => {
        const n = filtered.length
        if (n === 0) return -1
        return i < 0 ? 0 : (i + 1) % n
      })
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!open) setOpen(true)
      setActiveIndex((i) => {
        const n = filtered.length
        if (n === 0) return -1
        return i < 0 ? n - 1 : (i - 1 + n) % n
      })
      return
    }
    if (e.key === "Enter" && open && activeIndex >= 0 && filtered[activeIndex]) {
      e.preventDefault()
      selectOption(filtered[activeIndex])
    }
  }

  const listContent =
    open && !disabled && listBox ? (
      <div
        ref={listRef}
        style={{
          position: "fixed",
          top: listBox.top,
          left: listBox.left,
          width: listBox.width,
          maxHeight: listBox.maxHeight,
          zIndex: LIST_Z,
          overflowX: "hidden",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
        className="box-border rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <ul id={listboxId} role="listbox" className="m-0 list-none p-0">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
              {emptyMessage}
            </li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt.id}
                role="option"
                aria-selected={selectedId === opt.id}
                className={`cursor-pointer px-4 py-2.5 text-sm ${
                  i === activeIndex
                    ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                    : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectOption(opt)}
              >
                <span className="block font-medium leading-snug">{opt.label}</span>
                {opt.description?.trim() ? (
                  <span
                    className={`mt-0.5 block text-xs font-normal ${
                      i === activeIndex
                        ? "text-emerald-900/75 dark:text-emerald-100/80"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {opt.description.trim()}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    ) : null

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className={labelClass}>
        {label}
      </label>
      <input type="hidden" name={name} value={selectedId} required={required} />
      <input
        ref={anchorRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => {
          if (!disabled) setOpen(true)
        }}
        onKeyDown={onKeyDown}
        className={inputClass}
      />
      {typeof document !== "undefined" && listContent
        ? createPortal(listContent, document.body)
        : null}
    </div>
  )
}
