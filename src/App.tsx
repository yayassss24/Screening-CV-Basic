import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { 
  FileText, 
  Briefcase, 
  AlertCircle, 
  TrendingUp, 
  HelpCircle, 
  Lightbulb, 
  Sparkles, 
  History, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Download, 
  Plus, 
  ChevronRight, 
  BookOpen, 
  Users, 
  Coins, 
  Check, 
  RefreshCw, 
  KeyRound,
  MessageSquare,
  Send,
  Upload,
  X,
  Shield
} from "lucide-react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { 
  deleteDoc, 
  doc, 
  setDoc,
} from "firebase/firestore";
import { auth, logOut, db } from "./firebase";
import { JagoCVAnalysisResult, UserProfile, SavedAnalysis } from "./types";
import UserAccountHeader from "./components/UserAccountHeader";
import FileUploaderDropzone from "./components/FileUploaderDropzone";
import AuthModal from "./components/AuthModal";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

// Template Candidates for quick preview
const TEMPLATES = [
  {
    name: "Software Engineer (Strong Matching CV)",
    role: "Senior React & Node Developer",
    cv: `BUDI SANTOSO
Jakarta, Indonesia | budi.santoso@email.com | +62 812-3456-7890 | linkedin.com/in/budisantoso

PROFIL PROFESIONAL
Software Engineer berpengalaman 5 tahun berfokus pada pengembangan aplikasi web skala besar menggunakan React, Node.js, dan cloud architecture (GCP/AWS). Terbiasa memimpin tim kecil dan melakukan optimalisasi performa database.

PENGALAMAN KERJA
Senior Software Engineer | PT Digital Maju Sejahtera | Jan 2023 - Sekarang
- Memimpin perancangan frontend dashboard fintech menggunakan React & TypeScript, menghasilkan peningkatan load-time 40% lebih cepat.
- Mengintegrasikan RESTful API dan GraphQL backend menggunakan Node.js (Express), menangani hingga 10,000 requests per minute tanpa downtime.
- Mengurangi bug kritis sebesar 25% di lini produksi dengan membuat automated unit testing menggunakan Jest dan React Testing Library.

Software Developer | PT Solusi Kilat Indonesia | Jul 2020 - Des 2022
- Membangun e-commerce react-native app dari nol yang mencapai 50,000+ unduhan aktif di Google Play Store dan Apple App Store.
- Berkolaborasi dengan 4 UI/UX designer dalam membangun modular design system menggunakan Tailwind CSS, memangkas waktu coding frontend baru sebesar 15%.
- Mengoptimalkan query PostgreSQL database SQL yang mengurangi server resources usage sebesar 30%.

KEAHLIAN TEKNIS
- Bahasa: TypeScript, JavaScript, SQL, HTML, CSS
- Framework: React, Node.js, Express, Next.js, React Native
- Database & DevOps: PostgreSQL, MongoDB, Docker, Git, GCP, Jest, Tailwind CSS

SERTIFIKASI
- Google Cloud Certified Professional Cloud Developer (2024)
- React Advanced Engineering Cert (2022)`,
    jd: `Situs Belanja Maju Terus mencari Senior React Software Developer berbakat untuk mengoptimalkan platform pasar digital kami.

Tanggung Jawab Utama:
- Mendesain dashboard frontend web menggunakan React dan TypeScript yang responsif.
- Membantu meningkatkan load-time aplikasi dan merancang modul reusable system berbasis Tailwind CSS.
- Mengembangkan backend server tangguh menggunakan Node.js dan Express untuk menangani high traffic.
- Menggunakan database modern seperti PostgreSQL untuk optimalisasi query database.
- Bekerja sama dalam tim tech dengan platform GCP dan melakukan unit testing Jest.

Kualifikasi Wajib (Critical Keywords):
- Pengalaman minimal 3 tahun di bidang web development React dan Node.js.
- Memiliki sertifikasi cloud developer GCP merupakan nilai tambah.
- Mahir dalam automated testing menggunakan Jest dan optimasi query PostgreSQL.`,
  },
  {
    name: "Project Engineer EPC (No Numbers / Weak CV)",
    role: "Civil Project Engineer",
    cv: `AGUS WIJAYA
Surabaya, Indonesia | agus.wijaya@email.com

TENTANG SAYA
Civil engineer yang berdedikasi tinggi dengan pengalaman mengawasi jalannya proyek konstruksi sipil dan EPC (Engineering, Procurement, and Construction). Berkompeten dalam koordinasi kontraktor, pengadaan material, serta pembuatan laporan berkala kepada manajemen.

PENGALAMAN KERJA
Civil Engineer | PT Mega Konstruksi Nusantara | 2022 - Sekarang
- Bertanggung jawab penuh atas pengawasan mutu pekerjaan sipil di lapangan proyek EPC.
- Melakukan koordinasi dengan subkontraktor dan tim QC untuk menjamin kualitas beton sesuai spesifikasi.
- Membantu project manager memantau jadwal kedatangan material besi dan semen demi kelancaran pembangunan.
- Menyusun laporan progres konstruksi harian dan mingguan untuk diserahkan ke owner.

Site Engineer | PT Sarana Struktur Utama | 2020 - 2022
- Mengawasi pelaksanaan pengecoran pondasi dan struktur atas gedung perkantoran.
- Membaca gambar detail engineering design (DED) untuk diaplikasikan oleh pekerja di lapangan.
- Melakukan problem solving ketika terjadi ketidaksesuaian ukuran gambar kerja di lapangan.

PENDIDIKAN
S1 Teknik Sipil | Universitas Pembangunan Nasional`,
    jd: `PT Energi Hijau Indonesia sedang mencari Project Engineer Sipil EPC senior untuk menangani proyek pembangkit tenaga surya skala nasional di Jawa Timur.

Persyaratan (Keywords):
- Minimal S1 Teknik Sipil dengan pemahaman mendalam gambar kerja DED proyek EPC konstruksi.
- Mampu memimpin tim pengawasan lapangan dan menyusun pencapaian kuantitatif, menjaga ketepatan jadwal, efisiensi timeline target proyek, serta zero NCR (Non-Conformance Report).
- Mahir negosiasi subkontraktor dan koordinasi mutu konstruksi sipil.`,
  },
];

/**
 * Builds a properly structured EMVCo QRIS payload for Indonesian payments.
 * Uses a test merchant PAN — for production, replace with a real QRIS merchant ID from your bank.
 */
function buildQRIS(nominal?: number): string {
  // === HEADER ===
  // 00: Payload Format Indicator (01)
  // 01: Point of Initiation Method (11=static, 12=dynamic)
  let out = "000201010211";

  // === ID 26: Merchant Account Information (QRIS) ===
  // Sub 00: National Merchant PAN — this is the QRIS merchant ID
  const pan = "9360000020002047124";
  // Sub 01: Merchant name
  const merchantName = "JAGOCV, KONSTRUKSI & L";
  // Sub 02: Merchant Criteria
  const criteria = "UME";
  // Sub 03: API Version
  const apiVer = "03";

  const sub00 = "00" + String(pan.length).padStart(2, "0") + pan;
  const sub01 = "01" + String(merchantName.length).padStart(2, "0") + merchantName;
  const sub02 = "02" + String(criteria.length).padStart(2, "0") + criteria;
  const sub03 = "03" + String(apiVer.length).padStart(2, "0") + apiVer;

  const id26content = sub00 + sub01 + sub02 + sub03;
  out += "26" + String(id26content.length).padStart(2, "0") + id26content;

  // === ID 51: Payment System Specific (GPN template) ===
  // Minimal content: network ID and merchant PAN
  const netId = "ID.CO.QRPAY.WWW";
  const id51sub00 = "00" + String(netId.length).padStart(2, "0") + netId;
  const id51sub01 = "01" + String(pan.length).padStart(2, "0") + pan;
  const id51content = id51sub00 + id51sub01;
  out += "51" + String(id51content.length).padStart(2, "0") + id51content;

  // === ID 52: Merchant Category Code ===
  out += "52044812";

  // === ID 53: Transaction Currency (360 = IDR) ===
  out += "5303360";

  // === ID 54: Transaction Amount (if nominal provided) ===
  if (nominal && nominal > 0) {
    const amt = Math.round(nominal).toString();
    out += "54" + String(amt.length).padStart(2, "0") + amt;
  }

  // === ID 58: Country Code ===
  out += "5802ID";

  // === ID 59: Merchant Name (full) ===
  const fullName = "JAGOCV, KONSTRUKSI & LAYANAN UMUM";
  out += "59" + String(fullName.length).padStart(2, "0") + fullName;

  // === ID 60: Merchant City ===
  const city = "KAB. KEDIRI";
  out += "60" + String(city.length).padStart(2, "0") + city;

  // === ID 61: Postal Code ===
  out += "610564115";

  // === ID 62: Additional Data (bill number / reference) ===
  const billRef = "0703A01";
  const id62content = "07" + String(billRef.length).padStart(2, "0") + billRef;
  out += "62" + String(id62content.length).padStart(2, "0") + id62content;

  // === ID 63: CRC (4 hex chars, computed over the entire payload) ===
  let crc = 0xFFFF;
  for (let c = 0; c < out.length; c++) {
    const charCode = out.charCodeAt(c);
    for (let i = 0; i < 8; i++) {
      const bit = ((charCode >> (7 - i)) & 1) ^ ((crc >> 15) & 1);
      crc = crc << 1;
      if (bit === 1) crc = crc ^ 0x1021;
    }
  }
  crc = crc & 0xFFFF;
  out += "6304" + crc.toString(16).toUpperCase().padStart(4, "0");

  return out;
}

