import Image from "next/image"

const LOGO_SRC = "/DAIEGO.png"

interface DaiegoLogoProps {
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

export function DaiegoLogo({
  className = "",
  width = 180,
  height = 54,
  priority = false,
}: DaiegoLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="DAIEGO"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority={priority}
    />
  )
}
