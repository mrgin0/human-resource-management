// ============================================================
//  RUMUS & PENGATURAN DEFAULT
//  Semua angka di sini bisa diubah lewat menu Setting.
// ============================================================

export const DEFAULT_SETTINGS = {
  company: {
    name: 'PT Nama Perusahaan',
    address: 'Alamat perusahaan',
    city: 'Palangka Raya',
    hrName: 'Nama HR Manager',
    hrTitle: 'HR Manager'
  },

  // Jenis gaji harian (dropdown di form input)
  gajiTypes: [
    { id: 'g1', label: 'Gaji harian standar', amount: 60000 },
    { id: 'g2', label: 'Gaji harian weekend', amount: 75000 }
  ],

  // Jenis bonus (dropdown di form input)
  bonusTypes: [
    { id: 'b0', label: 'Tanpa bonus', amount: 0 },
    { id: 'b1', label: 'Bonus kehadiran', amount: 10000 },
    { id: 'b2', label: 'Bonus target harian', amount: 25000 },
    { id: 'b3', label: 'Bonus prime time', amount: 50000 }
  ],

  // Kolom simulasi cancel order.
  //  basis      : 'profit' = hitung dari profit bersih, 'komisi' = hitung dari komisi
  //  deductGaji : true = kurangi lagi dengan (gaji + bonus)
  //  Default di bawah mereproduksi persis angka spreadsheet yang kamu kirim.
  simulations: [
    { id: 's50', label: 'Simulasi 50% cancel order', cancelPct: 50, basis: 'profit', deductGaji: false, isSalesBase: true },
    { id: 's85', label: 'Simulasi 85% cancel order', cancelPct: 85, basis: 'komisi', deductGaji: false, isSalesBase: false }
  ],

  // Bobot KPI (total harus 100)
  weights: { kualitas: 40, produktivitas: 10, sales: 50 },

  // Tabel skor. Dibaca dari atas ke bawah: nilai >= min memakai poin baris itu.
  kualitasBands: [
    { min: 230, poin: 100, label: 'di atas 230' },
    { min: 220, poin: 90, label: '220 - 229' },
    { min: 200, poin: 80, label: '200 - 219' },
    { min: 180, poin: 50, label: '180 - 199' },
    { min: 160, poin: 25, label: '160 - 179' },
    { min: 150, poin: 5, label: '150 - 159' },
    { min: 0, poin: 0, label: 'di bawah 150' }
  ],

  produktivitasBands: [
    { min: 60, poin: 100, label: '60 jam ke atas' },
    { min: 50, poin: 80, label: '50 - 59 jam' },
    { min: 40, poin: 60, label: '40 - 49 jam' },
    { min: 30, poin: 40, label: '30 - 39 jam' },
    { min: 20, poin: 20, label: '20 - 29 jam' },
    { min: 10, poin: 10, label: '10 - 19 jam' },
    { min: 0, poin: 0, label: 'di bawah 10 jam' }
  ],

  salesBands: [
    { min: 200, poin: 100, label: '200% ke atas' },
    { min: 175, poin: 90, label: '175% - 199%' },
    { min: 150, poin: 80, label: '150% - 174%' },
    { min: 125, poin: 70, label: '125% - 149%' },
    { min: 100, poin: 60, label: '100% - 124%' },
    { min: 75, poin: 50, label: '75% - 99%' },
    { min: 50, poin: 40, label: '50% - 74%' },
    { min: 25, poin: 30, label: '25% - 49%' },
    { min: 0, poin: 20, label: '0% - 24%' },
    { min: -25, poin: 10, label: '-25% - -1%' },
    { min: -50, poin: 5, label: '-50% - -26%' },
    { min: -75, poin: 1, label: '-75% - -51%' },
    { min: -1e9, poin: 0, label: 'di bawah -75%' }
  ],

  // Warna status dari nilai KPI bulanan.
  // Urut dari tinggi ke rendah, nilai >= min memakai baris itu.
  kpiColorBands: [
    { min: 85, key: 'hijau', label: 'Hijau - aman', action: 'none' },
    { min: 70, key: 'kuning', label: 'Kuning - perlu perbaikan', action: 'none' },
    { min: 50, key: 'pink', label: 'Pink - surat teguran', action: 'ST' },
    { min: -1e9, key: 'merah', label: 'Merah - surat peringatan', action: 'SP' }
  ],

  spRules: {
    teguranToSp1: 3,       // 3x surat teguran = SP 1
    validityMonths: 6,     // masa berlaku tiap SP/ST
    rewardAtKpi: 100,      // KPI 100 dapat reward
    bannedLetter: 'SP3'    // kena banned langsung SP 3
  },

  letters: {}              // diisi dari letters.js saat pertama kali dibuka
};

// ---------- util ----------
export const rupiah = n =>
  'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');

