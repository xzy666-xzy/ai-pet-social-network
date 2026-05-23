"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function MembershipPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") || "monthly"

  useEffect(() => {
    router.replace(`/membership/payment?plan=${plan}`)
  }, [router, plan])

  return null
}
