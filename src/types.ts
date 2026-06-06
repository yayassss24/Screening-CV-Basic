export interface KeywordAnalysis {
  ditemukan: string[];
  tidak_ditemukan: string[];
}

export interface ScoreItem {
  nilai: number;
  catatan: string;
}

export interface PriorityPlanItem {
  prioritas: number;
  area: string;
  masalah: string;
  solusi: string;
  contoh_sebelum: string;
  contoh_sesudah: string;
}

export interface ResumeRewriteItem {
  bagian: string;
  sebelum: string;
  sesudah: string;
}

export interface JagoCVAnalysisResult {
  meta: {
    paket: "TRIAL" | "BASIC" | "PRO";
    posisi: string;
    kandidat: string;
    tanggal_analisis: string;
  };
  hireability_score: {
    nilai: number;
    status: string;
    ringkasan: string;
  };
  breakdown_skor: {
    job_title_match: ScoreItem;
    keyword_match: ScoreItem;
    skills_match: ScoreItem;
    experience_match: ScoreItem;
    achievement_score: ScoreItem;
    education_match: ScoreItem;
    certification_match: ScoreItem;
    ats_readability: ScoreItem;
    career_progression: ScoreItem;
    industry_relevance: ScoreItem;
    tool_software_match: ScoreItem;
    recruiter_impression: ScoreItem;
    interview_readiness: ScoreItem;
  };
  keyword_analysis: {
    critical: KeywordAnalysis;
    important?: KeywordAnalysis;
    optional?: KeywordAnalysis;
  };
  kekuatan_cv: string[];
  kelemahan_dan_red_flags: {
    red_flags: string[];
    kelemahan?: string[];
  };
  ats_blockers: string[];
  priority_improvement_plan?: PriorityPlanItem[];
  ai_resume_rewrite?: {
    catatan: string;
    contoh_rewrite: ResumeRewriteItem[];
  };
  recruiter_perspective?: string;
  interview_readiness?: {
    nilai: number;
    prediksi: string;
    contoh_pertanyaan_rawan: string[];
    tips_star?: { pertanyaan: string; tips: string }[];
  };
  parsed_cv?: {
    nama_kandidat: string;
    kontak: {
      email?: string;
      telepon?: string;
      linkedin?: string;
      lokasi?: string;
    };
    pendidikan: string[];
    pengalaman_kerja: string[];
    keahlian_dasar?: string[];
    tools_sertifikat?: string[];
  };
  skill_development_plan?: {
    skill_gaps: { nama: string; urgensi: "Tinggi" | "Sedang" | "Rendah"; deskripsi: string }[];
    rencana_aksi: {
      jangka_pendek: string;
      jangka_menengah: string;
      jangka_panjang: string;
    };
    sumber_belajar_rekomendasi: { nama_platform: string; topik: string; link_or_info: string }[];
    target_skor_setelah_perbaikan: number;
  };
  cover_letter_premium?: {
    subjek: string;
    pembuka: string;
    isi: string;
    penutup: string;
    full_text: string;
  };
}

export interface UserProfile {
  email: string;
  paket: "TRIAL" | "BASIC" | "PRO";
  screeningSisa: number | "Unlimited";
  screeningTotalCount: number;
  kodeAktif?: string;
  tanggalBerlaku?: string;
}

export interface ActivationCode {
  kode: string;
  paket: "BASIC" | "PRO";
  digunakan: boolean;
  emailDigunakan?: string;
  tanggalCadaluwarsa: string;
}

export interface SavedAnalysis {
  id: string;
  email: string;
  paket: "TRIAL" | "BASIC" | "PRO";
  tanggal: string;
  cvKandidatName: string;
  jobTitle: string;
  keahlianInti: string[];
  skorAkhir: number;
  data: JagoCVAnalysisResult;
}
