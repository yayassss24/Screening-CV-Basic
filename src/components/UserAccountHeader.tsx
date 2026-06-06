import React, { useState } from "react";
import { UserProfile } from "../types";
import { User, Shield, CreditCard, Gift, Key, Check } from "lucide-react";
import { motion } from "motion/react";

interface UserAccountHeaderProps {
  profile: UserProfile;
  onChangeEmail: (email: string) => void;
  onActivateCode: (code: string) => Promise<{ success: boolean; message: string; status?: string }>;
  onBuySimulate?: (packet: "BASIC" | "PRO") => void;
  onSelectPaket: (paket: "TRIAL" | "BASIC" | "PRO") => void;
}

export default function UserAccountHeader({
  profile,
  onChangeEmail,
  onActivateCode,
  onSelectPaket,
}: UserAccountHeaderProps) {
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState(profile.email);
  const [activationCode, setActivationCode] = useState("");
  const [activationMsg, setActivationMsg] = useState<{ type: "success" | "error"; text: string; status?: string } | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const handleSaveEmail = () => {
    if (tempEmail.trim() && tempEmail.includes("@")) {
      onChangeEmail(tempEmail.trim().toLowerCase());
      setIsEditingEmail(false);
    }
  };

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

  return (
    <div className="bg-white border-b border-slate-200 py-6 px-4 md:px-8 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* User Card */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Akun Pengguna</div>
            {isEditingEmail ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 p-2 w-60 outline-hidden font-mono"
                />
                <button
                  onClick={handleSaveEmail}
                  className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setTempEmail(profile.email);
                    setIsEditingEmail(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs px-2 font-semibold"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 text-base">{profile.email}</span>
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="text-blue-600 hover:text-blue-800 text-xs ml-1 font-semibold hover:underline"
                >
                  Ubah Email
                </button>
              </div>
            )}

            {/* Badge & Quota */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  profile.paket === "PRO"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : profile.paket === "BASIC"
                    ? "bg-slate-100 text-slate-800 border-slate-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                <Shield className="w-3 h-3" />
                Tier: <strong className="font-extrabold">{profile.paket}</strong>
              </span>

              <span className="text-xs text-slate-500">
                Screening Tersisa:{" "}
                <strong className={`font-bold ${profile.screeningSisa === "Unlimited" ? "text-blue-600" : "text-slate-800"}`}>
                  {profile.screeningSisa}
                </strong>
              </span>

              {profile.tanggalBerlaku && (
                <span className="text-xs text-slate-400 italic">
                  Berlaku hingga: {profile.tanggalBerlaku}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Package Selector Widget */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Pilih Mode Paket</h4>
            <p className="text-[10.5px] text-slate-400 font-medium">Uji coba semua fitur secara langsung tanpa kode / biaya</p>
          </div>

          <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/40 gap-1.5 shrink-0 align-middle">
            {(["TRIAL", "BASIC", "PRO"] as const).map((t) => {
              const isActive = profile.paket === t;
              return (
                <button
                  key={t}
                  onClick={() => onSelectPaket(t)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer select-none ${
                    isActive
                      ? t === "PRO"
                        ? "bg-blue-600 text-white shadow-sm"
                        : t === "BASIC"
                        ? "bg-slate-800 text-white shadow-sm"
                        : "bg-slate-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
