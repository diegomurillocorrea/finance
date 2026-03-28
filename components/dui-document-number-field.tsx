"use client"

import { useCallback, useEffect, useState } from "react"

function parseStoredToDigits(value: string | null | undefined): string {
  if (!value?.trim()) return ""
  return value.replace(/\D/g, "").slice(0, 9)
}

function digitsToDisplay(digits: string): string {
  if (digits.length <= 8) return digits
  return `${digits.slice(0, 8)}-${digits.slice(8)}`
}

function digitsToSubmitValue(digits: string): string {
  if (digits.length === 0) return ""
  if (digits.length === 9) {
    return `${digits.slice(0, 8)}-${digits.slice(8)}`
  }
  return digits
}

export interface DuiDocumentNumberFieldProps {
  id: string
  inputClass: string
  defaultValue?: string | null
  disabled?: boolean
  name?: string
}

/**
 * Solo dígitos (máx. 9); el guion entre el octavo y el noveno se inserta solo.
 */
export function DuiDocumentNumberField({
  id,
  inputClass,
  defaultValue,
  disabled,
  name = "document_number",
}: DuiDocumentNumberFieldProps) {
  const [digits, setDigits] = useState(() => parseStoredToDigits(defaultValue))

  useEffect(() => {
    setDigits(parseStoredToDigits(defaultValue))
  }, [defaultValue])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, 9)
    setDigits(next)
  }, [])

  const display = digitsToDisplay(digits)
  const submitValue = digitsToSubmitValue(digits)

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={inputClass}
        value={display}
        onChange={handleChange}
        disabled={disabled}
        placeholder="00000000-0"
        aria-label="Número de documento DUI"
      />
      <input type="hidden" name={name} value={submitValue} />
    </>
  )
}
