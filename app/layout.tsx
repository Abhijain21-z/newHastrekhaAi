import type { Metadata } from "next"
import type { ReactNode } from "react"
import "../globals.css"

export const metadata: Metadata = {
  title: "Hast Rekha AI",
  description: "AI-powered palmistry insights and astrology guidance.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
