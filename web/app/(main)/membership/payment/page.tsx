"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Check, CreditCard, Banknote, Smartphone, Wallet, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"
import { apiRequest } from "@/lib/api-client"

type PaymentMethod = "kakaoPay" | "bankTransfer" | "wechatPay" | "alipay"
type PlanType = "monthly" | "annual"

type MembershipCheckoutResponse = {
  success: true
  data: {
    membership: {
      id: string
      user_id: string
      plan_type: string | null
      status: string | null
      start_at: string | null
      end_at: string | null
    }
    quota: {
      isMember: boolean
      dailyLimit: number
      remainingLikes: number
      unlocked: boolean
    }
  }
}

const paymentMethods: { key: PaymentMethod; icon: React.ReactNode }[] = [
  { key: "kakaoPay", icon: <Smartphone className="h-5 w-5" /> },
  { key: "bankTransfer", icon: <Banknote className="h-5 w-5" /> },
  { key: "wechatPay", icon: <Wallet className="h-5 w-5" /> },
  { key: "alipay", icon: <CreditCard className="h-5 w-5" /> },
]

export default function MembershipPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { user } = useAuth()

  const plan = (searchParams.get("plan") as PlanType) || "monthly"
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const isMonthly = plan === "monthly"
  const price = isMonthly ? "₩11,000" : "₩99,000"
  const planLabel = isMonthly ? t.match.payment.monthlyMembership : t.match.payment.annualMembership

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method)
    setError("")
  }

  const handleCompletePayment = async () => {
    if (!selectedMethod) return

    try {
      setProcessing(true)
      setError("")

      const data = await apiRequest<MembershipCheckoutResponse>("/membership/checkout", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          plan: isMonthly ? "monthly" : "yearly",
        }),
      })

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setProcessing(false)
    }
  }

  const renderPaymentInstruction = () => {
    if (!selectedMethod) return null

    const instructions: Record<PaymentMethod, { title: string; content: React.ReactNode }> = {
      kakaoPay: {
        title: t.match.payment.scanKakaoPay,
        content: (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50">
              <div className="text-center">
                <Smartphone className="mx-auto h-12 w-12 text-orange-400" />
                <p className="mt-2 text-sm font-medium text-orange-600">KakaoPay QR</p>
              </div>
            </div>
            <p className="text-xs text-stone-500">WePet-{isMonthly ? "MONTHLY" : "ANNUAL"}-{user?.id?.slice(0, 8) || "USER"}</p>
          </div>
        ),
      },
      bankTransfer: {
        title: t.match.payment.transferBank,
        content: (
          <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Bank</span>
              <span className="font-semibold text-stone-800">KakaoBank</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Account</span>
              <span className="font-semibold text-stone-800">3333-12-4567890</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Holder</span>
              <span className="font-semibold text-stone-800">(주) WePet</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">{t.match.payment.currentPlan}</span>
              <span className="font-semibold text-stone-800">{planLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Amount</span>
              <span className="font-bold text-orange-600">{price}</span>
            </div>
          </div>
        ),
      },
      wechatPay: {
        title: t.match.payment.scanWechatPay,
        content: (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-green-300 bg-green-50">
              <div className="text-center">
                <Wallet className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-2 text-sm font-medium text-green-600">WeChat Pay QR</p>
              </div>
            </div>
            <p className="text-xs text-stone-500">WePet-{isMonthly ? "MONTHLY" : "ANNUAL"}-{user?.id?.slice(0, 8) || "USER"}</p>
          </div>
        ),
      },
      alipay: {
        title: t.match.payment.scanAlipay,
        content: (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50">
              <div className="text-center">
                <CreditCard className="mx-auto h-12 w-12 text-blue-500" />
                <p className="mt-2 text-sm font-medium text-blue-600">Alipay QR</p>
              </div>
            </div>
            <p className="text-xs text-stone-500">WePet-{isMonthly ? "MONTHLY" : "ANNUAL"}-{user?.id?.slice(0, 8) || "USER"}</p>
          </div>
        ),
      },
    }

    const instruction = instructions[selectedMethod]

    return (
      <motion.div
        key={selectedMethod}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 space-y-4"
      >
        <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 text-center text-sm font-medium text-orange-700">
          {instruction.title}
        </div>
        {instruction.content}
      </motion.div>
    )
  }

  if (success) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col bg-gradient-to-b from-orange-50 via-stone-50 to-white">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-400 shadow-lg shadow-orange-500/30"
          >
            <Check className="h-10 w-10 text-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-center"
          >
            <h2 className="text-xl font-bold text-stone-900">{t.match.payment.paymentSuccess}</h2>
            <p className="mt-2 text-sm text-stone-500">{planLabel} · {price}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 w-full"
          >
            <Button
              onClick={() => router.push("/match")}
              className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-6 text-base font-bold text-white shadow-lg hover:from-orange-600 hover:to-amber-600"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {t.match.title}
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-gradient-to-b from-orange-50 via-stone-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-orange-100/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-xl">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-11 w-11 rounded-full border border-orange-100 bg-white text-stone-700 shadow-sm hover:bg-orange-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-stone-900">
            {t.match.payment.title}
          </h1>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {/* Current Plan Card */}
        <Card className="mt-5 rounded-[1.75rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-lg shadow-orange-900/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {t.match.payment.currentPlan}
              </p>
              <h2 className="mt-1 text-xl font-bold text-stone-900">{planLabel}</h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-orange-600">{price}</p>
              <p className="text-xs text-stone-500">
                {isMonthly ? t.match.membership.monthlyVipDuration : t.match.membership.annualVipDuration}
              </p>
            </div>
          </div>
          {isMonthly ? null : (
            <div className="mt-3 rounded-full bg-amber-500 px-3 py-1 text-center text-[10px] font-bold text-white">
              {t.match.membership.annualSave}
            </div>
          )}
        </Card>

        {/* Payment Method Selection */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold text-stone-700">{t.match.payment.paymentMethod}</h3>
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const isSelected = selectedMethod === method.key
              return (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => handleSelectMethod(method.key)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-orange-500 bg-orange-50 shadow-md shadow-orange-500/10"
                      : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/50"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isSelected ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {method.icon}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isSelected ? "text-orange-700" : "text-stone-700"
                    }`}
                  >
                    {t.match.payment[method.key]}
                  </span>
                  {isSelected ? (
                    <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-orange-500">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* Payment Instruction Area */}
        <AnimatePresence mode="wait">
          {renderPaymentInstruction()}
        </AnimatePresence>

        {/* Error */}
        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {/* Complete Payment Button */}
        {selectedMethod ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Button
              onClick={handleCompletePayment}
              disabled={processing}
              className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-6 text-base font-bold text-white shadow-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-60"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t.match.membership.processing}
                </span>
              ) : (
                t.match.payment.completePayment
              )}
            </Button>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
