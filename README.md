# Panel KPI Host Live

Aplikasi statis (HTML + CSS + JavaScript) untuk mencatat performa live harian, menghitung KPI otomatis, dan menerbitkan surat teguran serta surat peringatan. Database Firebase Firestore, hosting GitHub Pages.

## Dua peran

| Peran | Bisa apa |
|---|---|
| **Admin** | Input dan ubah data harian, isi nilai kualitas, terbitkan surat manual, ubah semua pengaturan dan naskah surat |
| **Hanya lihat** | Melihat semua tabel, mencetak halaman, mengunduh surat dan rekap dalam PDF |

Menu Setting hanya muncul untuk admin. Firestore Rules ikut menegakkan pembatasan ini di sisi server, jadi viewer tidak bisa menulis data lewat cara lain.

## Cara pasang

### 1. Firebase

1. Buka [console.firebase.google.com](https://console.firebase.google.com), buat project baru.
2. **Build > Authentication > Get started > Sign-in method**, aktifkan **Email/Password**.
3. **Build > Firestore Database > Create database**, pilih mode production, pilih lokasi terdekat (`asia-southeast2` Jakarta).
4. **Firestore > Rules**, tempel isi `firestore.rules`, tekan **Publish**.
5. **Project settings > General > Your apps > Web (`</>`)**, daftarkan app, salin objek `firebaseConfig`.
6. Buka `assets/js/config.js`, tempel nilainya. Isi juga emailmu di `BOOTSTRAP_ADMIN_EMAILS` supaya akun pertama langsung jadi admin.

### 2. GitHub Pages

```bash
git init
git add .
git commit -m "panel kpi host live"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

Di repo: **Settings > Pages > Source: Deploy from a branch**, pilih `main` dan folder `/ (root)`. Alamatnya jadi `https://USERNAME.github.io/NAMA-REPO/`.

Terakhir, tambahkan domain itu di **Firebase > Authentication > Settings > Authorized domains**, kalau tidak login akan ditolak.

### 3. Akun

Buka situsnya, tekan **Daftar akun baru** untuk akun admin. Akun host atau HR yang lain daftar sendiri dan otomatis jadi *hanya lihat*; naikkan perannya lewat **Setting > Pengguna**.

Setelah admin pertama ada, ganti baris `allow create` di `firestore.rules` dengan versi yang membatasi `role == 'viewer'` (sudah ditulis sebagai komentar di file itu), lalu Publish ulang.

### Mode demo

Kalau `config.js` dibiarkan kosong, aplikasi tetap jalan tanpa Firebase untuk mencoba fitur. Data hanya di memori dan hilang saat halaman dimuat ulang.

## Rumus yang dipakai

```
gaji + bonus   = gaji harian + bonus
profit bersih  = komisi − (gaji + bonus)
simulasi       = basis × (100% − persen cancel)   [opsional dikurangi gaji + bonus]
sales %        = hasil simulasi acuan ÷ (gaji + bonus) × 100
KPI            = (poin kualitas × 40 + poin produktivitas × 10 + poin sales × 50) ÷ 100
```

**Catatan penting tentang spreadsheet asalmu.** Dua kolom simulasi di sheet itu memakai basis yang berbeda:

- kolom 50% mengambil 50% dari **profit bersih** (280.000 → 140.000);
- kolom 85% mengambil 15% dari **komisi** (350.000 → 52.500), bukan dari profit bersih.

Default aplikasi sengaja meniru keduanya persis supaya angkamu tetap sama. Kalau yang kamu maksud sebenarnya konsisten satu basis, ubah di **Setting > Kolom simulasi cancel order** — tiap kolom punya pilihan basis hitung, persen cancel, dan apakah gaji + bonus dikurangkan lagi.

**Ambang kualitas.** Dua baris tengah di tabel kualitas (yang bernilai 90 dan 80) tidak terbaca jelas di gambar, jadi diisi sementara 220 dan 200. Perbaiki di **Setting > Tabel skor**.

Kualitas dinilai dari rata-rata sebulan, produktivitas dari total jam sebulan, sales dari akumulasi sebulan. Kolom KPI di tabel harian menampilkan nilai kumulatif sampai tanggal tersebut, bukan nilai satu hari.

## Aturan surat

| Status KPI bulanan | Akibat |
|---|---|
| Hijau atau kuning | Tidak ada surat |
| Pink | Surat teguran |
| 3× surat teguran dalam masa berlaku | Naik menjadi SP 1 |
| Merah | SP 1, lalu SP 2, lalu SP 3 pada bulan merah berikutnya |
| Pelanggaran yang membuat akun kena banned | Langsung SP 3 |
| SP 3 | Pemutusan hubungan kerja |
| KPI mencapai 100 | Berhak reward |

Masa berlaku setiap surat 6 bulan dan ditampilkan sebagai hitung mundur, misalnya "Masa berlaku sisa 3 bulan 8 hari", lalu berubah menjadi "Expired". Semua angka ini bisa diubah di Setting.

Naskah surat mengikuti asas *progressive discipline* dan *due process*: dasar penerbitan, uraian fakta, proses pemeriksaan, hak karyawan untuk didengar dan didampingi, tenggat keberatan 7 hari kerja, perbaikan yang diminta, konsekuensi, masa berlaku, dan dua kolom tanda tangan. Tombol **Pakai naskah standar internasional** mengembalikan naskah bawaan kalau kamu sudah terlanjur mengubahnya.

## Yang perlu kamu periksa sendiri

Struktur suratnya mengikuti praktik HR internasional, tapi ini bukan nasihat hukum. Sebelum dipakai, cocokkan dengan UU 13/2003 jo. UU Cipta Kerja, PP 35/2021, serta Peraturan Perusahaan atau PKB yang berlaku di tempatmu, dan mintalah konsultan hukum ketenagakerjaan meninjaunya. KPI juga sebaiknya ditandatangani host di awal periode dan tidak diubah di tengah jalan.

## Struktur berkas

```
index.html
firestore.rules
assets/css/app.css
assets/js/config.js      isi config Firebase di sini
assets/js/firebase.js    inisialisasi Firebase
assets/js/store.js       baca tulis data, plus mode demo
assets/js/calc.js        semua rumus dan pengaturan default
assets/js/letters.js     naskah surat dan ekspor PDF
assets/js/app.js         tampilan dan alur aplikasi
```
