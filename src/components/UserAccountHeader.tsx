import React, { useState } from "react";
import { UserProfile } from "../types";
import { User, Shield, CreditCard, Key, Check, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface UserAccountHeaderProps {
  profile: UserProfile;
  username: string;
  onActivateCode: (code: string) => Promise<{ success: boolean; message: string; status?: string }>;
  onSelectPaket: (paket: "BASIC" | "PRO") => void;
}

export default function UserAccountHeader({
  profile,
  username,
  onActivateCode,
  onSelectPaket,
}: UserAccountHeaderProps) {
  const [activationCode, setActivationCode] = useState("");
  const [activationMsg, setActivationMsg] = useState<{ type: "success" | "error"; text: string; status?: string } | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) return;
    setIsSubmittingCode(true);
    setActivationMsg(null);
    const result = await onActivateCode(activationCode.trim());
    setIsSubmittingCode(false);
    if (result.success) {
      setActivationMsg({
        type: "success",
        text: result.message || "Hore! Kode berhasil diaktifkan. Paket Anda ditingkatkan sekarang!",
        status: "ACTIVE",
      });
      setActivationCode("");
    } else {
      setActivationMsg({
        type: "error",
        text: result.message || "Aktivasi gagal. Periksa kembali kode lisensi Anda.",
        status: result.status,
      });
    }
  };

  const isTrial = profile.paket === "TRIAL";
  const isBasic = profile.paket === "BASIC";
  const isPro = profile.paket === "PRO";
  const hasPackage = isBasic || isPro;

  return (
    <div className="bg-white border-b border-slate-200 py-4 md:py-6 px-3 md:px-8 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 md:gap-6">
        {/* User Card */}
        <div className="flex items-start gap-2 md:gap-4 min-w-0">
          <div className="p-2 md:p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 shrink-0">
            <User className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 md:mb-1">Akun Pengguna</div>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <span className="font-bold text-slate-800 text-sm md:text-base truncate max-w-[180px] md:max-w-none">
                {username ? `@${username}` : profile.email || "Guest"}
              </span>
            </div>

            {/* Badge & Quota */}
            <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider border ${
                  isPro
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : isBasic
                    ? "bg-slate-100 text-slate-800 border-slate-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <Shield className="w-2.5 h-2.5 md:w-3 md:h-3" />
                {isPro ? "PRO" : isBasic ? "BASIC" : "TRIAL"}
              </span>

              {isTrial && (
                <span className="text-[10px] md:text-xs text-amber-600 font-semibold">
                  Sisa percobaan:{" "}
                  <strong>{profile.screeningSisa}</strong>
                </span>
              )}
              {hasPackage && (
                <span className="text-[10px] md:text-xs text-slate-500">
                  Sisa:{" "}
                  <strong className={`font-bold ${profile.screeningSisa === "Unlimited" ? "text-blue-600" : "text-slate-800"}`}>
                    {profile.screeningSisa}
                  </strong>
                </span>
              )}
              {profile.tanggalBerlaku && (
                <span className="text-[10px] md:text-xs text-slate-400 italic">
                  {profile.tanggalBerlaku}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Package Selector / Upgrade */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4">
          <div className="hidden sm:block space-y-0.5 md:space-y-1">
            <h4 className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {hasPackage ? "Paket Aktif" : "Upgrade Paket"}
            </h4>
            <p className="text-[9px] md:text-[10.5px] text-slate-400 font-medium">
              {hasPackage ? "Nikmati fitur premium JagoCV" : "Dapatkan akses screening tanpa batas"}
            </p>
          </div>

          <div className="flex bg-slate-200/60 p-0.5 md:p-1 rounded-lg md:rounded-xl border border-slate-200/40 gap-1 shrink-0 align-middle w-full sm:w-auto">
            {(["BASIC", "PRO"] as const).map((t) => {
              const isActive = profile.paket === t;
              return (
                <button
                  key={t}
                  onClick={() => onSelectPaket(t)}
                  className={`flex-1 sm:flex-none px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer select-none flex items-center gap-1 ${
                    isActive
                      ? t === "PRO"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
                  }`}
                >
                  {t === "PRO" && <Sparkles className="w-3 h-3" />}
                  {t}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleActivate} className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Key className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                placeholder="Kode Aktivasi"
                className="w-full sm:w-44 bg-white border border-slate-200 text-slate-900 text-[10px] rounded-lg pl-7 pr-2 py-1.5 outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingCode || !activationCode.trim()}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSubmittingCode ? "..." : "Aktifkan"}
            </button>
          </form>
        </div>

        {activationMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[10px] font-bold px-3 py-2 rounded-lg ${
              activationMsg.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {activationMsg.type === "success" ? <Check className="w-3 h-3 inline mr-1" /> : null}
            {activationMsg.text}
          </motion.div>
        )}
      </div>
    </div>
  );
}
