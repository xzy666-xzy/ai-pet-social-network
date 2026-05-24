import type React from "react"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"

export const metadata = {
    title: "WePet (위펫) - Pet Social Network",
    description: "Connect your pet with perfect friends. Find walking buddies, playdates, and pet-friendly places near you.",
    generator: "v0.app",
}

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#FBF9F6",
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
