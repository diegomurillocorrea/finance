import type { Metadata } from "next"
import { Poppins, Geist_Mono } from "next/font/google"
import "./globals.css"

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "DAIEGO Finance",
    template: "DAIEGO Finance | %s",
  },
  description: "Panel de administración financiera DAIEGO.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body
        className={`${poppins.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  )
}
