import type React from "react"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"

export const metadata = {
    title: "WePet (위펫) - AI Pet Social Network",
    description: "Connect your pet with perfect friends through AI-powered matching. Find walking buddies and playdates.",
    icons: {
        icon: "/icon-light-32x32.png",
        apple: "/apple-icon.png",
    },
    generator: "v0.app",
}

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#f97316",
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className="font-sans antialiased overflow-x-hidden">
        <LanguageProvider>
            <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
        <Analytics />
        </body>
        </html>
    )
}