export const num = n => (Number.isFinite(Number(n)) ? Number(n) : 0);

export const pct = n => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('id-ID') + '%';

export function bandPoin(bands, value) {
  const v = num(value);
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  for (const b of sorted) if (v >= b.min) return b.poin;
  return 0;
}

// ---------- baris harian ----------
export function computeRow(row, settings) {
  const komisi = num(row.komisi);
  const gaji = num(row.gaji);
  const bonus = num(row.bonus);
  const gajiBonus = gaji + bonus;
  const profitBersih = komisi - gajiBonus;

  const sims = {};
  for (const s of settings.simulations) {
    const base = s.basis === 'komisi' ? komisi : profitBersih;
    let v = base * (1 - num(s.cancelPct) / 100);
    if (s.deductGaji) v -= gajiBonus;
    sims[s.id] = v;
  }

  const salesSim = settings.simulations.find(s => s.isSalesBase) || settings.simulations[0];
  const salesBase = salesSim ? sims[salesSim.id] : 0;
  const salesPct = gajiBonus > 0 ? (salesBase / gajiBonus) * 100 : 0;

  return {
    ...row,
    gajiBonus,
    profitBersih,
    sims,
    salesPct,
    kualitasPoin: row.kualitas === '' || row.kualitas == null
      ? null
      : bandPoin(settings.kualitasBands, row.kualitas),
    salesPoin: bandPoin(settings.salesBands, salesPct)
  };
}

// ---------- rekap bulanan / kumulatif ----------
export function computePeriod(rows, settings) {
  const calc = rows
    .map(r => computeRow(r, settings))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totals = {
    hari: calc.length,
    jam: 0, komisi: 0, gaji: 0, bonus: 0,
    gajiBonus: 0, profitBersih: 0, sims: {}
  };
  for (const s of settings.simulations) totals.sims[s.id] = 0;

  for (const r of calc) {
    totals.jam += num(r.jam);
    totals.komisi += num(r.komisi);
    totals.gaji += num(r.gaji);
    totals.bonus += num(r.bonus);
    totals.gajiBonus += r.gajiBonus;
    totals.profitBersih += r.profitBersih;
    for (const s of settings.simulations) totals.sims[s.id] += r.sims[s.id];
  }

  const salesSim = settings.simulations.find(s => s.isSalesBase) || settings.simulations[0];
  const salesPct = totals.gajiBonus > 0
    ? ((salesSim ? totals.sims[salesSim.id] : 0) / totals.gajiBonus) * 100
    : 0;

  const kualitasVals = calc.filter(r => r.kualitas !== '' && r.kualitas != null).map(r => num(r.kualitas));
  const kualitasAvg = kualitasVals.length
    ? kualitasVals.reduce((a, b) => a + b, 0) / kualitasVals.length
    : null;

  const poin = {
    kualitas: kualitasAvg == null ? 0 : bandPoin(settings.kualitasBands, kualitasAvg),
    produktivitas: bandPoin(settings.produktivitasBands, totals.jam),
    sales: bandPoin(settings.salesBands, salesPct)
  };

  const w = settings.weights;
  const kpi =
    (poin.kualitas * num(w.kualitas) +
      poin.produktivitas * num(w.produktivitas) +
      poin.sales * num(w.sales)) / 100;

  // KPI berjalan per hari (kumulatif sampai tanggal tersebut)
  let jamRun = 0, gbRun = 0, salesRun = 0, kualSum = 0, kualN = 0;
  const running = calc.map(r => {
    jamRun += num(r.jam);
    gbRun += r.gajiBonus;
    salesRun += salesSim ? r.sims[salesSim.id] : 0;
    if (r.kualitas !== '' && r.kualitas != null) { kualSum += num(r.kualitas); kualN++; }

    const sPct = gbRun > 0 ? (salesRun / gbRun) * 100 : 0;
    const kAvg = kualN ? kualSum / kualN : null;
    const p = {
      kualitas: kAvg == null ? 0 : bandPoin(settings.kualitasBands, kAvg),
      produktivitas: bandPoin(settings.produktivitasBands, jamRun),
      sales: bandPoin(settings.salesBands, sPct)
    };
    const k = (p.kualitas * num(w.kualitas) + p.produktivitas * num(w.produktivitas) + p.sales * num(w.sales)) / 100;
    return { ...r, kpiKumulatif: k, jamKumulatif: jamRun, salesPctKumulatif: sPct, poinKumulatif: p };
  });

  return {
    rows: calc, running, totals, salesPct, kualitasAvg, poin, kpi,
    color: colorOf(kpi, settings)
  };
}

export function colorOf(kpi, settings) {
  const sorted = [...settings.kpiColorBands].sort((a, b) => b.min - a.min);
  for (const b of sorted) if (kpi >= b.min) return b;
  return sorted[sorted.length - 1];
}

