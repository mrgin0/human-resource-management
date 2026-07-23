// ============================================================
//  ISI BAGIAN INI DENGAN CONFIG FIREBASE PROJECT KAMU
//  Firebase Console > Project settings > Your apps > Web app
//  Kalau dibiarkan kosong, aplikasi jalan di MODE DEMO
//  (data hanya di memori, hilang saat halaman di-refresh).
// ============================================================

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const IS_CONFIGURED = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Email yang otomatis dijadikan admin saat pertama kali login.
// Semua akun lain default-nya viewer sampai diubah admin lewat menu Setting > Pengguna.
export const BOOTSTRAP_ADMIN_EMAILS = [
  // "kamu@perusahaan.com"
];