function getGuestEmail(): string {
  const key = "jagocv_guest_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = "guest_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

function loadGuestProfile(): UserProfile {
  try {
    const saved = localStorage.getItem("jagocv_guest_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.email) return parsed as UserProfile;
    }
  } catch {}
  return {
    email: getGuestEmail(),
    paket: "TRIAL",
    screeningSisa: 3,
    screeningTotalCount: 0,
  };
}

function saveGuestProfile(p: UserProfile) {
  localStorage.setItem("jagocv_guest_profile", JSON.stringify(p));
}

const GUEST_ANALYSES_KEY = "jagocv_guest_analyses";
const GUEST_ACTIVE_RESULT_KEY = "jagocv_guest_active_result";

function loadGuestAnalyses(): SavedAnalysis[] {
  try {
    const saved = localStorage.getItem(GUEST_ANALYSES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as SavedAnalysis[];
    }
  } catch {}
  return [];
}

function saveGuestAnalysis(item: SavedAnalysis) {
  try {
    const list = loadGuestAnalyses();
    const idx = list.findIndex(a => a.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    localStorage.setItem(GUEST_ANALYSES_KEY, JSON.stringify(list));
  } catch {}
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(loadGuestProfile());

  // Editor Inputs
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFileName, setCvFileName] = useState("CV_Kandidat.pdf");

  // Status variables
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"screen" | "history">("screen");
  const [activeResult, setActiveResult] = useState<JagoCVAnalysisResult | null>(() => {
    try {
      const saved = localStorage.getItem(GUEST_ACTIVE_RESULT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // History report records
  const [historyList, setHistoryList] = useState<SavedAnalysis[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // User transactions tracker
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [resendStatusMsg, setResendStatusMsg] = useState<string | null>(null);
  const [activePaymentModal, setActivePaymentModal] = useState<{
    id: string;
    paket: "BASIC" | "PRO";
    nominal: number;
    status: string;
  } | null>(null);

  // Payment bot states

  // Quota Warning flags (MASALAH 7)
  const [quotaWarningActive, setQuotaWarningActive] = useState(false);
  const [isCachedResult, setIsCachedResult] = useState(false);

  // Last activation code from successful payment (for auto-fill)
  const [lastActivationCode, setLastActivationCode] = useState("");

  // States for modal activation code
  const [modalActivationCode, setModalActivationCode] = useState("");
  const [modalActivationMsg, setModalActivationMsg] = useState<{ type: "success" | "error"; text: string; status?: string } | null>(null);
  const [isSubmittingModalCode, setIsSubmittingModalCode] = useState(false);

  // Package info modal
  const [showPackageModal, setShowPackageModal] = useState<"BASIC" | "PRO" | null>(null);

  // AI Support Chat Bot States & Action Handlers
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [csNamaLengkap, setCsNamaLengkap] = useState("");
  const [csEmailAktif, setCsEmailAktif] = useState("");
  const [csSelectedPackage, setCsSelectedPackage] = useState<"BASIC" | "PRO" | null>(null);
  const [csScreenshotBase64, setCsScreenshotBase64] = useState<string | null>(null);
  const [csScreenshotMime, setCsScreenshotMime] = useState("image/png");
  const [csScreenshotName, setCsScreenshotName] = useState("");
  const [csTransactionId, setCsTransactionId] = useState<string | null>(null);
  const [csAiReason, setCsAiReason] = useState<string | null>(null);
  const [csProblemMessage, setCsProblemMessage] = useState("");
  const [csChatStep, setCsChatStep] = useState<"welcome" | "input_details" | "waiting_payment" | "verifying" | "ask_problem" | "pending_admin" | "success" | "failed">("welcome");
  const [csChatLogs, setCsChatLogs] = useState<Array<{ sender: "user" | "bot"; text: string; image?: string; timestamp: Date }>>([
    {
      sender: "bot" as const,
      text: "Halo! Saya adalah AI Customer Service dan Payment Assistant untuk layanan JagoCV AI Screening CV.\n\nSilakan pilih paket yang ingin Anda gunakan:\n\n1. Basic (Rp75.000)\n2. Pro (Rp100.000)",
      timestamp: new Date()
    }
  ]);

  useEffect(() => {
    if (!csEmailAktif) {
      setCsEmailAktif(currentUser?.email || profile.email || "");
    }
  }, [currentUser, profile.email]);

  useEffect(() => {
    if (csChatStep !== "pending_admin") return;
    const interval = setInterval(async () => {
      const email = csEmailAktif;
      if (!email) return;
      try {
        const res = await fetch(`/api/billing/transactions?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.transactions?.length) return;
        const latestTx = data.transactions[0];
        if (latestTx.status === "PAID") {
          setLastActivationCode(latestTx.codePlainForDb || "");
          setCsChatStep("success");
          setCsChatLogs(prev => [...prev, {
            sender: "bot" as const,
            text: `🎉 Pembayaran Anda telah **DIVERIFIKASI** oleh admin! Paket **${csSelectedPackage}** Anda siap digunakan.`,
            timestamp: new Date()
          }]);
        } else if (latestTx.status === "FAILED") {
          setCsChatStep("failed");
          setCsChatLogs(prev => [...prev, {
            sender: "bot" as const,
            text: `❌ Pembayaran Anda **DITOLAK** oleh admin. Silakan hubungi admin untuk informasi lebih lanjut atau lakukan pembayaran ulang.`,
            timestamp: new Date()
          }]);
        }
      } catch (err) {
        console.error("Gagal polling status transaksi:", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [csChatStep, csEmailAktif, csSelectedPackage]);

  const handleCsSelectPackage = (paket: "BASIC" | "PRO") => {
    setCsSelectedPackage(paket);
    const nominal = paket === "PRO" ? 100000 : 75000;
    const updatedLogs = [
      ...csChatLogs,
      {
        sender: "user" as const,
        text: `Saya memilih paket: ${paket}`,
        timestamp: new Date()
      },
      {
        sender: "bot" as const,
        text: `Silakan scan QRIS di bawah untuk pembayaran **Rp ${nominal.toLocaleString("id-ID")}** menggunakan aplikasi perbankan/e-wallet Anda. Setelah sukses, lanjutkan ke tahap berikutnya.`,
        image: "https://raw.githubusercontent.com/yayassss24/ai-screening-cv/main/ChatGPT%20Image%20Jun%202%2C%202026%2C%2002_49_01%20PM.png",
        timestamp: new Date()
      }
    ];
    setCsChatLogs(updatedLogs);
    setCsChatStep("input_details");
  };

  const handleCsSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csNamaLengkap.trim() || !csEmailAktif.trim()) return;

    const updatedLogs = [
      ...csChatLogs,
      {
        sender: "user" as const,
        text: `Data Pelanggan:\n• Nama Lengkap: ${csNamaLengkap}\n• Email Aktif: ${csEmailAktif}`,
        timestamp: new Date()
      },
      {
        sender: "bot" as const,
        text: "Silakan scan QRIS dan lakukan pembayaran sesuai paket yang dipilih, kemudian unggah bukti pembayaran.",
        image: "https://raw.githubusercontent.com/yayassss24/ai-screening-cv/main/ChatGPT%20Image%20Jun%202%2C%202026%2C%2002_49_01%20PM.png",
        timestamp: new Date()
      }
    ];
    setCsChatLogs(updatedLogs);
    setCsChatStep("waiting_payment");
  };

  const handleCsScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsScreenshotName(file.name);
      setCsScreenshotMime(file.type || "image/png");

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Payload = (reader.result as string).split(",")[1];
          setCsScreenshotBase64(base64Payload);

          const updatedLogsBeforeFetch = [
            ...csChatLogs,
            {
              sender: "user" as const,
              text: `Mengunggah bukti transfer berhasil: ${file.name}`,
              timestamp: new Date()
            },
            {
              sender: "bot" as const,
              text: "Terima kasih. Bukti pembayaran Anda sedang diverifikasi oleh admin.",
              timestamp: new Date()
            }
          ];
          setCsChatLogs(updatedLogsBeforeFetch);
          setCsChatStep("verifying");

          // 1. Create Transaction in Backend (PENDING VERIFIKASI MANUAL) with screenshot
          const txRes = await fetch("/api/billing/create-transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: csEmailAktif,
              paket: csSelectedPackage,
              source: "cs_chatbot",
              screenshotBase64: base64Payload,
              screenshotMimeType: file.type || "image/png",
            })
          });
          const txData = await txRes.json();
          if (!txData.success) {
            throw new Error(txData.error || "Gagal membuat ID Transaksi.");
          }

          const transactionId = txData.transactionId;
          setCsTransactionId(transactionId);

          if (txData.status === "PAID") {
            // ✅ Pembayaran diterima — notifikasi sukses
            setCsChatStep("success");
            setCsChatLogs(prev => [
              ...prev,
              {
                sender: "bot" as const,
                text: `✅ **Pembayaran Terverifikasi!**

Terima kasih! Pembayaran Anda telah diverifikasi otomatis oleh OCR dan cocok dengan harga pesanan.

Kode aktivasi telah dikirim ke email Anda. Silakan cek inbox (atau folder spam) untuk mengaktifkan paket **${txData.paket}** Anda.`,
                timestamp: new Date()
              }
            ]);
          } else if (txData.status === "FAILED") {
            // ❌ Pembayaran ditolak
            const reasonText = txData.ai_reason
              ? `\n\n📌 **Alasan:** ${txData.ai_reason}`
              : "";
            setCsAiReason(txData.ai_reason || null);
            setCsChatStep("ask_problem");
            setCsChatLogs(prev => [
              ...prev,
              {
                sender: "bot" as const,
                text: `❌ **Pembayaran Ditolak**${reasonText}

Silakan unggah ulang bukti pembayaran yang benar melalui CS.`,
                timestamp: new Date()
              }
            ]);
          } else {
            // ⚠️ OCR gagal — eskalasi ke admin
            setCsChatStep("pending_admin");
            setCsChatLogs(prev => [
              ...prev,
              {
                sender: "bot" as const,
                text: `✅ Bukti transfer berhasil diupload!

📋 ID Transaksi: ${transactionId}

⏳ Status: **MENUNGGU VERIFIKASI ADMIN**

Pembayaran Anda sedang diperiksa oleh tim admin. Silakan tunggu konfirmasi.
Proses verifikasi biasanya memakan waktu 1-2 jam. Anda akan mendapat notifikasi setelah dikonfirmasi.

Jika ada pertanyaan, hubungi admin via WhatsApp.`,
                timestamp: new Date()
              },
              {
                sender: "bot" as const,
                text: `💡 Tips: Simpan ID Transaksi di atas untuk memudahkan komunikasi dengan admin.`,
                timestamp: new Date()
              }
            ]);
          }
          await fetchTransactions();
        } catch (err: any) {
          console.error("Gagal melakukan otomatisasi pembayaran JagoCV via CS Bot:", err);
          setCsChatStep("failed");
          setCsChatLogs(prev => [
            ...prev,
            {
              sender: "bot" as const,
              text: `Pembayaran belum dapat diverifikasi.\n\nDetail kendala teknis: ${err.message}.\n\nSilakan unggah unduhan bukti transfer yang valid dan coba kembali atau hubungi support kami.`,
              timestamp: new Date()
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCsSubmitProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csProblemMessage.trim() || !csTransactionId) return;

    try {
      const res = await fetch(`/api/billing/transactions/${csTransactionId}/user-feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemDescription: csProblemMessage.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch (err: any) {
      console.error("Gagal menyimpan masalah:", err);
    }

    setCsChatLogs(prev => [
      ...prev,
      {
        sender: "user" as const,
        text: `📝 Masalah: ${csProblemMessage.trim()}`,
        timestamp: new Date()
      },
      {
        sender: "bot" as const,
        text: `Terima kasih! Masalah Anda telah dicatat. Admin kami akan memeriksa bukti transfer dan keterangan Anda.

⏳ Status: **MENUNGGU VERIFIKASI ADMIN**
📋 ID Transaksi: ${csTransactionId}

Proses verifikasi biasanya memakan waktu 1-2 jam. Anda akan mendapat notifikasi setelah dikonfirmasi.`,
        timestamp: new Date()
      }
    ]);
    setCsProblemMessage("");
    setCsChatStep("pending_admin");
    await fetchTransactions();
  };

  const handleCsResetChat = () => {
    setCsNamaLengkap("");
    setCsSelectedPackage(null);
    setCsScreenshotBase64(null);
    setCsScreenshotName("");
    setCsTransactionId(null);
    setCsAiReason(null);
    setCsProblemMessage("");
    setLastActivationCode("");
    setCsChatStep("welcome");
    setCsChatLogs([
      {
        sender: "bot" as const,
        text: "Halo! Saya adalah AI Customer Service dan Payment Assistant untuk JagoCV AI Screening CV.\n\nSilakan pilih paket yang ingin Anda gunakan:\n\n1. Basic (Rp75.000)\n2. Pro (Rp100.000)",
        timestamp: new Date()
      }
    ]);
  };

  const handleCvUploadError = (err: string) => {
    setErrorMsg(err);
  };

  const handleJdUploadError = (err: string) => {
    setErrorMsg(err);
  };

  const fetchTransactions = async () => {
    try {
      const email = currentUser?.email || profile.email;
      if (!email) return;
      setLoadingTransactions(true);
      const res = await fetch(`/api/billing/transactions?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTransactions(data.transactions || []);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat transaksi:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentUser, profile.email]);

  // Quote carousel timer
  const recruiterQuotes = [
    "Membaca struktur file resume...",
    "Mencari kata kunci kritikal (Keywords Match)...",
    "Melakukan scanning layout bar & multi-kolom...",
    "Menghitung metrik & skor pencapaian kuantitatif...",
    "Menganalisis perkembangan jabatan (Career Progression)...",
    "Memformulasikan strategi rewrite XYZ ala Google...",
    "Mensimulasikan perspektif recruiter Fortune 500...",
  ];

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const email = user.email || "";
        if (email) {
          await fetchProfile(email);
        }
      } else {
        setCurrentUser(null);
        const guestEmail = getGuestEmail();
        const saved = loadGuestProfile();
        setProfile(saved);
        await fetchProfile(guestEmail);
      }
    });
    return () => unsubscribe();
  }, []);



  // Persist activeResult to localStorage for guest users
  useEffect(() => {
    if (!currentUser && activeResult) {
      localStorage.setItem(GUEST_ACTIVE_RESULT_KEY, JSON.stringify(activeResult));
    }
  }, [activeResult, currentUser]);

  // Monitor and list users reports history (Dual-mode: Firestore for Auth users, REST API for Guests)
  useEffect(() => {
    const activeEmail = currentUser?.email || profile.email;
    if (!activeEmail) return;

    if (currentUser) {
      const loadHistory = async () => {
        try {
          const r = await fetch(`/api/ats/history?email=${encodeURIComponent(activeEmail)}`);
          if (r.ok) {
            const d = await r.json();
            if (d.success && d.history) setHistoryList(d.history);
          }
        } catch (err) {
          console.error("Gagal memuat history:", err);
        }
      };
      loadHistory();
    } else {
      // Load guest analyses from localStorage first (immediate)
      setHistoryList(loadGuestAnalyses());

      // Then sync with server in background
      const fetchApiHistory = async () => {
        try {
          const response = await fetch(`/api/ats/history?email=${encodeURIComponent(activeEmail)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.history && data.history.length > 0) {
              // Merge server data with local (server may have newer items)
              const localList = loadGuestAnalyses();
              const serverIds = new Set(data.history.map((a: SavedAnalysis) => a.id));
              const merged = [...data.history];
              for (const item of localList) {
                if (!serverIds.has(item.id)) merged.push(item);
              }
              merged.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
              setHistoryList(merged);
              localStorage.setItem(GUEST_ANALYSES_KEY, JSON.stringify(merged));
            }
          }
        } catch (err) {
          console.error("Gagal sinkronasi history melalui REST API: ", err);
        }
      };
      fetchApiHistory();
    }
  }, [currentUser, profile.email]);

  const fetchProfile = async (email: string) => {
    try {
      const response = await fetch(`/api/profile?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (data.success && data.profile) {
        if (!currentUser) {
          // For guests, use localStorage as source of truth (server may return stale
          // data due to ephemeral /tmp on Vercel serverless)
          const localProfile = loadGuestProfile();
          const isLocalNewer = localProfile.screeningTotalCount >= data.profile.screeningTotalCount &&
            localProfile.email === data.profile.email;
          if (isLocalNewer) {
            setProfile(localProfile);
            return;
          }
        }
        setProfile(data.profile);
        if (!currentUser) saveGuestProfile(data.profile);
      }
    } catch (err) {
      console.error("Gagal memuat profil: ", err);
    }
  };

  const handleEmailChange = async (newEmail: string) => {
    setProfile(prev => ({ ...prev, email: newEmail }));
    await fetchProfile(newEmail);
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setProfile({
        email: getGuestEmail(),
        paket: "TRIAL",
        screeningSisa: 3,
        screeningTotalCount: 0,
      });
    } catch (err: any) {
      setErrorMsg(`Gagal logout: ${err.message}`);
    }
  };

  const getUsername = () => {
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split("@")[0];
    return "";
  };

  // Handle template loader
  const loadTemplate = (index: number) => {
    setCvText(TEMPLATES[index].cv);
    setJobDescription(TEMPLATES[index].jd);
    setCvFileName(`${TEMPLATES[index].role.replace(/ /g, "_")}_CV.txt`);
  };

  // Voucher validation redeemer
  const handleActivateCode = async (code: string): Promise<{ success: boolean; message: string; status?: string }> => {
    try {
      setErrorMsg(null);
      const response = await fetch("/api/billing/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser?.email || profile.email,
          code,
        }),
      });
      const resData = await response.json();
      if (resData.status === "ACTIVE") {
        await fetchProfile(currentUser?.email || profile.email);
        await fetchTransactions(); // Refresh transactions
        return { success: true, message: resData.message || "Aktivasi berhasil!" };
      }
      return { success: false, message: resData.message || "Gagal mengaktifkan kode.", status: resData.status };
    } catch (err: any) {
      return { success: false, message: `Gagal memproses kode voucher: ${err.message}` };
    }
  };

  const handleSelectPaket = async (paket: "BASIC" | "PRO") => {
    try {
      const activeEmail = currentUser?.email || profile.email;
      const response = await fetch("/api/profile/select-paket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail, paket }),
      });
      const data = await response.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
      }
    } catch (err: any) {
      console.error("Gagal mengganti paket:", err);
    }
  };

  const handlePackageClick = (paket: "BASIC" | "PRO") => {
    setShowPackageModal(paket);
  };

  const handleOpenCSChat = (paket: "BASIC" | "PRO") => {
    setShowPackageModal(null);
    setCsSelectedPackage(paket);
    setCsChatStep("input_details");
    setIsChatOpen(true);
    setCsChatLogs([
      {
        sender: "bot" as const,
        text: `Anda memilih **Paket ${paket}**.\n\nSilakan masukkan data diri Anda untuk melanjutkan ke pembayaran.`,
        timestamp: new Date()
      }
    ]);
  };

  const handleModalCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalActivationCode.trim()) return;
    setIsSubmittingModalCode(true);
    setModalActivationMsg(null);
    const result = await handleActivateCode(modalActivationCode.trim());
    setIsSubmittingModalCode(false);
    if (result.success) {
      setModalActivationMsg({
        type: "success",
        text: result.message || "Hore! Kode berhasil diaktifkan."
      });
      setModalActivationCode("");
      setTimeout(() => {
        setActivePaymentModal(null);
        setModalActivationMsg(null);
      }, 3000);
    } else {
      setModalActivationMsg({
        type: "error",
        text: result.message || "Aktivasi gagal. Periksa kembali kode lisensi Anda.",
        status: result.status
      });
    }
  };

  // Initiate QRIS payment gateway
  const handleBuySimulate = async (paket: "BASIC" | "PRO") => {
    try {
      setErrorMsg(null);
      setResendStatusMsg(null);
      const email = currentUser?.email || profile.email;
      if (!email) {
        setErrorMsg("Identitas email kosong. Silakan masuk terlebih dahulu.");
        return;
      }
      const response = await fetch("/api/billing/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          paket,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setActivePaymentModal({
          id: data.transactionId,
          paket: data.paket,
          nominal: data.nominal,
          status: data.status,
        });
        await fetchTransactions();
      } else {
        setErrorMsg(data.error || "Gagal membuat invoice pembayaran.");
      }
    } catch (err: any) {
      setErrorMsg(`Gagal menginisiasi tagihan: ${err.message}`);
    }
  };

  // Kirim Ulang Code via Email (Strict Limits checking)
  const handleResendCode = async (transactionId: string) => {
    try {
      setErrorMsg(null);
      setResendStatusMsg(null);
      const email = currentUser?.email || profile.email;
      const response = await fetch("/api/billing/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          email,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setResendStatusMsg(`SUKSES: Kode aktivasi berhasil dikirim ulang! Silakan periksa kotak masuk email Anda (${email}).`);
        await fetchTransactions();
      } else {
        setErrorMsg(data.error || "Gagal memproses 'Resend'.");
      }
    } catch (err: any) {
      setErrorMsg(`Gagal mematangkan resend: ${err.message}`);
    }
  };

  // Clean Report delete histories (Server + Firestore)
  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setErrorMsg(null);
      
      // Delete on server-side db.json
      const response = await fetch(`/api/ats/history/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Gagal menghapus data laporan dari database server.");
      }

      // Delete on Firebase Firestore if user is authenticated
      if (currentUser) {
        await deleteDoc(doc(db, "saved_analyses", id));
      } else {
        // Force list update manually for guest sessions
        setHistoryList(prev => prev.filter(item => item.id !== id));
      }

      if (selectedHistoryId === id) {
        setSelectedHistoryId(null);
        setActiveResult(null);
      }
    } catch (err: any) {
      setErrorMsg(`Kendala menghapus history: ${err.message}`);
    }
  };

  // Core ATS Analysis handler
  const handleAtsScreening = async (forceRefresh = false) => {
    if (!cvText.trim() || !jobDescription.trim()) {
      setErrorMsg("Tolong lampirkan CV dan Job Description ya. Tanpa keduanya analisis tidak bisa akurat.");
      return;
    }

    setLoading(true);
    let quoteIndex = 0;
    setLoadingMsg(recruiterQuotes[0]);
    setErrorMsg(null);

    const interval = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % recruiterQuotes.length;
      setLoadingMsg(recruiterQuotes[quoteIndex]);
    }, 2800);

    try {
      const response = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser?.email || profile.email,
          cvText,
          jobDescription,
          coverLetter,
          cvName: cvFileName,
          forceRefresh,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal melakukan screening CV.");
      }

      const resData = await response.json();
      if (resData.success && resData.data) {
        setActiveResult(resData.data);
        setActiveTab("screen");
        setQuotaWarningActive(!!resData.quotaWarning);
        setIsCachedResult(!!resData.cached);

        // Safe synchronization write to Firestore if logged in
        const freshAnalysisId = resData.analysisId;
        const savedItem = {
          id: freshAnalysisId,
          email: currentUser?.email || profile.email,
          paket: resData.profile?.paket || profile.paket,
          tanggal: new Date().toISOString().split("T")[0],
          cvKandidatName: cvFileName,
          jobTitle: resData.data.meta?.posisi || "Posisi Lamaran",
          skorAkhir: resData.data.hireability_score?.nilai || 75,
          data: resData.data,
        };
        if (currentUser) {
          await setDoc(doc(db, "saved_analyses", freshAnalysisId), savedItem);
        } else {
          // Save to localStorage for guest users (serverless /tmp is ephemeral on Vercel)
          saveGuestAnalysis(savedItem as SavedAnalysis);
          setHistoryList(prev => {
            const filtered = prev.filter(a => a.id !== savedItem.id);
            return [savedItem as SavedAnalysis, ...filtered];
          });
        }

        // Use profile from response for immediate update
        if (resData.profile) {
          setProfile(resData.profile);
          if (!currentUser) saveGuestProfile(resData.profile);
        } else {
          await fetchProfile(currentUser?.email || profile.email);
        }
      }
    } catch (err: any) {
      clearInterval(interval);
      setErrorMsg(err.message || "Pembacaan sistem AI terputus.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAnalysisPDF = () => {
    if (!activeResult) return;
    
    const doc = new jsPDF("p", "mm", "a4");
    
    // Core Layout Parameters
    let y = 20;
    const pageHeight = 297;
    const marginX = 15;
    const contentWidth = 180; // 210 - (2 * 15)

    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > pageHeight - 25) {
        doc.addPage();
        y = 25;
      }
    };

    // Safe multi-line wrapped text printer that dynamically grows 'y'
    const writeWrapped = (
      text: string, 
      width: number = contentWidth, 
      fontSize: number = 9, 
      fontStyle: "normal" | "bold" | "italic" | "bolditalic" = "normal", 
      color: [number, number, number] = [30, 41, 59], 
      offsetLeft: number = 0, 
      lineHeight: number = 4.5, 
      spacingAfter: number = 2
    ) => {
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, width);
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, marginX + offsetLeft, y);
        y += lineHeight;
      });
      y += spacingAfter;
    };

    // Standard section heading divider
    const drawSectionDivider = (title: string) => {
      checkPageBreak(25);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate 900
      doc.text(title, marginX, y);
      y += 2.5;

      doc.setDrawColor(37, 99, 235); // blue 600
      doc.setLineWidth(0.6);
      doc.line(marginX, y, marginX + contentWidth, y);
      y += 6;
    };

    // 1. Header Blue Banner
    checkPageBreak(30);
    doc.setFillColor(37, 99, 235); // Blue 600
    doc.rect(marginX, y, contentWidth, 25, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("JAGOCV AI — LAPORAN SCREENING ATS", marginX + 7, y + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(219, 234, 254);
    doc.text("Enterprise Matchmaking Optimizer & Senior Recruiter Core Engine", marginX + 7, y + 17);
    
    y += 31; // height of banner + margin

    // 2. Screening Information Panel
    checkPageBreak(36);
    doc.setFillColor(248, 250, 252); // slate 50
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.rect(marginX, y, contentWidth, 32, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text("INFORMASI SCREENING", marginX + 6, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nama Kandidat   : ${activeResult?.meta?.kandidat || "Kandidat JagoCV"}`, marginX + 6, y + 14);
    doc.text(`Tanggal Uji      : ${activeResult?.meta?.tanggal_analisis || "Hari ini"}`, marginX + 95, y + 14);
    
    doc.text(`Posisi Dilamar   : ${activeResult?.meta?.posisi || "Posisi Lamaran"}`, marginX + 6, y + 20);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(`Lisensi Paket    : Paket ${activeResult?.meta?.paket || "BASIC"}`, marginX + 95, y + 20);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const tanggalText = activeResult?.meta?.tanggal_analisis || "";
    doc.text(`ID Laporan       : JCV-REP-${tanggalText ? tanggalText.replace(/ /g, "")?.slice(-8) : "GEN"}`, marginX + 6, y + 26);

    y += 38; // height of metadata block + bottom layout space

    // 3. Match Score Overview Badge
    checkPageBreak(32);
    const boxY = y;
    doc.setFillColor(241, 245, 249); // slate 100
    doc.setDrawColor(203, 213, 225); // slate 300
    doc.rect(marginX, boxY, contentWidth, 25, "FD");

    const scoreVal = activeResult?.hireability_score?.nilai || 0;
    let scoreBgColor: [number, number, number] = [16, 185, 129]; // Emerald
    let statusLabel = "SANGAT LAYAK";
    if (scoreVal < 60) {
      scoreBgColor = [244, 63, 94]; // Rose
      statusLabel = "PERLU PERBAIKAN BESAR";
    } else if (scoreVal < 75) {
      scoreBgColor = [245, 158, 11]; // Amber
      statusLabel = "PERLU PERBAIKAN";
    } else if (scoreVal < 90) {
      scoreBgColor = [37, 99, 235]; // Blue 600
      statusLabel = "LAYAK (DENGAN REKOMENDASI)";
    }

    doc.setFillColor(scoreBgColor[0], scoreBgColor[1], scoreBgColor[2]);
    doc.rect(marginX + 5, boxY + 4, 30, 17, "F");
    
    // Draw centered score
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`${scoreVal}`, marginX + 20, boxY + 14, { align: "center" });

    // Overview details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("MATCH SCORE OVERVIEW", marginX + 42, boxY + 8);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(scoreBgColor[0], scoreBgColor[1], scoreBgColor[2]);
    doc.text(`Status Rekomendasi: ${activeResult?.hireability_score?.status || statusLabel}`, marginX + 42, boxY + 13);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Analisis kecocokan CV pelamar dengan spesifikasi teknis dan kualifikasi lowongan HRD.", marginX + 42, boxY + 18);

    y += 31; // height of score block + spacing

    // 4. Recruiter Commentary Box (Dynamic Height)
    checkPageBreak(25);
    const ringkasanText = activeResult?.hireability_score?.ringkasan || "-";
    const splitCommentary = doc.splitTextToSize(`"Commentary Senior Recruiter: ${ringkasanText}"`, contentWidth - 10);
    const commentaryBoxHeight = splitCommentary.length * 4.5 + 8;
    
    checkPageBreak(commentaryBoxHeight + 5);
    const cmdBoxY = y;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, cmdBoxY, contentWidth, commentaryBoxHeight, "FD");
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(splitCommentary, marginX + 5, cmdBoxY + 5.5);
    
    y += commentaryBoxHeight + 8; // spacing after commentary

    // Parsed CV Data Extraction Section
    if (activeResult.parsed_cv) {
      drawSectionDivider("HASIL EKSTRAKSI RESUME (PARSING ENGINE DETECTED)");
      const cvInfo = activeResult.parsed_cv;
      
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(37, 99, 235);
      doc.text(`Kandidat: ${cvInfo.nama_kandidat || "Tidak Tersedia"}`, marginX, y);
      y += 5.5;

      // Contact details
      const kontak = cvInfo.kontak || {};
      const kontakStr = `Email: ${kontak.email || "-"} | Telp: ${kontak.telepon || "-"} | LinkedIn: ${kontak.linkedin || "-"} | Lokasi: ${kontak.lokasi || "-"}`;
      writeWrapped(kontakStr, contentWidth, 8, "normal", [100, 116, 139], 0, 4, 3);

      // Education & Experience list
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("Latar Belakang Pendidikan:", marginX, y);
      y += 5;
      
      (cvInfo.pendidikan || []).forEach((edu: string) => {
        writeWrapped(`• ${edu}`, contentWidth - 5, 8, "normal", [51, 65, 85], 3, 4, 1.5);
      });
      y += 1.5;

      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("Riwayat Pengalaman Kerja:", marginX, y);
      y += 5;
      
      (cvInfo.pengalaman_kerja || []).forEach((exp: string) => {
        writeWrapped(`• ${exp}`, contentWidth - 5, 8, "normal", [51, 65, 85], 3, 4, 1.5);
      });
      y += 1.5;

      if (profile.paket === "PRO" || profile.paket === "BASIC") {
        if (cvInfo.keahlian_dasar && cvInfo.keahlian_dasar.length > 0) {
          checkPageBreak(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text("Keahlian Inti (Skills):", marginX, y);
          y += 5;
          const skillsStr = cvInfo.keahlian_dasar.join(", ");
          writeWrapped(skillsStr, contentWidth - 5, 8, "normal", [51, 65, 85], 3, 4, 3);
        }
        
        if (cvInfo.tools_sertifikat && cvInfo.tools_sertifikat.length > 0) {
          checkPageBreak(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text("Tools Software & Sertifikasi:", marginX, y);
          y += 5;
          const toolsStr = cvInfo.tools_sertifikat.join(", ");
          writeWrapped(toolsStr, contentWidth - 5, 8, "normal", [51, 65, 85], 3, 4, 3);
        }
      } else {
        checkPageBreak(10);
        writeWrapped("[Keahlian Inti & Tools/Sertifikasi terkunci pada Lisensi TRIAL — Upgrade ke paket BASIC atau PRO untuk mengaktifkan ekstraksi lengkap]", contentWidth, 7.5, "italic", [225, 29, 72], 0, 4, 3);
      }
      y += 3;
    }

    // 5. Score Breakdown Panel
    drawSectionDivider("KATEGORI DETIL MATCH SCORE (0-100)");

    const breakdownItems = Object.entries(activeResult?.breakdown_skor || {});
    breakdownItems.forEach(([label, itemVal]: [string, any]) => {
      checkPageBreak(22);
      
      const itemScore = itemVal?.nilai ?? 0;
      const cleanLabel = label.replace(/_/g, " ").toUpperCase();
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanLabel, marginX, y);
      
      // Select bar color based on score
      let barColor: [number, number, number] = [37, 99, 235];
      if (itemScore < 60) barColor = [244, 63, 94];
      else if (itemScore < 75) barColor = [245, 158, 11];
      else if (itemScore >= 85) barColor = [16, 185, 129];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(barColor[0], barColor[1], barColor[2]);
      doc.text(`${itemScore} / 100`, marginX + contentWidth, y, { align: "right" });
      
      y += 3.5;
      
      // Progress Bar Track
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, y, contentWidth, 2, "F");
      // Progress Bar Fill
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.rect(marginX, y, contentWidth * (itemScore / 100), 2, "F");
      
      y += 5.5;

      // Evaluation Comment Note
      if (itemVal?.catatan) {
        writeWrapped(`Catatan Evaluasi: ${itemVal.catatan}`, contentWidth - 4, 8.5, "normal", [100, 116, 139], 4, 4, 3);
      } else {
        y += 2;
      }
    });

    y += 2;

    // 6. Keyword Evaluation Panel
    drawSectionDivider("ANALISIS KATA KUNCI (KEYWORD EVALUATION)");

    const printKeywordsCategory = (title: string, dataObj: any) => {
      if (!dataObj) return;
      
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(title, marginX, y);
      y += 4.5;

      const ditemukanList = dataObj.ditemukan || [];
      const tidakDitemukanList = dataObj.tidak_ditemukan || [];

      if (ditemukanList.length > 0) {
        checkPageBreak(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(16, 185, 129); // emerald
        doc.text("Ditemukan di dalam CV:", marginX + 3, y);
        y += 4;
        
        const keywordsStr = ditemukanList.join(", ");
        writeWrapped(keywordsStr, contentWidth - 6, 8.5, "normal", [30, 41, 59], 3, 4, 3);
      }

      if (tidakDitemukanList.length > 0) {
        checkPageBreak(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(244, 63, 94); // rose
        doc.text("Hilang / Rekomendasi untuk Ditambahkan:", marginX + 3, y);
        y += 4;
        
        const keywordsStr = tidakDitemukanList.join(", ");
        writeWrapped(keywordsStr, contentWidth - 6, 8.5, "normal", [30, 41, 59], 3, 4, 3);
      }
      y += 1.5;
    };

    if (activeResult?.keyword_analysis) {
      if (activeResult.keyword_analysis.critical) {
        printKeywordsCategory("1. Kata Kunci Utama (Critical Keywords) - WAJIB ADA", activeResult.keyword_analysis.critical);
      }
      if (activeResult.keyword_analysis.important) {
        printKeywordsCategory("2. Kata Kunci Pendukung (Important Keywords) - SANGAT DIANJURKAN", activeResult.keyword_analysis.important);
      }
      if (activeResult.keyword_analysis.optional) {
        printKeywordsCategory("3. Nilai Tambah Kompetitif (Optional Keywords) - DIAGNOSTIK TAMBAHAN", activeResult.keyword_analysis.optional);
      }
    }

    y += 2;

    // 7. CV Structure & Critical Findings Panel
    drawSectionDivider("ANALISIS STRUKTUR & TITIK KRITIS RESUME");

    if (activeResult?.kekuatan_cv && activeResult.kekuatan_cv.length > 0) {
      checkPageBreak(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(16, 185, 129);
      doc.text("Kekuatan Utama CV Pelamar:", marginX, y);
      y += 5.5;

      activeResult.kekuatan_cv.forEach((str: string) => {
        const textLines = doc.splitTextToSize(str, contentWidth - 15);
        checkPageBreak(textLines.length * 4.5 + 2);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(16, 185, 129);
        doc.text("[OK]", marginX + 3, y);
        
        doc.setTextColor(30, 41, 59);
        doc.text(textLines, marginX + 11, y);
        y += textLines.length * 4.5 + 2.5;
      });
      y += 2;
    }

    const redFlags = activeResult?.kelemahan_dan_red_flags?.red_flags || [];
    const kelemahan = activeResult?.kelemahan_dan_red_flags?.kelemahan || [];

    if (redFlags.length > 0 || kelemahan.length > 0) {
      checkPageBreak(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(244, 63, 94);
      doc.text("Kelemahan Evaluatif & Temuan Red Flags:", marginX, y);
      y += 5.5;

      redFlags.forEach((str: string) => {
        const textLines = doc.splitTextToSize(str, contentWidth - 25);
        checkPageBreak(textLines.length * 4.5 + 2);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(244, 63, 94);
        doc.text("[RED FLAG]", marginX + 2, y);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        doc.text(textLines, marginX + 21, y);
        y += textLines.length * 4.5 + 2.5;
      });

      kelemahan.forEach((str: string) => {
        const textLines = doc.splitTextToSize(str, contentWidth - 10);
        checkPageBreak(textLines.length * 4.5 + 2);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("-", marginX + 3, y);
        
        doc.setTextColor(30, 41, 59);
        doc.text(textLines, marginX + 8, y);
        y += textLines.length * 4.5 + 2.5;
      });
      y += 2;
    }

    // ATS Blockers list
    if (activeResult?.ats_blockers && activeResult.ats_blockers.length > 0) {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(245, 158, 11);
      doc.text("Format Blockers (ATS Obstacles Terdeteksi):", marginX, y);
      y += 5.5;

      activeResult.ats_blockers.forEach((blocker: string) => {
        const textLines = doc.splitTextToSize(blocker, contentWidth - 25);
        checkPageBreak(textLines.length * 4.5 + 2);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(245, 158, 11);
        doc.text("[BLOCKER]", marginX + 2, y);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 83, 9);
        doc.text(textLines, marginX + 21, y);
        y += textLines.length * 4.5 + 2.5;
      });
      y += 2;
    }

    // 8. Coaching Action Plan Card Grid (Dynamic layout)
    if (activeResult?.priority_improvement_plan && activeResult.priority_improvement_plan.length > 0) {
      drawSectionDivider("COACHING ACTION PLAN (FORMULA XYZ GOL METRIC)");

      activeResult.priority_improvement_plan.forEach((item: any, idx: number) => {
        const pStr = `Rekomendasi #${idx+1}: Area ${item.area || "Umum"}`;
        const issueStr = `Masalah: ${item.masalah || ""}`;
        const solStr = `Solusi Formula XYZ: ${item.solusi || ""}`;
        const exSblm = `Sebelum: "${item.contoh_sebelum || ""}"`;
        const exSsdh = `Sesudah: "${item.contoh_sesudah || ""}"`;

        const s1 = doc.splitTextToSize(issueStr, contentWidth - 10);
        const s2 = doc.splitTextToSize(solStr, contentWidth - 36); // offset space
        const s3 = doc.splitTextToSize(exSblm, contentWidth - 10);
        const s4 = doc.splitTextToSize(exSsdh, contentWidth - 10);

        // Compute container box height dynamically based on the wrap text lines count
        const cardH = 6 + 4 + (s1.length + s2.length + s3.length + s4.length) * 4.5 + 12;
        checkPageBreak(cardH + 4);

        const cardY = y;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(marginX, cardY, contentWidth, cardH, "FD");

        // left brand stroke layout
        doc.setFillColor(37, 99, 235);
        doc.rect(marginX, cardY, 1.5, cardH, "F");

        y += 5.5;
        // Print Rec Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(37, 99, 235);
        doc.text(pStr, marginX + 4, y);
        y += 5;

        // Print Problem Line
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(s1, marginX + 4, y);
        y += s1.length * 4.5 + 1;
        
        // Print Recommendation Line
        doc.setFont("helvetica", "bold");
        doc.text("Usulan Perbaikan:", marginX + 4, y);
        doc.setFont("helvetica", "normal");
        doc.text(s2, marginX + 32, y);
        y += s2.length * 4.5 + 1;

        // Print Example Before
        doc.setTextColor(244, 63, 94);
        doc.text(s3, marginX + 4, y);
        y += s3.length * 4.5 + 1;

        // Print Example After
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text(s4, marginX + 4, y);
        y += s4.length * 4.5 + 5; // spacing below card base
      });
      y += 2;
    }

    // 9. PRO Services Deep Insights Section
    if (activeResult?.meta?.paket === "PRO") {
      drawSectionDivider("FITUR TAMBAHAN PRO (RESUME REWRITE & RECRUITER INSIGHT)");

      if (activeResult.ai_resume_rewrite) {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text("1. AI Resume Rewrite Highlights", marginX, y);
        y += 5.5;

        if (activeResult.ai_resume_rewrite.catatan) {
          writeWrapped(`Catatan Penulisan: ${activeResult.ai_resume_rewrite.catatan}`, contentWidth, 8.5, "italic", [100, 116, 139], 0, 4.5, 3);
        }

        const rewrites = activeResult.ai_resume_rewrite.contoh_rewrite || [];
        rewrites.slice(0, 4).forEach((rw: any, idx: number) => {
          checkPageBreak(25);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text(`Seksi: ${rw.bagian || "Seksi Kerja"}`, marginX + 3, y);
          y += 4.5;
          
          const asSblm = doc.splitTextToSize(`Lama: ${rw.sebelum || ""}`, contentWidth - 12);
          const asSsdh = doc.splitTextToSize(`Baru: ${rw.sesudah || ""}`, contentWidth - 12);
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(148, 163, 184); // slate 400
          doc.text(asSblm, marginX + 5, y);
          y += asSblm.length * 4.5;

          doc.setFont("helvetica", "bold");
          doc.setTextColor(16, 185, 129); // emerald
          doc.text(asSsdh, marginX + 5, y);
          y += asSsdh.length * 4.5 + 3.5;
        });
        y += 2;
      }

      if (activeResult.recruiter_perspective) {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text("2. Perspektif Recruiter (Mengapa HRD Berminat / Ragu terhadap CV):", marginX, y);
        y += 5.5;
        writeWrapped(activeResult.recruiter_perspective, contentWidth - 5, 8.5, "normal", [71, 85, 105], 0, 4.5, 3);
      }

      if (activeResult.interview_readiness) {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text("3. Prediksi Kesiapan Interview & Pertanyaan Rawan:", marginX, y);
        y += 5.5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`Skor Kesiapan: ${activeResult.interview_readiness.nilai || 70} / 100`, marginX + 3, y);
        y += 4.5;
        
        if (activeResult.interview_readiness.prediksi) {
          writeWrapped(`Prediksi Karir: ${activeResult.interview_readiness.prediksi}`, contentWidth - 10, 8.5, "normal", [100, 116, 139], 3, 4.5, 3);
        }

        const questions = activeResult.interview_readiness.contoh_pertanyaan_rawan || [];
        if (questions.length > 0) {
          checkPageBreak(12);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(244, 63, 94);
          doc.text("Pertanyaan Simulasi Wawancara Berdasarkan Analisis CV:", marginX + 3, y);
          y += 5;

          questions.forEach((q: string) => {
            const wrappedQ = doc.splitTextToSize(q, contentWidth - 15);
            checkPageBreak(wrappedQ.length * 4.5 + 2);
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(244, 63, 94);
            doc.text("Q:", marginX + 4, y);
            
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            doc.text(wrappedQ, marginX + 9, y);
            y += wrappedQ.length * 4.5 + 2.5;
          });
        }
      }

      if (activeResult.skill_development_plan) {
        drawSectionDivider("RENCANA PENGEMBANGAN SKILL MANDIRI (PRO CAREER ROADMAP)");
        const sdp = activeResult.skill_development_plan;
        
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text("1. Analisis Kesenjangan Keahlian (Skill Gaps Course of Action):", marginX, y);
        y += 5.5;

        (sdp.skill_gaps || []).forEach((gap: any) => {
          checkPageBreak(12);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(220, 38, 38); // Red
          doc.text(`• Gap: ${gap.nama || "-"} [Urgensi: ${gap.urgensi || "Sedang"}]`, marginX + 3, y);
          y += 4;
          
          writeWrapped(gap.deskripsi || "", contentWidth - 8, 8, "normal", [71, 85, 105], 4, 4, 3);
        });

        checkPageBreak(25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text("2. Rencana Aksi Pemenuhan Kualifikasi:", marginX, y);
        y += 5.5;

        const ra = sdp.rencana_aksi as { jangka_pendek?: string; jangka_menengah?: string; jangka_panjang?: string } | undefined;
        writeWrapped(`• Jangka Pendek (1-3 bulan): ${ra?.jangka_pendek || "-"}`, contentWidth - 5, 8.5, "normal", [30, 41, 59], 3, 4.5, 2);
        writeWrapped(`• Jangka Menengah (3-6 bulan): ${ra?.jangka_menengah || "-"}`, contentWidth - 5, 8.5, "normal", [30, 41, 59], 3, 4.5, 2);
        writeWrapped(`• Jangka Panjang (6-12 bulan): ${ra?.jangka_panjang || "-"}`, contentWidth - 5, 8.5, "normal", [30, 41, 59], 3, 4.5, 3);

        checkPageBreak(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text("3. Rekomendasi Modul & Sumber Belajar Karir:", marginX, y);
        y += 5.5;

        (sdp.sumber_belajar_rekomendasi || []).forEach((src: any) => {
          checkPageBreak(12);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(37, 99, 235);
          doc.text(`• Platform: ${src.nama_platform || "-"} | Topik: ${src.topik || "-"}`, marginX + 3, y);
          y += 4;
          writeWrapped(`Detail Rekomendasi: ${src.link_or_info || "-"}`, contentWidth - 8, 8, "normal", [71, 85, 105], 4, 4, 3);
        });

        checkPageBreak(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(16, 185, 129);
        doc.text(`Target Skor ATS JagoCV Setelah Perbaikan: ${sdp.target_skor_setelah_perbaikan || 90} / 100`, marginX, y);
        y += 6;
      }

      if (activeResult.cover_letter_premium) {
        drawSectionDivider("SURAT LAMARAN PREMIUM (READY-TO-USE COVER LETTER)");
        const cl = activeResult.cover_letter_premium;
        
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text(`Subjek Email: ${cl.subjek || "-"}`, marginX, y);
        y += 6;

        writeWrapped(cl.full_text || `${cl.pembuka}\n\n${cl.isi}\n\n${cl.penutup}`, contentWidth, 8, "normal", [15, 23, 42], 0, 4, 4);
      }
    }

    // Disclaimer
    checkPageBreak(22);
    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, marginX + contentWidth, y);
    y += 5;
    writeWrapped("Disclaimer: Hasil evaluasi ini dianalisis menggunakan teknologi kecerdasan buatan JagoCV AI. Hasil final wawancara sepenuhnya bergantung pada performa personal, kejujuran kandidat, dan parameter subjektif masing-masing rekrutmen perusahaan terkait.", contentWidth, 7.5, "italic", [148, 163, 184], 0, 4, 2);

    // --- SECOND-PASS POST GENERATION: HEADER / FOOTER AND PAGE NUMBERS SYSTEM ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    const generationDateStr = activeResult?.meta?.tanggal_analisis || new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Muted boundary line above footer
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(marginX, 279, marginX + contentWidth, 279);
      
      // Footer Document Title on Left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85); // Slate 700
      doc.text("LAPORAN HASIL SCREENING ATS - JagoCV AI", marginX, 283.5);
      
      // Footer Generation Date underneath the title on Left
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`Waktu Screening: ${generationDateStr}`, marginX, 287.5);
      
      // Footer Page Numbering on Right
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`Halaman ${i} dari ${pageCount}`, marginX + contentWidth, 285, { align: "right" });
      
      // Simple header for subsequent pages (page 2+)
      if (i > 1) {
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(1);
        doc.line(marginX, 12, marginX + contentWidth, 12);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235);
        doc.text("Laporan Hasil ATS Screening - JagoCV AI", marginX, 9);
      }
    }

    const cleanCandidateName = (activeResult?.meta?.kandidat || "Kandidat_JagoCV").replace(/ /g, "_");
    doc.save(`JagoCV_Screening_Report_${cleanCandidateName}.pdf`);
  };

  const handleSelectHistoryReport = (analysisItem: SavedAnalysis) => {
    setSelectedHistoryId(analysisItem.id);
    setActiveResult(analysisItem.data);
    setActiveTab("screen");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      
      {/* Header section */}
      <header className="bg-white text-slate-800 py-3 px-3 md:px-8 border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <img src="/logo.png" alt="JagoCV" className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl object-cover shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm md:text-xl font-bold tracking-tight flex items-center gap-1 md:gap-1.5 font-sans text-slate-800">
                JagoCV AI <span className="text-[8px] md:text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-bold px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-wider">v2.1</span>
              </h1>
              <p className="text-[9px] md:text-[11px] text-slate-500 font-medium truncate max-w-[160px] md:max-w-none">Enterprise Matchmaking Optimizer & Senior Recruiter Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold font-mono">
                  {getUsername().charAt(0).toUpperCase()}
                </div>
                <div className="text-left text-xs">
                  <p className="font-bold text-slate-800 max-w-[150px] truncate">@{getUsername()}</p>
                  <p className="text-[10px] text-slate-400">Terdaftar</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-slate-500 hover:text-slate-800 text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs transition-all cursor-pointer font-semibold"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-3.5 py-2 rounded-lg font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Activated tier & profile headers */}
      <UserAccountHeader 
        profile={profile}
        username={getUsername()}
        onActivateCode={handleActivateCode}
        onSelectPaket={handlePackageClick}
      />

      {/* Main app grid area */}
      <main className="max-w-7xl mx-auto w-full px-3 md:px-8 py-4 md:py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        
        {/* LEFT COLUMN: Input Panels & History Files */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Controls Tab bar */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => { setActiveTab("screen"); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "screen"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="tab-screening"
            >
              <FileText className="w-4 h-4" />
              Screening ATS Baru
            </button>
            <button
              onClick={() => { setActiveTab("history"); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="tab-history"
            >
              <History className="w-4 h-4" />
              Laporan Tersimpan
              {historyList.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                  {historyList.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Analysis Screen view */}
          {activeTab === "screen" && (
            <div className="bg-white shrink-0 rounded-xl md:rounded-2xl border border-slate-200 p-4 md:p-6 shadow-xs flex flex-col gap-4 md:gap-5">
              
              {/* Template quick-loaders */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Klik Template Demo Instan:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadTemplate(idx)}
                      className="text-left bg-slate-50 hover:bg-blue-50/50 border border-slate-205 hover:border-blue-200 p-2.5 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      <div className="font-bold text-slate-800 line-clamp-1">{tpl.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{tpl.role}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CV Resume Field */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" /> Teks Curriculum Vitae (CV)
                  </label>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">copy-paste / upload</span>
                </div>
                      <FileUploaderDropzone
                  label="Unggah Dokumen CV / Resume"
                  allowedExtensions={[".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"]}
                  onTextExtracted={(text, filename) => {
                    if (text) {
                      setCvText(text);
                      if (filename) setCvFileName(filename);
                    } else {
                      setCvText("");
                      setCvFileName("CV_Kandidat.pdf");
                    }
                  }}
                  onError={handleCvUploadError}
                />

                <textarea
                  placeholder="Atau tempelkan teks resume / CV Anda lengkap di sini..."
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  className="w-full text-sm md:text-xs p-3 border md:p-3.5 border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-mono min-h-[120px] md:min-h-[140px] text-slate-800 leading-relaxed bg-slate-50/30"
                />
              </div>

              {/* Job Description Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-slate-500" /> Job Description (JD Lowongan)
                </label>

                <FileUploaderDropzone
                  label="Unggah Dokumen Informasi Lowongan"
                  allowedExtensions={[".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"]}
                  onTextExtracted={(text) => {
                    setJobDescription(text || "");
                  }}
                  onError={handleJdUploadError}
                />

                  <textarea
                    placeholder="Tempelkan Job Description dari portal lowongan kerja di sini..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full text-sm md:text-xs p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-mono min-h-[120px] text-slate-800 leading-relaxed bg-slate-50/30"
                  />
              </div>

              {/* Expandable Cover Letter Field */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between p-3 bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <span>+ Lampirkan Cover Letter (Opsional)</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-slate-400" />
                  </summary>
                  <div className="p-3 border-t border-slate-200 flex flex-col gap-2">
                    <FileUploaderDropzone
                      label="Unggah Dokumen Cover Letter"
                      allowedExtensions={[".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"]}
                      onTextExtracted={(text) => {
                        setCoverLetter(text || "");
                      }}
                      onError={handleCvUploadError}
                    />
                    <textarea
                      placeholder="Atau tuliskan isi surat lamaran di sini untuk tambahan review..."
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full text-sm md:text-xs p-3 md:p-3.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[85px] text-slate-800 bg-slate-50/30"
                    />
                  </div>
                </details>
              </div>

              {/* Critical trigger action key */}
              <button
                onClick={() => handleAtsScreening()}
                disabled={loading}
                className={`w-full group rounded-xl py-3.5 px-4 font-bold text-sm tracking-wide text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  loading 
                    ? "bg-slate-400" 
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/10"
                }`}
                id="btn-trigger-review"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Memproses Analisis...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform duration-250 text-white" />
                    Mulai AI Screening ({profile.paket})
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab 2: Saved Analysis Reports view */}
          {activeTab === "history" && (
            <div className="bg-white shrink-0 rounded-xl md:rounded-2xl border border-slate-200 p-4 md:p-6 shadow-xs flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tersimpan ({historyList.length})</span>
                <span className="text-xs text-slate-500 italic">Auto-Sync Firestore</span>
              </div>

              {historyList.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-600">Riwayat Screening Kosong</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">Selesai menganalisis resume baru, sistem otomatis menyimpan laporannya ke awan Firestore Anda.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[280px] md:max-h-[500px] overflow-y-auto pr-1">
                  {historyList.map((analysis) => {
                    const isSelected = selectedHistoryId === analysis.id;
                    return (
                      <div
                        key={analysis.id}
                        onClick={() => handleSelectHistoryReport(analysis)}
                        className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/30 border-blue-300"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs flex flex-col items-center justify-center h-11 w-11 shadow-xs">
                          <span className="text-[9px] text-slate-400 font-bold uppercase pb-0.5">Skor</span>
                          <span className={analysis.skorAkhir >= 80 ? "text-emerald-600" : analysis.skorAkhir >= 70 ? "text-amber-600" : "text-rose-500 font-extrabold"}>
                            {analysis.skorAkhir}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{analysis.jobTitle}</h4>
                          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <span className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-600">{analysis.paket}</span>
                            {analysis.cvKandidatName}
                          </p>
                          <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-1.5">
                            <span className="text-[10px] text-slate-400 font-mono">{analysis.tanggal}</span>
                            <button
                              onClick={(e) => handleDeleteHistoryItem(e, analysis.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Hapus laporan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
              </button>

              {activeResult && (
                <button
                  onClick={() => handleAtsScreening(true)}
                  disabled={loading}
                  className="w-full mt-2 rounded-xl py-2.5 px-4 font-bold text-xs tracking-wide text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Screening Ulang (Refresh Cache)
                </button>
              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Results Output Area / Coach Terminal */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Fatal Error Toast Box */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-850 rounded-xl p-4 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong className="font-bold">Perhatian:</strong>
                <p className="mt-0.5 select-all leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Case 1: Scanning Loaders */}
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-12 shadow-xs text-center flex flex-col items-center justify-center min-h-[250px] md:min-h-[450px]">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-800">Recruiter Simulator Sedang Berpikir</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{loadingMsg}</p>
              
              <div className="mt-8 bg-slate-50 border border-slate-200 p-4 rounded-xl max-w-md text-left text-xs leading-relaxed text-slate-600">
                <span className="font-bold text-blue-600 block mb-0.5">Pojok Career Coach:</span>
                "Recruiter biasanya hanya menghabiskan <strong>7 detik pertama</strong> untuk menyaring satu resume. Kami sedang mensimulasikan kriteria screening 10 tahun kedalam program untuk menyaring resume Anda secara detail."
              </div>
            </div>
          )}

          {/* Case 2: Output Screen Reports */}
          {!loading && activeResult && (
            <div className="flex flex-col gap-6">

              {/* PDF Download Document Action Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-blue-50/50 border border-blue-150 p-4 rounded-2xl gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Laporan Resmi JagoCV AI Siap Akses</h4>
                    <p className="text-[10px] text-slate-500 font-sans leading-tight">Gunakan dokumen resmi ini untuk melamar pekerjaan atau keperluan peninjauan CV.</p>
                  </div>
                </div>
                <button
                  onClick={downloadAnalysisPDF}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all tracking-wide cursor-pointer font-sans"
                >
                  <Download className="w-4 h-4" /> Unduh Laporan PDF Resmi
                </button>
              </div>

              {/* MASALAH 2: INDICATION WARNING OF INCOMPLETE CV/JD OR OVERLAPPING DETAILS */}
              {activeResult.incomplete_warning && (
                <div className="bg-rose-50 border border-rose-200 text-rose-850 p-4 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                  <p className="font-bold flex items-center gap-1.5 text-rose-800">
                    <span className="text-sm">⚠</span> {activeResult.incomplete_warning.masalah}
                  </p>
                  <p className="text-slate-600 leading-relaxed font-sans font-medium">
                    Yang perlu kamu lakukan: <strong>{activeResult.incomplete_warning.rekomendasi}</strong>
                  </p>
                </div>
              )}

              {/* MASALAH 7: NOTIFICATION OF REMAINING QUOTA OVERRUN AUTO-HEALED */}
              {quotaWarningActive && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                  <p className="font-bold flex items-center gap-1.5 text-blue-900">
                    <span>⚡</span> Kuota screening habis — sudah diatasi otomatis.
                  </p>
                  <p className="text-slate-600 leading-relaxed font-sans">
                    Kami telah menyelesaikan screening yang sedang berjalan ini dengan tuntas! Silakan beli paket BASIC atau PRO di halaman sebelah kiri untuk meningkatkan kuota akses berikutnya.
                  </p>
                </div>
              )}

              {/* Header Box: Score Gauge Banner */}
              <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-4 md:p-6 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-center">
                <div className="md:col-span-4 flex justify-center">
                  <div className="relative flex items-center justify-center">
                    {/* Circle SVG Progress gauge */}
                    <svg className="w-28 h-28 md:w-32 md:h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="54" className="stroke-slate-100" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="54" 
                        className={activeResult.hireability_score.nilai >= 80 ? "stroke-blue-600" : activeResult.hireability_score.nilai >= 70 ? "stroke-amber-500" : "stroke-rose-500"} 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 54}
                        strokeDashoffset={2 * Math.PI * 54 * (1 - (activeResult.hireability_score.nilai || 0) / 100)}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 1s ease" }}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="block text-3xl md:text-4xl font-extrabold font-sans text-slate-800 leading-none">{activeResult.hireability_score.nilai}</span>
                      <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 md:mt-1.5 block">Skor Akhir</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-8">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-slate-450 text-slate-400 uppercase tracking-wider">Hasil Uji Hirability ({profile.paket})</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold leading-none ${
                      activeResult.hireability_score.nilai && activeResult.hireability_score.nilai >= 80 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 border"
                        : activeResult.hireability_score.nilai && activeResult.hireability_score.nilai >= 70
                        ? "bg-amber-50 text-amber-800 border-amber-200 border"
                        : "bg-rose-50 text-rose-800 border-rose-200 border"
                    }`}>
                      {activeResult.hireability_score.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">{activeResult.meta.posisi}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">ID: JCV-{activeResult.meta.tanggal_analisis.replace(/ /g, "")?.slice(-8) || "REPORT"} | Kandidat: {activeResult.meta.kandidat}</p>
                  
                  {/* Summary commentary of senior coach */}
                  <div className="mt-3.5 text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-150 p-3 rounded-xl italic relative">
                    <span className="font-medium text-slate-700">
                      "{activeResult.hireability_score.ringkasan}"
                    </span>
                  </div>
                </div>
              </div>

              {/* Parsed CV Data extraction */}
              {activeResult.parsed_cv && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4 animate-fadeIn">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <FileText className="w-4 h-4 text-blue-600 animate-pulse" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none">
                      🧠 Resume Parsing Engine (Data Hasil Ekstraksi)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nama Lengkap Kandidat:</span>
                        <p className="font-bold text-slate-800 text-sm">{activeResult.parsed_cv.nama_kandidat || "Tidak terdeteksi"}</p>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Detail Kontak:</span>
                        <div className="space-y-1 font-mono text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <p>✉️ Email: {activeResult.parsed_cv.kontak?.email || "-"}</p>
                          <p>📞 Telp: {activeResult.parsed_cv.kontak?.telepon || "-"}</p>
                          <p>💼 LinkedIn: {activeResult.parsed_cv.kontak?.linkedin || "-"}</p>
                          <p>📍 Lokasi: {activeResult.parsed_cv.kontak?.lokasi || "-"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Riwayat Pendidikan Ekstraksi:</span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          {activeResult.parsed_cv.pendidikan?.map((edu, idx) => (
                            <li key={idx} className="font-medium">{edu}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Riwayat Pengalaman Kerja:</span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          {activeResult.parsed_cv.pengalaman_kerja?.map((exp, idx) => (
                            <li key={idx} className="font-medium">{exp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                    {profile.paket === "PRO" || profile.paket === "BASIC" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Skills & Kompetensi Teknis:</span>
                          <div className="flex flex-wrap gap-1">
                            {activeResult.parsed_cv.keahlian_dasar && activeResult.parsed_cv.keahlian_dasar.length > 0 ? (
                              activeResult.parsed_cv.keahlian_dasar.map((skill, idx) => (
                                <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sistem tidak menemukan keahlian eksplisit.</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tools Software & Sertifikasi:</span>
                          <div className="flex flex-wrap gap-1">
                            {activeResult.parsed_cv.tools_sertifikat && activeResult.parsed_cv.tools_sertifikat.length > 0 ? (
                              activeResult.parsed_cv.tools_sertifikat.map((tool, idx) => (
                                <span key={idx} className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                                  {tool}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sistem tidak menemukan software/sertifikat eksplisit.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-start gap-2">
                        <Lock className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        <div className="text-xs">
                          <p className="font-bold text-rose-800 leading-none mb-1">Fitur Ekstraksi Komplit Terkunci (TRIAL)</p>
                          <p className="text-slate-500 leading-normal">Keahlian teknik inti, tools software, dan list sertifikat yang terurai dalam dokumen Anda hanya tersedia di paket <strong>BASIC</strong> dan <strong>PRO</strong>. Hubungi CS atau masukkan kode aktivasi Anda sekarang.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Factors Scores breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Rincian Variabel Penilaian ({Object.keys(activeResult.breakdown_skor).length} Faktor Dinilai)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(activeResult.breakdown_skor).map(([key, item]: [string, any]) => (
                    <div key={key} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-1.5 hover:bg-slate-100/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 capitalize">{key.replace(/_/g, " ")}</span>
                        <strong className={`font-mono text-xs font-bold ${item.nilai >= 85 ? "text-blue-600" : item.nilai >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                          {item.nilai ?? 0} <span className="text-[9px] text-slate-400">/100</span>
                        </strong>
                      </div>
                      {/* Bar indicator */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${item.nilai >= 85 ? "bg-blue-600" : item.nilai >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${item.nilai ?? 0}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{item.catatan}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords Matrix analysis chips */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pola Pemetaan Kata Kunci (Keywords Analysis)</h3>
                
                {/* Critical keywords category */}
                <div className="border border-rose-150 bg-rose-50/30 p-4 rounded-xl flex flex-col gap-2.5">
                  <div className="text-xs font-bold text-rose-800 flex items-center justify-between">
                    <span className="uppercase tracking-wider">Critical Keywords (Syarat Mutlak/Wajib)</span>
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-rose-200/50">Wajib Dipenuhi</span>
                  </div>
                  
                  {activeResult.keyword_analysis?.critical && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {activeResult.keyword_analysis.critical.ditemukan?.map((word, idx) => (
                          <span key={idx} className="bg-emerald-55 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> {word}
                          </span>
                        ))}
                        {activeResult.keyword_analysis.critical.tidak_ditemukan?.map((word, idx) => (
                          <span key={idx} className="bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 text-rose-600" /> {word}
                          </span>
                        ))}
                      </div>
                      {activeResult.keyword_analysis.critical.tidak_ditemukan?.length > 0 && (
                        <p className="text-[10px] text-rose-805 text-rose-700 italic mt-1 leading-relaxed font-medium">
                          ⚠️ Red Flag: Kehilangan critical keywords di atas membuat CV Anda sulit lolos bot filter pertama!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Optional / Important Keywords container depending on packages */}
                {activeResult.keyword_analysis?.important && (
                  <div className="border border-amber-150 bg-amber-50/20 p-4 rounded-xl flex flex-col gap-2">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Important Keywords (Syarat Pendukung/Tersirat)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeResult.keyword_analysis.important.ditemukan?.map((word, idx) => (
                        <span key={idx} className="bg-emerald-55 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded flex items-center gap-0.5 font-medium">
                          <Check className="w-2.5 h-2.5" /> {word}
                        </span>
                      ))}
                      {activeResult.keyword_analysis.important.tidak_ditemukan?.map((word, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded italic font-medium">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeResult.keyword_analysis?.optional && (
                  <div className="border border-slate-205 border-slate-200 p-4 rounded-xl flex flex-col gap-2 bg-slate-50/20">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Optional Keywords (Nilai Tambah Extra)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeResult.keyword_analysis.optional.ditemukan?.map((word, idx) => (
                        <span key={idx} className="bg-emerald-50 border border-emerald-250 border-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-medium">
                          {word}
                        </span>
                      ))}
                      {activeResult.keyword_analysis.optional.tidak_ditemukan?.map((word, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-201 text-slate-400 text-[10px] px-2 py-0.5 rounded italic">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Strengths & Red flags lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Strengths Block */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-3">
                  <h3 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Kekuatan Utama CV
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed font-medium">
                    {activeResult.kekuatan_cv?.map((k, idx) => (
                      <li key={idx}>{k}</li>
                    ))}
                  </ul>
                </div>

                {/* Red flags block */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-3">
                  <h3 className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" /> Kelemahan & Red Flags
                  </h3>
                  <div className="flex flex-col gap-3">
                    {activeResult.kelemahan_dan_red_flags?.red_flags?.map((r, idx) => (
                      <div key={idx} className="bg-rose-50 text-rose-900 p-2.5 rounded-lg text-[11px] leading-relaxed border border-rose-100 font-medium">
                        <span className="font-bold block text-rose-950 pb-0.5 text-xs">⚠️ RED FLAG FATAL:</span>
                        {r}
                      </div>
                    ))}
                    {activeResult.kelemahan_dan_red_flags?.kelemahan && activeResult.kelemahan_dan_red_flags.kelemahan.length > 0 && (
                      <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 mt-1 leading-relaxed font-medium">
                        {activeResult.kelemahan_dan_red_flags.kelemahan.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

              </div>

              {/* ATS Readability Blockers */}
              {activeResult.ats_blockers?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-5 shadow-xs flex flex-col gap-1.5">
                  <strong className="text-xs font-bold flex items-center gap-1.5 text-amber-950 uppercase tracking-wider">
                    ⚠️ ATS Format Blockers Ditemukan ({activeResult.ats_blockers.length})
                  </strong>
                  <ul className="text-xs list-disc pl-4 space-y-1.5 leading-relaxed text-amber-850">
                    {activeResult.ats_blockers.map((blocker, idx) => (
                      <li key={idx}>{blocker}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-amber-700 italic mt-1 font-medium">Tip: Ganti template resume model double-column Anda dengan model single-column standar Harvard tanpa chart-bar skill atau tabel berbayang untuk mempermudah machine-learning ATS parser membaca riwayat Anda.</p>
                </div>
              )}

              {/* Priority actionable improvement plan */}
              {activeResult.priority_improvement_plan && activeResult.priority_improvement_plan.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                    📋 Rencana Perbaikan Prioritas (Priority Improvement Plan)
                  </h3>

                  <div className="flex flex-col gap-4">
                    {activeResult.priority_improvement_plan.map((item, idx) => (
                      <div key={idx} className="border-l-4 border-slate-700 pl-4 py-1 flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-slate-800 text-white font-extrabold text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                            {item.prioritas}
                          </span>
                          <span className="font-bold text-xs text-slate-805 text-slate-800">{item.area}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-bold leading-normal">Masalah: {item.masalah}</p>
                        <p className="text-xs text-slate-500 leading-normal">Rencana Solusi: {item.solusi}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5 text-[11px] leading-relaxed bg-slate-50 border border-slate-150 rounded-lg p-3">
                          <div className="text-rose-700 font-medium">
                            <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Sebelum:</span>
                            {item.contoh_sebelum}
                          </div>
                          <div className="text-emerald-700 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3 font-medium">
                            <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Sesudah (Aman ATS):</span>
                            {item.contoh_sesudah}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Resume rewrite mapping card - PRO TIER BLOCK */}
              {profile.paket === "PRO" ? (
                activeResult.ai_resume_rewrite && (
                  <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-950">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm">Metode Google XYZ</span>
                        <h3 className="text-sm font-bold mt-1.5 tracking-tight">AI Resume Rewrite (Optimasi Kalimat Pendukung)</h3>
                      </div>
                      <Sparkles className="w-5 h-5 text-blue-400 animate-pulse shrink-0" />
                    </div>
                    <p className="text-xs text-slate-300 pb-4 border-b border-slate-800 leading-relaxed font-light">{activeResult.ai_resume_rewrite.catatan}</p>

                    <div className="space-y-4 mt-4">
                      {activeResult.ai_resume_rewrite.contoh_rewrite?.map((rewrite, idx) => (
                        <div key={idx} className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                          <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                            📌 Bagian: {rewrite.bagian}
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/15 p-3 rounded-lg text-[11px] leading-relaxed border border-slate-900">
                              <span className="block text-slate-400 font-bold uppercase text-[9px] pb-1">Teks Lama:</span>
                              <p className="line-through text-slate-300 font-medium">{rewrite.sebelum}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg text-[11px] leading-relaxed border border-white/5">
                              <span className="block text-blue-300 font-bold uppercase text-[9px] pb-1">Optimasi JagoCV (Rumus XYZ):</span>
                              <p className="text-emerald-300 font-medium leading-relaxed">{rewrite.sesudah}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                // Locked premium block preview for non-PRO levels
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-slate-300/45">
                    <Lock className="w-16 h-16 rotate-12" />
                  </div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">PRO FEATURES</h3>
                  <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" /> AI Resume Rewrite & Coach Story
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-lg mb-4">Fitur optimasi kalimat berdasarkan rumus XYZ Google (Mencakup data angka, persentasi performa, dan strategi) serta narrative wawancara hanya terbuka di paket PRO.</p>
                  <button
                    onClick={() => handleBuySimulate("PRO")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-xs border border-blue-650"
                  >
                    Dapatkan Lisensi PRO Sekarang
                  </button>
                </div>
              )}

              {/* Recruiter Perspective & Story - PRO BLOCK */}
              {profile.paket === "PRO" && activeResult.recruiter_perspective && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Users className="w-4 h-4 text-blue-600" /> Memo Perspektif Recruiter (Narasi HRD)
                  </h3>
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {activeResult.recruiter_perspective}
                  </p>
                </div>
              )}

              {/* Interview readiness questions - PRO BLOCK */}
              {profile.paket === "PRO" && activeResult.interview_readiness && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" /> Prediksi Wawancara (Interview Readiness)
                    </h3>
                    <strong className="text-xs font-bold font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                      Skor Kesiapan: {activeResult.interview_readiness.nilai}/100
                    </strong>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{activeResult.interview_readiness.prediksi}</p>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Simulasi Pertanyaan Jebakan Recruiter:</span>
                    <ul className="text-xs text-slate-800 space-y-2.5 pl-4 list-decimal leading-relaxed font-semibold">
                      {activeResult.interview_readiness.contoh_pertanyaan_rawan?.map((q, idx) => (
                        <li key={idx} className="font-semibold text-slate-700 italic">"{q}"</li>
                      ))}
                    </ul>
                  </div>

                  {activeResult.interview_readiness.tips_star && activeResult.interview_readiness.tips_star.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3.5 space-y-3 animate-fadeIn">
                      <span className="block text-[10px] font-bold text-slate-450 text-slate-400 uppercase tracking-wider">💡 Tips Menjawab Menggunakan Formula STAR:</span>
                      <div className="space-y-3">
                        {activeResult.interview_readiness.tips_star.map((item, idx) => (
                          <div key={idx} className="bg-blue-50/40 border border-blue-100 p-3.5 rounded-xl space-y-1.5">
                            <p className="font-bold text-xs text-blue-900">Q: "{item.pertanyaan}"</p>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium"><strong className="text-blue-800">STAR TIP:</strong> {item.tips}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Skill Development Plan - PRO TIER */}
              {profile.paket === "PRO" ? (
                activeResult.skill_development_plan ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-2.5 gap-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                        <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" /> Rencana Pengembangan Skill Terarah
                      </h3>
                      <strong className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Target Pasca Perbaikan: {activeResult.skill_development_plan.target_skor_setelah_perbaikan}/100 ATS Score
                      </strong>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-405 text-slate-400 uppercase tracking-wider mb-2">1. Analisis Kesenjangan Skill (Gaps) & Urgensi:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {activeResult.skill_development_plan.skill_gaps?.map((gap, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-center gap-1.5 mb-1">
                                  <strong className="text-slate-800 font-bold text-xs">{gap.nama}</strong>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border leading-none ${
                                    gap.urgensi === "Tinggi" 
                                      ? "bg-rose-50 text-rose-850 border-rose-200" 
                                      : gap.urgensi === "Sedang" 
                                      ? "bg-amber-50 text-amber-850 border-amber-200" 
                                      : "bg-slate-100 text-slate-800 border-slate-200"
                                  }`}>
                                    {gap.urgensi}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-normal">{gap.deskripsi}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">2. Action Plan / Rencana Tindakan Bertahap:</span>
                        <div className="space-y-2 font-sans text-xs">
                          <div className="flex items-start gap-2.5 bg-emerald-50/25 border border-emerald-100 p-3 rounded-xl">
                            <span className="bg-emerald-600 text-white text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded tracking-wider leading-none shrink-0 mt-0.5">Pendek</span>
                            <div className="text-slate-700 leading-relaxed font-medium"><strong>(1 - 3 Bulan):</strong> {activeResult.skill_development_plan.rencana_aksi?.jangka_pendek}</div>
                          </div>
                          <div className="flex items-start gap-2.5 bg-blue-50/25 border border-blue-100 p-3 rounded-xl">
                            <span className="bg-blue-600 text-white text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded tracking-wider leading-none shrink-0 mt-0.5">Menengah</span>
                            <div className="text-slate-700 leading-relaxed font-medium"><strong>(3 - 6 Bulan):</strong> {activeResult.skill_development_plan.rencana_aksi?.jangka_menengah}</div>
                          </div>
                          <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-150 p-3 rounded-xl">
                            <span className="bg-slate-600 text-white text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded tracking-wider leading-none shrink-0 mt-0.5">Panjang</span>
                            <div className="text-slate-700 leading-relaxed font-medium"><strong>(6 - 12 Bulan):</strong> {activeResult.skill_development_plan.rencana_aksi?.jangka_panjang}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">3. Rekomendasi Modul & Sumber Belajar Karir:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {activeResult.skill_development_plan.sumber_belajar_rekomendasi?.map((src, idx) => (
                            <div key={idx} className="border border-slate-200 p-3.5 rounded-xl space-y-1 hover:border-blue-400 transition-all font-sans flex flex-col justify-between">
                              <div>
                                <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded leading-none uppercase tracking-wider shrink-0 w-max">{src.nama_platform}</span>
                                <h4 className="font-bold text-slate-800 pt-1.5 text-xs">{src.topik}</h4>
                                <p className="text-[11px] text-slate-500 leading-normal mt-0.5">Materi: {src.link_or_info}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden animate-fadeIn">
                  <div className="absolute top-3 right-3 text-slate-300/40">
                    <Lock className="w-16 h-16 rotate-12" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-widest text-slate-400 block uppercase">PREMIUM UPGRADE EXCLUSIVE</span>
                  <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-sm">
                    <Lock className="w-3.5 h-3.5 text-slate-500" /> Rencana Pengembangan Skill & Career Path
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-4">Ingin tahu kesenjangan (gaps) skill apa yang membuat resume Anda tidak terpanggil HRD, lengkap dengan kurasi platform belajar (Coursera/Udemy/GCP) bertahap? Tingkatkan lisensi Anda ke Pro.</p>
                  <button
                    onClick={() => handleBuySimulate("PRO")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all border border-blue-650 shrink-0 cursor-pointer"
                  >
                    Buka Skill Path PRO
                  </button>
                </div>
              )}

              {/* Premium Cover Letter - PRO TIER */}
              {profile.paket === "PRO" ? (
                activeResult.cover_letter_premium ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-600 animate-pulse" /> Surat Lamaran Premium JagoCV (Siap Pakai)
                      </h3>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeResult.cover_letter_premium?.full_text || "");
                          alert("✓ Surat lamaran berhasil disalin ke clipboard!");
                        }}
                        className="text-xs text-blue-600 font-bold hover:underline"
                      >
                        Salin Surat Lamaran
                      </button>
                    </div>

                    <div className="space-y-4 font-sans text-xs text-slate-700">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                        <p className="font-bold font-mono text-[11px] text-slate-500 uppercase tracking-wider mb-1">Subject Email Lamaran:</p>
                        <p className="font-bold text-slate-800">{activeResult.cover_letter_premium.subjek}</p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 whitespace-pre-wrap leading-relaxed font-sans text-slate-800 max-h-[350px] overflow-y-auto">
                        <strong>Yth. Tim Rekrutmen,</strong>
                        <p className="mt-2.5">{activeResult.cover_letter_premium.pembuka}</p>
                        <p className="mt-2.5">{activeResult.cover_letter_premium.isi}</p>
                        <p className="mt-2.5">{activeResult.cover_letter_premium.penutup}</p>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden animate-fadeIn">
                  <div className="absolute top-3 right-3 text-slate-300/40">
                    <Lock className="w-16 h-16 rotate-12" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-widest text-slate-400 block uppercase">PREMIUM UPGRADE EXCLUSIVE</span>
                  <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-sm">
                    <Lock className="w-3.5 h-3.5 text-slate-500" /> Surat Lamaran Premium JagoCV (Cover Letter)
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-4">Mendapatkan surat lamaran pekerjaan kustom siap pakai yang ditulis AI, dirangkai sinkron membujuk recruiter berdasarkan relasi CV dan lowongan yang dituju secara instan.</p>
                  <button
                    onClick={() => handleBuySimulate("PRO")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all border border-blue-650 shrink-0 cursor-pointer"
                  >
                    Buka Surat Premium PRO
                  </button>
                </div>
              )}

              {/* Export layout printable version UI block */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs text-slate-500">Mencari opsi download laporan untuk diserahkan ke coach atau disimpan offline?</span>
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-600"
                >
                  <Download className="w-4 h-4" /> Cetak Laporan CSV AI
                </button>
              </div>

            </div>
          )}

          {/* Empty presentation display */}
          {!loading && !activeResult && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-12 shadow-xs text-center flex flex-col items-center justify-center min-h-[250px] md:min-h-[450px]">
              <div className="w-16 h-16 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-xs">
                <FileText className="w-7 h-7 text-slate-550" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Menunggu Analisis Resume Pertama Anda</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Lampirkan kelengkapan teks CV Anda dan Job Description target lowongan kerja di panel kiri, kemudian klik "Mulai AI screening".</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md w-full mt-10 text-left">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-xs text-slate-800 block mb-1">🔍 Kategori Match Score</span>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">Penilaian presisi mencakup kecocokan kata kunci, level kualifikasi wajib, layout ramah bot, dan validitas pencapaian.</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-xs text-slate-800 block mb-1">💡 Coaching Action Plan</span>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">Memberikan rekomendasi perbaikan spesifik berupa penulisan ulang berbasis formula XYZ yang diuji oleh recruiter Fortune 500.</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Package Info Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPackageModal(null)}>
          <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full p-4 md:p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPackageModal(null)} className="absolute top-2 md:top-3 right-2 md:right-3 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4 md:mb-5">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-3 ${
                showPackageModal === "PRO"
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-slate-100 text-slate-800 border-slate-200"
              }`}>
                <Shield className="w-3 h-3" />
                Paket {showPackageModal}
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {showPackageModal === "PRO" ? "Rp100.000" : "Rp75.000"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Aktifkan fitur lengkap JagoCV</p>
            </div>

            <div className="space-y-3 mb-6">
              {showPackageModal === "BASIC" ? (
                <>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Unlimited Screening CV</p>
                      <p className="text-[11px] text-slate-500">Analisis tanpa batas untuk semua kandidat</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Detail ATS Analysis</p>
                      <p className="text-[11px] text-slate-500">Skor ATS, rekomendasi perbaikan, analisis kesenjangan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Ekspor PDF</p>
                      <p className="text-[11px] text-slate-500">Simpan hasil analisis dalam format PDF</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Riwayat Screening</p>
                      <p className="text-[11px] text-slate-500">Akses riwayat analisis kapan saja</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Masa Aktif 30 Hari</p>
                      <p className="text-[11px] text-slate-500">Berlaku 30 hari sejak aktivasi</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Unlimited Screening CV</p>
                      <p className="text-[11px] text-slate-500">Analisis tanpa batas untuk semua kandidat</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Advanced ATS Analysis</p>
                      <p className="text-[11px] text-slate-500">Skor ATS akurat, rekomendasi perbaikan, hingga analisis gap skill</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Ekspor PDF + Ringkasan</p>
                      <p className="text-[11px] text-slate-500">PDF detail plus ringkasan singkat untuk dibagikan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Prioritas Antrean</p>
                      <p className="text-[11px] text-slate-500">Proses screening lebih cepat</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Premium Support</p>
                      <p className="text-[11px] text-slate-500">Dukungan prioritas via WhatsApp CS</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">Masa Aktif 30 Hari</p>
                      <p className="text-[11px] text-slate-500">Berlaku 30 hari sejak aktivasi</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => handleOpenCSChat(showPackageModal)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold py-3 px-4 rounded-xl text-sm hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
            >
              Coba Sekarang — Bayar via CS
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">Pembayaran via QRIS, konfirmasi manual oleh CS</p>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onError={(msg) => setErrorMsg(msg)}
        />
      )}

      {/* Floating Support Assistant Widget */}
      <div className="fixed bottom-0 md:bottom-6 inset-x-0 md:inset-x-auto md:right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {/* Toggle Chat Balloon */}
        <button
          onClick={() => {
            setIsChatOpen(prev => !prev);
          }}
          className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold px-4.5 py-3 rounded-full shadow-2xl hover:shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer text-xs"
        >
          {isChatOpen ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4 animate-bounce" />}
          <span>{isChatOpen ? "Tutup Bantuan" : "Tanya CS JagoCV"}</span>
        </button>
        {/* Mobile toggle button */}
        <button
          onClick={() => setIsChatOpen(prev => !prev)}
          className="md:hidden fixed bottom-4 right-4 z-50 flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-full shadow-2xl cursor-pointer"
        >
          {isChatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5 animate-bounce" />}
        </button>

        {/* Chat Drawer Interface */}
        {isChatOpen && (
          <div className="w-full md:w-92 max-w-full md:max-w-[calc(100vw-32px)] h-full md:h-[510px] max-h-screen bg-slate-900 border border-slate-950 text-slate-100 rounded-none md:rounded-2xl shadow-3xl flex flex-col overflow-hidden animate-fadeIn relative shrink-0">
            {/* Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                </div>
                <span className="font-bold text-xs tracking-wide text-slate-200">Asisten JagoCV (CS & Pembayaran)</span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages Log Panel */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans">
              {csChatLogs.map((msg, index) => {
                const isBot = msg.sender === "bot";
                return (
                  <div
                    key={index}
                    className={`flex flex-col ${isBot ? "items-start" : "items-end"} animate-fadeIn`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line text-[11px] ${
                        isBot
                          ? "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                          : "bg-indigo-600 text-white rounded-tr-none"
                      }`}
                    >
                      <p>{msg.text}</p>

                      {/* Display QRIS Image inline if message has image */}
                      {msg.image && (
                        <div className="mt-3.5 text-center bg-white border border-slate-200 rounded-xl p-3.5 select-none max-w-[220px] mx-auto text-slate-900 shadow-xl">
                          <p className="text-[7.5px] font-black tracking-tighter text-slate-800 mb-1">QRIS OFFICIAL MERCHANT</p>
                          {csSelectedPackage && (
                            <div className="my-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-[9.5px] font-black font-mono tracking-wide border border-rose-200 text-center inline-block">
                              Rp {(csSelectedPackage === "PRO" ? 100000 : 75000).toLocaleString("id-ID")}
                            </div>
                          )}
                          <img
                            src={msg.image}
                            alt="QRIS Merchant"
                            className="w-40 h-40 mx-auto object-contain rounded-lg"
                          />
                          <a
                            href={msg.image}
                            download="QRIS_JagoCV_Official.png"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[8.5px] py-1.5 px-2.5 rounded-md transition-all uppercase tracking-wide leading-none"
                          >
                            <Download className="w-3 h-3" /> Unduh QR
                          </a>
                        </div>
                      )}
                    </div>
                    <span className="text-[8.5px] text-slate-500 font-mono mt-1">
                      {msg.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}

              {/* Dynamic Step Forms embedded directly in scroll log */}
              {csChatStep === "welcome" && (
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2 animate-fadeIn">
                  <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Pilihan Paket Layanan :</span>
                  <button
                    onClick={() => handleCsSelectPackage("BASIC")}
                    className="w-full text-left bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer transition-all hover:translate-x-1 duration-150 text-[10.5px] flex justify-between"
                  >
                    <span>1. Paket Basic</span>
                    <span className="text-slate-400">Rp75.000</span>
                  </button>
                  <button
                    onClick={() => handleCsSelectPackage("PRO")}
                    className="w-full text-left bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer transition-all hover:translate-x-1 duration-150 text-[10.5px] flex justify-between"
                  >
                    <span>2. Paket Pro</span>
                    <span className="text-emerald-400">Rp100.000</span>
                  </button>
                </div>
              )}

              {csChatStep === "input_details" && (
                <form
                  onSubmit={handleCsSubmitInfo}
                  className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-3 animate-fadeIn text-left text-slate-200"
                >
                  <div className="text-amber-400 font-bold text-[9.5px] uppercase tracking-wider block border-b border-indigo-900 pb-1.5">
                    Konfirmasi Data Pengirim
                  </div>
                  <div>
                    <label className="block text-[9.5px] text-slate-400 font-extrabold uppercase mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={csNamaLengkap}
                      onChange={(e) => setCsNamaLengkap(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-indigo-500 transition-colors"
                      placeholder="Masukkan nama lengkap Anda"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] text-slate-400 font-extrabold uppercase mb-1">Email Aktif</label>
                    <input
                      type="email"
                      required
                      value={csEmailAktif}
                      onChange={(e) => setCsEmailAktif(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-indigo-500 transition-colors"
                      placeholder="alamat@domain.com"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-2 px-4 rounded-lg transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-[0.98] text-[10.5px]"
                  >
                    Kunci Invoice & Lanjutkan →
                  </button>
                </form>
              )}

              {csChatStep === "waiting_payment" && (
                <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-3.5 animate-fadeIn text-left">
                  <div className="text-indigo-400 font-bold text-[9.5px] uppercase tracking-wider block border-b border-slate-700 pb-1.5">
                    Unggah Bukti Transaksi Sukses
                  </div>
                  <p className="text-[10px] text-slate-300 leading-normal">
                    Lakukan pembayaran di aplikasi perbankan/e-wallet Anda dengan scan QRIS resmi JagoCV di atas. Setelah sukses, simpan struk mutasi Anda dan lampirkan di sini:
                  </p>
                  
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl cursor-pointer bg-slate-900 text-slate-300 transition-colors hover:bg-slate-900/50">
                    <Upload className="w-6 h-6 mb-1 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] text-slate-350 font-bold text-center">Pilih Berkas Struk Bukti Bayar</span>
                    <span className="text-[8.5px] text-slate-500 font-mono mt-0.5">JPG, PNG, Screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCsScreenshotUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {csChatStep === "verifying" && (
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center space-y-2 animate-pulse text-indigo-400 font-bold block">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-1 text-indigo-400" />
                  <p className="text-[10.5px]">Sistem AI JagoCV sedang mengaudit lembaran struk Anda secara server-side...</p>
                </div>
              )}

              {csChatStep === "ask_problem" && (
                <form onSubmit={handleCsSubmitProblem} className="bg-slate-800 p-3.5 rounded-xl border border-amber-700 space-y-3 animate-fadeIn text-left text-slate-200">
                  <div className="text-amber-400 font-bold text-[9.5px] uppercase tracking-wider block border-b border-amber-900 pb-1.5">
                    ⚠ Pembayaran Bermasalah
                  </div>
                  <p className="text-[10px] text-slate-300 leading-normal">
                    Pembayaran Anda tidak dapat diverifikasi.
                    {csAiReason && (
                      <span className="block mt-1 text-amber-300 font-semibold">{csAiReason}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Jelaskan masalah yang Anda alami saat melakukan pembayaran:
                  </p>
                  <textarea
                    required
                    value={csProblemMessage}
                    onChange={(e) => setCsProblemMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-amber-500 transition-colors text-[10.5px] resize-none"
                    placeholder="Contoh: Saya transfer Rp75.000 tapi pesan Paket PRO / Gambar struk terpotong / Saya sudah bayar tapi status masih pending"
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold py-2 px-4 rounded-lg transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-[0.98] text-[10.5px]"
                  >
                    Kirim Penjelasan → Verifikasi Admin
                  </button>
                </form>
              )}

              {csChatStep === "pending_admin" && (
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleCsResetChat}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg border border-slate-700 cursor-pointer text-center text-[10.5px]"
                  >
                    ← Mulai Sesi Chat Baru
                  </button>
                </div>
              )}

              {/* Reset session button if success / failed */}
              {(csChatStep === "success" || csChatStep === "failed") && (
                <div className="pt-2 space-y-2">
                  {csChatStep === "success" && (
                    <>
                      <button
                        onClick={async () => {
                          if (!lastActivationCode) return;
                          const result = await handleActivateCode(lastActivationCode);
                          if (result.success) {
                            setCsChatLogs(prev => [...prev, {
                              sender: "bot" as const,
                              text: `🎉 Selamat! Paket ${csSelectedPackage} Anda sudah aktif! Silakan tutup chat dan nikmati fitur premium JagoCV.`,
                              timestamp: new Date()
                            }]);
                          } else {
                            setCsChatLogs(prev => [...prev, {
                              sender: "bot" as const,
                              text: `Gagal aktivasi otomatis: ${result.message}. Silakan salin kode dan masukkan manual di header halaman.`,
                              timestamp: new Date()
                            }]);
                          }
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg border border-emerald-500 cursor-pointer text-center text-[10.5px] transition-all"
                      >
                        ⚡ Aktivasi Otomatis Sekarang
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lastActivationCode);
                          setCsChatLogs(prev => [...prev, {
                            sender: "bot" as const,
                            text: `Kode ${lastActivationCode} berdisalin! Tempelkan di kolom "Kode Aktivasi" pada header lalu klik Aktifkan.`,
                            timestamp: new Date()
                          }]);
                        }}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg border border-slate-600 cursor-pointer text-center text-[10.5px] transition-all"
                      >
                        📋 Salin Kode Aktivasi
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleCsResetChat}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg border border-slate-700 cursor-pointer text-center text-[10.5px]"
                  >
                    ← Mulai Sesi Chat Baru
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Persistent footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 JagoCV AI. Hak Cipta Dilindungi Undang-Undang.</p>
          <div className="flex gap-4">
            <span className="text-slate-500 font-semibold uppercase tracking-widest text-[9px]">spark local database</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