// Berapa persen lagi supaya KPI tembus 100.
// Dihitung dari sisi sales, karena itu satu-satunya komponen yang masih bisa dikejar harian.
export function gapToFull(period, settings) {
  const w = settings.weights;
  const need = 100;
  const current = period.kpi;
  if (current >= need) return { done: true, kurang: 0, salesPctTarget: null };

  const fixed = (period.poin.kualitas * num(w.kualitas) + period.poin.produktivitas * num(w.produktivitas)) / 100;
  const neededSalesPoin = num(w.sales) > 0 ? ((need - fixed) * 100) / num(w.sales) : Infinity;

  let salesPctTarget = null;
  if (neededSalesPoin <= 100) {
    const band = [...settings.salesBands].sort((a, b) => a.min - b.min).find(b => b.poin >= neededSalesPoin);
    if (band) salesPctTarget = band.min;
  }

  return {
    done: false,
    kurang: need - current,
    neededSalesPoin: Math.min(neededSalesPoin, 100),
    salesPctTarget,
    tidakTercapai: neededSalesPoin > 100
  };
}

// ---------- masa berlaku surat ----------
export function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function validity(issuedAt, months, today = new Date()) {
  const exp = addMonths(issuedAt, months);
  const e = new Date(exp + 'T00:00:00');
  const t = new Date(today.toISOString().slice(0, 10) + 'T00:00:00');
  if (t >= e) return { expired: true, expiresAt: exp, text: 'Expired' };

  let months_ = (e.getFullYear() - t.getFullYear()) * 12 + (e.getMonth() - t.getMonth());
  const anchor = new Date(t);
  anchor.setMonth(anchor.getMonth() + months_);
  if (anchor > e) { months_--; anchor.setMonth(anchor.getMonth() - 1); }
  const days = Math.round((e - anchor) / 86400000);

  const parts = [];
  if (months_ > 0) parts.push(`${months_} bulan`);
  parts.push(`${days} hari`);
  return { expired: false, expiresAt: exp, text: `Masa berlaku sisa ${parts.join(' ')}` };
}

// ---------- generator surat otomatis ----------
// monthly = [{ period:'YYYY-MM', kpi, color, banned }] urut lama ke baru
export function generateLetters(monthly, settings) {
  const rules = settings.spRules;
  const out = [];
  let teguranAktif = [];   // periode ST yang belum dikonversi
  let spLevel = 0;         // 0 = belum ada SP aktif

  for (const m of monthly) {
    const endOfMonth = lastDayOf(m.period);

    // buang ST yang sudah lewat masa berlaku
    teguranAktif = teguranAktif.filter(p =>
      !validity(lastDayOf(p), rules.validityMonths, new Date(endOfMonth + 'T00:00:00')).expired
    );

    if (m.banned) {
      spLevel = Number(String(rules.bannedLetter).replace(/\D/g, '')) || 3;
      out.push(mkLetter(m, `SP${spLevel}`, endOfMonth,
        'Pelanggaran yang mengakibatkan akun live terkena banned platform.', settings));
      continue;
    }

    const action = m.color?.action;

    if (action === 'ST') {
      out.push(mkLetter(m, 'ST', endOfMonth,
        `Pencapaian KPI bulan ${m.period} sebesar ${m.kpi.toFixed(1)} poin, masuk kategori ${m.color.label}.`, settings));
      teguranAktif.push(m.period);

      if (teguranAktif.length >= num(rules.teguranToSp1)) {
        spLevel = Math.min(spLevel + 1, 3);
        out.push(mkLetter(m, `SP${spLevel}`, endOfMonth,
          `Akumulasi ${rules.teguranToSp1} kali surat teguran dalam masa berlaku (${teguranAktif.join(', ')}).`, settings));
        teguranAktif = [];
      }
    } else if (action === 'SP') {
      spLevel = Math.min(spLevel + 1, 3);
      out.push(mkLetter(m, `SP${spLevel}`, endOfMonth,
        `Pencapaian KPI bulan ${m.period} sebesar ${m.kpi.toFixed(1)} poin, masuk kategori ${m.color.label}.`, settings));
    }
  }
  return out;
}

function mkLetter(m, type, issuedAt, reason, settings) {
  const v = validity(issuedAt, settings.spRules.validityMonths);
  return {
    id: `auto-${m.hostId || 'h'}-${m.period}-${type}`,
    auto: true,
    hostId: m.hostId,
    period: m.period,
    type,
    issuedAt,
    expiresAt: v.expiresAt,
    kpi: m.kpi,
    reason,
    terminated: type === 'SP3'
  };
}

export function lastDayOf(period) {
  const [y, mo] = period.split('-').map(Number);
  return new Date(y, mo, 0).toISOString().slice(0, 10);
}

export function monthLabel(period) {
  const [y, mo] = period.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function tanggalPanjang(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}
