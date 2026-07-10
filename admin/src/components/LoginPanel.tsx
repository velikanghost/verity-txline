"use client"

import { useState } from "react"
import { apiRequest } from "@/store/apiClient"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Mail } from "lucide-react"

interface LoginPanelProps {
  token: string
  setToken: (val: string) => void
  setIsAuthorized: (val: boolean) => void
  onSuccess: () => void
}

export default function LoginPanel({
  token,
  setToken,
  setIsAuthorized,
  onSuccess,
}: LoginPanelProps) {
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Handle direct JWT paste login
  function handleDirectLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    localStorage.setItem("verity_admin_auth_token", token.trim())
    setIsAuthorized(true)
    toast.success("Authenticated with JWT Token!")
    onSuccess()
  }

  // Request OTP via backend auth APIs
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await apiRequest("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      })
      setOtpSent(true)
      toast.success("OTP sent to your email!")
    } catch (err: any) {
      toast.error(err.message || "Failed to request OTP.")
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP via backend auth APIs
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode.trim()) return
    setLoading(true)
    try {
      const response = await apiRequest<{ token: string; user: any }>(
        "/auth/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
        },
      )

      if (response.user?.role !== "admin") {
        throw new Error("This account does not have administrator privileges.")
      }

      localStorage.setItem("verity_admin_auth_token", response.token)
      setToken(response.token)
      setIsAuthorized(true)
      toast.success("Successfully logged in as Admin!")
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Verification failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
      <div className="verity-card p-6 sm:p-8 w-full max-w-md flex flex-col gap-6 bg-white border border-stone-200">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-600">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold mt-3 tracking-tight text-stone-900">
            Verity Admin Login
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Please authenticate to access administrative moderation controls.
          </p>
        </div>

        <div className="flex border-b border-stone-200 pb-px gap-3 text-sm">
          <span className="font-semibold text-stone-900 border-b-2 border-stone-900 pb-2 flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-stone-500" />
            OTP / Credentials
          </span>
        </div>

        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Administrator Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@verity.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 border border-stone-200 bg-transparent text-sm rounded-[10px] outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white text-xs uppercase tracking-wider font-semibold rounded-[8px] transition-colors cursor-pointer"
            >
              {loading ? "Requesting OTP..." : "Send OTP Verification Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                OTP Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full h-11 px-3 text-center border border-stone-200 bg-transparent text-lg font-bold tracking-widest rounded-[10px] outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setOtpSent(false)}
                variant="secondary"
                className="flex-1 h-11 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-[8px] cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-2 h-11 bg-indigo-600 hover:bg-indigo-500 text-white text-xs uppercase tracking-wider font-semibold rounded-[8px] disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
            </div>
          </form>
        )}

        <div className="relative flex py-2 items-center">
          <div className="grow border-t border-stone-200"></div>
          <span className="shrink mx-4 text-[10px] font-mono font-bold uppercase text-stone-500">
            Or Direct JWT
          </span>
          <div className="grow border-t border-stone-200"></div>
        </div>

        <form onSubmit={handleDirectLogin} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              JWT Auth Token
            </label>
            <textarea
              placeholder="Paste verity_auth_token from localStorage"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={2}
              className="w-full p-2 border border-stone-200 bg-transparent text-[11px] font-mono rounded-[10px] outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-stone-900 text-white hover:bg-stone-800 text-xs uppercase tracking-wider font-semibold rounded-[8px] cursor-pointer"
          >
            Direct JWT Login
          </Button>
        </form>
      </div>
    </main>
  )
}
