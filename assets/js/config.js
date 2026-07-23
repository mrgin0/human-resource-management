// ============================================================
//  ISI BAGIAN INI DENGAN CONFIG FIREBASE PROJECT KAMU
//  Firebase Console > Project settings > Your apps > Web app
//  Kalau dibiarkan kosong, aplikasi jalan di MODE DEMO
//  (data hanya di memori, hilang saat halaman di-refresh).
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyD2j94oFb9hcgVzprVur5lRMjgzP-rguY0",
  authDomain: "human-resource-managemen-ffe6e.firebaseapp.com",
  projectId: "human-resource-managemen-ffe6e",
  storageBucket: "human-resource-managemen-ffe6e.firebasestorage.app",
  messagingSenderId: "186468495387",
  appId: "1:186468495387:web:9796143b37b69362f5c8be"
};

export const IS_CONFIGURED = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Email yang otomatis dijadikan admin saat pertama kali login.
// Semua akun lain default-nya viewer sampai diubah admin lewat menu Setting > Pengguna.
export const BOOTSTRAP_ADMIN_EMAILS = [
  "raihan.nor.falah@mhs.politala.ac.id"
];
