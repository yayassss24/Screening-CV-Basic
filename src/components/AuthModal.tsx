import React, { useState } from "react";
import { X, User, Lock, LogIn, UserPlus } from "lucide-react";
import { loginWithUsername, registerWithUsername } from "../firebase";

interface AuthModalProps {
  onClose: () => void;
  onError: (msg: string) => void;
}

export default function AuthModal({ onClose, onError }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          onError("Konfirmasi password tidak cocok");
          setLoading(false);
          return;
        }
        if (username.length < 3) {
          onError("Username minimal 3 karakter");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          onError("Password minimal 6 karakter");
          setLoading(false);
          return;
        }
        await registerWithUsername(username, password);
      } else {
        await loginWithUsername(username, password);
      }
      onClose();
    } catch (err: any) {
      const fbCode = err.code || "";
      if (fbCode === "auth/user-not-found" || fbCode === "auth/invalid-credential") {
        onError("Username atau password salah");
      } else if (fbCode === "auth/email-already-in-use") {
        onError("Username sudah terdaftar");
      } else if (fbCode === "auth/too-many-requests") {
        onError("Terlalu banyak percobaan, coba lagi nanti");
      } else {
        onError(err.message || "Terjadi kesalahan");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            {mode === "login" ? <LogIn className="w-6 h-6 text-blue-600" /> : <UserPlus className="w-6 h-6 text-blue-600" />}
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {mode === "login" ? "Masuk" : "Daftar Akun"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "login" ? "Masuk dengan username dan password" : "Buat akun baru dengan username"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="Masukkan username"
                autoComplete={mode === "login" ? "username" : "new-username"}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder={mode === "login" ? "Masukkan password" : "Minimal 6 karakter"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Konfirmasi Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-2.5 px-4 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={switchMode}
            className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline cursor-pointer"
          >
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
}
