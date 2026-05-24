import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"

export const metadata: Metadata = {
    metadataBase: new URL("https://wepet.asia"),
    title: "WePet - Pet Social Network",
    description:
        "Meet nearby pet friends, chat after mutual likes, and explore pet-friendly places with WePet.",
    openGraph: {
        title: "WePet - Pet Social Network",
        description:
            "Meet nearby pet friends, chat after mutual likes, and explore pet-friendly places with WePet.",
        url: "https://wepet.asia",
        siteName: "WePet",
        images: [
            {
                url: "https://wepet.asia/og-wepet.png",
                width: 1200,
                height: 630,
                alt: "WePet Pet Social Network",
            },
        ],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "WePet - Pet Social Network",
        description:
            "Meet nearby pet friends, chat after mutual likes, and explore pet-friendly places with WePet.",
        images: ["https://wepet.asia/og-wepet.png"],
    },
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
