import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { Providers } from "./providers"
import { Navigation } from "@/components/navigation"
import "./globals.css"

export const metadata: Metadata = {
  title: "Home IoT Monitor",
  description: "Live indoor climate and outdoor weather dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} font-[family-name:var(--font-geist-sans)] antialiased`}
      >
        <Providers>
          <Navigation />
          <div className="pl-[264px]">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
