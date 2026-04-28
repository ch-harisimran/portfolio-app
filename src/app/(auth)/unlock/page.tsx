"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Lock, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api";
import { saveTokens, setPinUnlocked, getUser, getOrCreateDeviceId } from "@/lib/auth";

interface UnlockForm {
  pin: string;
}

export default function UnlockPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const { register, handleSubmit } = useForm<UnlockForm>();
  const user = getUser();
  const deviceId = getOrCreateDeviceId();
  const isWindowsWeb =
    typeof window !== "undefined" &&
    /Windows/i.test(window.navigator.userAgent) &&
    !!window.PublicKeyCredential;

  const toBase64Url = (arr: ArrayBuffer | null) => {
    if (!arr) return "";
    const bytes = new Uint8Array(arr);
    let str = "";
    bytes.forEach((b) => (str += String.fromCharCode(b)));
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

  useEffect(() => {
    const syncLock = async () => {
      if (!user?.email) return;
      try {
        const { data } = await authApi.sessionLockStatus(user.email, deviceId);
        setPinUnlocked(!data.is_locked);
      } catch {
        // ignore
      }
    };
    syncLock();
  }, [deviceId, user?.email]);

  const onSubmit = async (data: UnlockForm) => {
    if (!user?.email) { router.replace("/login"); return; }
    setLoading(true);
    try {
      const { data: challenge } = await authApi.createPublicChallenge(user.email, "pin", deviceId);
      const { data: tokens } = await authApi.pinUnlock(user.email, data.pin, challenge.challenge_id);
      saveTokens(tokens.access_token, tokens.refresh_token);
      await authApi.sessionUnlock(user.email, deviceId);
      setPinUnlocked(true);
      toast.success("Unlocked");
      router.push("/dashboard");
    } catch {
      toast.error("Invalid PIN");
    } finally {
      setLoading(false);
    }
  };

  const unlockWithWindowsHello = async () => {
    if (!isWindowsWeb || !user?.email) { toast.error("Windows Hello not available"); return; }
    setBioLoading(true);
    try {
      const { data: challenge } = await authApi.createPublicChallenge(user.email, "webauthn", deviceId);
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: Uint8Array.from(atob(challenge.challenge.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
      };
      const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
      const response = assertion.response as AuthenticatorAssertionResponse;
      const { data: tokens } = await authApi.webauthnUnlock({
        email: user.email,
        challenge_id: challenge.challenge_id,
        credential_id: toBase64Url(assertion.rawId),
        authenticator_data: toBase64Url(response.authenticatorData),
        client_data_json: toBase64Url(response.clientDataJSON),
        signature: toBase64Url(response.signature),
        user_handle: toBase64Url(response.userHandle),
      });
      saveTokens(tokens.access_token, tokens.refresh_token);
      await authApi.sessionUnlock(user.email, deviceId);
      setPinUnlocked(true);
      toast.success("Unlocked with Windows Hello");
      router.push("/dashboard");
    } catch {
      toast.error("Windows Hello unlock failed");
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[360px] animate-fade-up">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-brand shadow-glow-brand mb-4 relative">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Unlock PakFinance</h1>
          <p className="text-sm text-muted mt-1">{user?.email || "Enter your PIN to continue"}</p>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-7 shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-brand" />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                {...register("pin", { required: true })}
                className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-white text-center text-xl tracking-[0.5em] focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all placeholder-muted"
                placeholder="••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-brand hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-glow-brand-sm transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><span>Unlock</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>

            {isWindowsWeb && (
              <button
                type="button"
                disabled={bioLoading}
                onClick={unlockWithWindowsHello}
                className="w-full border border-surface-border text-gray-300 py-3 rounded-xl text-sm hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-brand" />
                Windows Hello
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full text-muted hover:text-gray-300 text-sm py-2 transition-colors"
            >
              Login with email & password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
