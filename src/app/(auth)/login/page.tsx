"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, Zap, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api";
import { saveTokens, saveUser, setPinUnlocked, setRememberMe } from "@/lib/auth";

interface LoginForm {
  email: string;
  password: string;
  remember_me: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { remember_me: true },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const { data: tokens } = await authApi.login(data.email, data.password);
      saveTokens(tokens.access_token, tokens.refresh_token);
      setRememberMe(!!data.remember_me);
      const { data: user } = await authApi.me();
      saveUser(user);
      setPinUnlocked(!data.remember_me);
      toast.success(`Welcome back, ${user.full_name || user.email.split("@")[0]}!`);
      if (!user.has_pin) {
        router.push("/settings");
      } else if (data.remember_me) {
        setPinUnlocked(false);
        router.push("/unlock");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-surface">
      {/* Ambient mesh background */}
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-profit/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[400px] animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-brand shadow-glow-brand mb-4 relative">
            <Zap className="w-7 h-7 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-brand/20 blur-xl -z-10" />
          </div>
          <h1 className="text-2xl font-bold text-white">PakFinance</h1>
          <p className="text-sm text-muted mt-1">Pakistani Investor Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-card relative overflow-hidden">
          {/* Subtle top gradient */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  {...register("email", { required: "Email required" })}
                  className="w-full bg-surface border border-surface-border rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-muted focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="text-loss text-xs mt-1.5 ml-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showPw ? "text" : "password"}
                  {...register("password", { required: "Password required" })}
                  className="w-full bg-surface border border-surface-border rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder-muted focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-gray-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-loss text-xs mt-1.5 ml-1">{errors.password.message}</p>}
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" {...register("remember_me")} className="w-4 h-4 accent-brand rounded" />
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                Remember me — unlock with PIN next time
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-brand hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-glow-brand-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-surface-border text-center">
            <p className="text-sm text-muted">
              New here?{" "}
              <a href="/register" className="text-brand hover:text-brand-light font-semibold transition-colors">
                Create account
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted/50 mt-6">
          Secure · Private · Built for Pakistani investors
        </p>
      </div>
    </div>
  );
}
