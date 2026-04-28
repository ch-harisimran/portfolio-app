"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, User, Zap, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api";
import { saveTokens, saveUser } from "@/lib/auth";

interface RegisterForm {
  email: string;
  password: string;
  full_name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const { data: tokens } = await authApi.register(data.email, data.password, data.full_name);
      saveTokens(tokens.access_token, tokens.refresh_token);
      const { data: user } = await authApi.me();
      saveUser(user);
      toast.success("Account created! Welcome to PakFinance.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-surface border border-surface-border rounded-xl py-3 text-white text-sm placeholder-muted focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all";

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-surface">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[400px] animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-brand shadow-glow-brand mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PakFinance</h1>
          <p className="text-sm text-muted mt-1">Create your investor account</p>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

          <h2 className="text-lg font-semibold text-white mb-6">Get started</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  {...register("full_name")}
                  className={`${inputCls} pl-10 pr-4`}
                  placeholder="Ahmed Khan"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  {...register("email", { required: "Email required" })}
                  className={`${inputCls} pl-10 pr-4`}
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
                  {...register("password", { required: "Password required", minLength: { value: 8, message: "Min 8 characters" } })}
                  className={`${inputCls} pl-10 pr-11`}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-brand hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-glow-brand-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-surface-border text-center">
            <p className="text-sm text-muted">
              Already have an account?{" "}
              <a href="/login" className="text-brand hover:text-brand-light font-semibold transition-colors">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
