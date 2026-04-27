"use client";
import { useEffect, useState } from "react";
import { User, Shield, Database, Bell } from "lucide-react";
import { authApi, settingsApi } from "@/lib/api";
import { saveUser, getUser, setPinUnlocked } from "@/lib/auth";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import type { User as UserType } from "@/types";
import { Capacitor } from "@capacitor/core";

interface ProfileForm { full_name: string; }
interface PinForm { current_pin: string; new_pin: string; confirm_pin: string; }
interface SetPinForm { pin: string; confirm: string; }

export default function SettingsPage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [registeringHello, setRegisteringHello] = useState(false);
  const isWindowsWeb =
    !Capacitor.isNativePlatform() &&
    typeof window !== "undefined" &&
    /Windows/i.test(window.navigator.userAgent) &&
    !!window.PublicKeyCredential;

  const profileForm = useForm<ProfileForm>();
  const setPinForm = useForm<SetPinForm>();
  const changePinForm = useForm<PinForm>();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await authApi.me();
        setUser(data);
        saveUser(data);
        profileForm.reset({ full_name: data.full_name || "" });
      } catch (e) {
        const cached = getUser();
        if (cached) { setUser(cached); profileForm.reset({ full_name: cached.full_name || "" }); }
      }
    };
    load();
  }, []);

  const onProfile = async (data: ProfileForm) => {
    try {
      const { data: updated } = await settingsApi.update(data);
      saveUser(updated);
      setUser(updated);
      toast.success("Profile updated");
    } catch { toast.error("Update failed"); }
  };

  const onSetPin = async (data: SetPinForm) => {
    if (data.pin !== data.confirm) { toast.error("PINs do not match"); return; }
    if (data.pin.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    try {
      await authApi.setPin(data.pin);
      toast.success("PIN set successfully");
      setPinForm.reset();
      const { data: u } = await authApi.me();
      setUser(u);
      saveUser(u);
      setPinUnlocked(true);
    }
    catch { toast.error("Failed to set PIN"); }
  };

  const onChangePin = async (data: PinForm) => {
    if (data.new_pin !== data.confirm_pin) { toast.error("New PINs do not match"); return; }
    try { await authApi.changePin(data.current_pin, data.new_pin); toast.success("PIN changed"); changePinForm.reset(); }
    catch { toast.error("Failed to change PIN — check current PIN"); }
  };

  const refreshData = async (type: "psx" | "mufap") => {
    setRefreshing(true);
    try {
      if (type === "psx") await settingsApi.refreshPSX();
      else await settingsApi.refreshMUFAP();
      toast.success(`${type.toUpperCase()} data refresh started`);
    } catch { toast.error("Refresh failed"); }
    finally { setRefreshing(false); }
  };

  const enableWindowsHello = async () => {
    if (!window.PublicKeyCredential) {
      toast.error("WebAuthn/Windows Hello not supported on this browser");
      return;
    }
    setRegisteringHello(true);
    try {
      const { data: options } = await authApi.webauthnRegisterOptions();
      const challenge = Uint8Array.from(
        atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0)
      );
      const userId = new TextEncoder().encode(options.user_id);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { id: options.rp_id, name: options.rp_name },
          user: {
            id: userId,
            name: options.user_name,
            displayName: options.user_display_name,
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          timeout: 60000,
          authenticatorSelection: { userVerification: "required" },
          attestation: "none",
        },
      });
      if (!credential) throw new Error("No credential returned");
      await authApi.webauthnRegisterVerify(options.challenge_id, credential as object);
      toast.success("Windows Hello enabled for unlock");
    } catch {
      toast.error("Failed to enable Windows Hello");
    } finally {
      setRegisteringHello(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-brand" />
          </div>
          <h2 className="text-base font-semibold text-white">Profile</h2>
        </div>
        <div className="mb-4 text-sm text-muted">
          <span className="text-gray-400">Email: </span>
          <span className="text-white">{user?.email}</span>
        </div>
        <form onSubmit={profileForm.handleSubmit(onProfile)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
            <input {...profileForm.register("full_name")}
              className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand"
              placeholder="Your name" />
          </div>
          <button type="submit" className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Save Changes
          </button>
        </form>
      </div>

      {isWindowsWeb && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Windows Hello / WebAuthn</h2>
              <p className="text-xs text-muted mt-0.5">Register this browser for secure biometric/device unlock.</p>
            </div>
            <button
              onClick={enableWindowsHello}
              disabled={registeringHello}
              className="px-4 py-2 bg-brand/10 text-brand hover:bg-brand/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {registeringHello ? "Enabling..." : "Enable Windows Hello"}
            </button>
          </div>
        </div>
      )}

      {/* PIN Security */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-warning/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">PIN Security</h2>
            <p className="text-xs text-muted mt-0.5">{user?.has_pin ? "PIN is set" : "No PIN configured"}</p>
          </div>
        </div>

        {!user?.has_pin ? (
          <form onSubmit={setPinForm.handleSubmit(onSetPin)} className="space-y-4">
            <p className="text-sm text-muted">Set a PIN for quick access on this device.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">New PIN</label>
                <input type="password" inputMode="numeric" maxLength={8} {...setPinForm.register("pin", { required: true })}
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand tracking-widest text-center text-lg"
                  placeholder="••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm PIN</label>
                <input type="password" inputMode="numeric" maxLength={8} {...setPinForm.register("confirm", { required: true })}
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand tracking-widest text-center text-lg"
                  placeholder="••••" />
              </div>
            </div>
            <button type="submit" className="bg-warning hover:bg-warning/80 text-black px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
              Set PIN
            </button>
          </form>
        ) : (
          <form onSubmit={changePinForm.handleSubmit(onChangePin)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Current PIN</label>
              <input type="password" inputMode="numeric" maxLength={8} {...changePinForm.register("current_pin", { required: true })}
                className="w-64 bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand tracking-widest text-center text-lg"
                placeholder="••••" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">New PIN</label>
                <input type="password" inputMode="numeric" maxLength={8} {...changePinForm.register("new_pin", { required: true })}
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand tracking-widest text-center text-lg"
                  placeholder="••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New PIN</label>
                <input type="password" inputMode="numeric" maxLength={8} {...changePinForm.register("confirm_pin", { required: true })}
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand tracking-widest text-center text-lg"
                  placeholder="••••" />
              </div>
            </div>
            <button type="submit" className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
              Change PIN
            </button>
          </form>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-profit/10 rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5 text-profit" />
          </div>
          <h2 className="text-base font-semibold text-white">Market Data</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surface-border">
            <div>
              <p className="text-sm font-medium text-white">PSX Stock Prices</p>
              <p className="text-xs text-muted mt-0.5">Auto-refreshed every 15 min during market hours</p>
            </div>
            <button onClick={() => refreshData("psx")} disabled={refreshing}
              className="px-4 py-2 bg-brand/10 text-brand hover:bg-brand/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              Refresh Now
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surface-border">
            <div>
              <p className="text-sm font-medium text-white">Mutual Fund NAVs</p>
              <p className="text-xs text-muted mt-0.5">Auto-refreshed daily from MUFAP</p>
            </div>
            <button onClick={() => refreshData("mufap")} disabled={refreshing}
              className="px-4 py-2 bg-brand/10 text-brand hover:bg-brand/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-muted/10 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted" />
          </div>
          <h2 className="text-base font-semibold text-white">About</h2>
        </div>
        <div className="space-y-2 text-sm text-muted">
          <p>PakFinance v1.0.0</p>
          <p>Private finance tracker for Pakistani investors</p>
          <p className="text-xs">PSX data via DPS · Mutual Fund NAVs via MUFAP</p>
        </div>
      </div>
    </div>
  );
}
