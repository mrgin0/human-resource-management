// ============================================================
//  RUMUS & PENGATURAN DEFAULT
//  Semua angka di sini bisa diubah lewat menu Setting.
// ============================================================

export const SCHEMA = 3;

export const DEFAULT_SETTINGS = {
  schema: SCHEMA,

  company: {
    name: 'PT Nama Perusahaan',
    address: 'Alamat perusahaan',
    city: 'Palangka Raya',
    hrName: 'Nama HR Manager',
    hrTitle: 'HR Manager'
  },

  // Jenis gaji. Gaji harian = tarif per jam x jam live hari itu.
  gajiTypes: [
    { id: 'g1', label: 'Gaji standar', rate: 20000 },
    { id: 'g2', label: 'Gaji weekend', rate: 25000 }
  ],

  // Jenis bonus (nominal tetap per hari)
  bonusTypes: [
    { id: 'b0', label: 'Tanpa bonus', amount: 0 },
    { id: 'b1', label: 'Bonus kehadiran', amount: 10000 },
    { id: 'b2', label: 'Bonus target harian', amount: 25000 },
    { id: 'b3', label: 'Bonus prime time', amount: 50000 }
  ],

  // Kolom simulasi cancel order.
  //  basis      : 'profit' = hitung dari profit bersih, 'komisi' = hitung dari komisi
  //  deductGaji : true = kurangi lagi dengan (gaji + bonus)
  //  isSalesBase: kolom ini yang dipakai sebagai nilai sales di penilaian KPI
  simulations: [
    { id: 's50', label: 'Simulasi 50% cancel order', cancelPct: 50, basis: 'profit', deductGaji: false, isSalesBase: true },
    { id: 's85', label: 'Simulasi 85% cancel order', cancelPct: 85, basis: 'komisi', deductGaji: false, isSalesBase: false }
  ],

  // Bobot KPI (total harus 100)
  weights: { kualitas: 40, produktivitas: 10, sales: 50 },

  // Tabel skor. Dibaca dari nilai tertinggi: nilai >= ambang memakai poin baris itu.
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

  // AMBANG DALAM RUPIAH, dibaca dari akumulasi kolom simulasi acuan satu bulan.
  // Angka di bawah hanya nilai awal. Sesuaikan dengan target bisnismu.
  salesBands: [
    { min: 4000000, poin: 100, label: 'Rp4.000.000 ke atas' },
    { min: 3500000, poin: 90, label: 'Rp3.500.000 - Rp3.999.999' },
    { min: 3000000, poin: 80, label: 'Rp3.000.000 - Rp3.499.999' },
    { min: 2500000, poin: 70, label: 'Rp2.500.000 - Rp2.999.999' },
    { min: 2000000, poin: 60, label: 'Rp2.000.000 - Rp2.499.999' },
    { min: 1500000, poin: 50, label: 'Rp1.500.000 - Rp1.999.999' },
    { min: 1000000, poin: 40, label: 'Rp1.000.000 - Rp1.499.999' },
    { min: 500000, poin: 30, label: 'Rp500.000 - Rp999.999' },
    { min: 0, poin: 20, label: 'Rp0 - Rp499.999' },
    { min: -500000, poin: 10, label: 'minus sampai Rp500.000' },
    { min: -1000000, poin: 5, label: 'minus sampai Rp1.000.000' },
    { min: -1500000, poin: 1, label: 'minus sampai Rp1.500.000' },
    { min: -1e12, poin: 0, label: 'minus lebih dari Rp1.500.000' }
  ],

  // Warna status dari nilai KPI bulanan, urut dari tinggi ke rendah.
  kpiColorBands: [
    { min: 85, key: 'hijau', label: 'Hijau - aman', action: 'none' },
    { min: 70, key: 'kuning', label: 'Kuning - perlu perbaikan', action: 'none' },
    { min: 50, key: 'pink', label: 'Pink - surat teguran', action: 'ST' },
    { min: -1e9, key: 'merah', label: 'Merah - surat peringatan', action: 'SP' }
  ],

  spRules: {
    teguranToSp1: 3,
    validityMonths: 6,
    rewardAtKpi: 100,
    bannedLetter: 'SP3'
  },

  letters: {}
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

// ---------- migrasi pengaturan lama ----------
export function migrateSettings(s) {
  const out = { ...s };
  if (num(out.schema) >= SCHEMA) return out;

  // Jenis gaji: dari nominal harian menjadi tarif per jam.
  out.gajiTypes = (out.gajiTypes || DEFAULT_SETTINGS.gajiTypes).map(g => ({
    id: g.id,
    label: g.label,
    rate: g.rate != null ? num(g.rate) : 20000
  }));

  // Tabel sales: ambang persen tidak lagi berlaku, ganti ke ambang rupiah.
  out.salesBands = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.salesBands));

  out.schema = SCHEMA;
  return out;
}

// Tarif per jam yang berlaku untuk satu baris.
function rateOf(row, settings) {
  const found = (settings.gajiTypes || []).find(g => g.id === row.gajiId);
  if (found) return num(found.rate);
  if (row.gajiRate != null) return num(row.gajiRate);
  const jam = num(row.jam);
  return jam > 0 ? num(row.gaji) / jam : 0;
}

function bonusOf(row, settings) {
  const found = (settings.bonusTypes || []).find(b => b.id === row.bonusId);
  return found ? num(found.amount) : num(row.bonus);
}

// ---------- baris harian ----------
export function computeRow(row, settings) {
  const jam = num(row.jam);
  const rate = rateOf(row, settings);
  const gaji = rate * jam;
  const bonus = bonusOf(row, settings);
  const komisi = num(row.komisi);
  const gajiBonus = gaji + bonus;
  const profitBersih = komisi - gajiBonus;

  const sims = {};
  for (const s of settings.simulations) {
    const base = s.basis === 'komisi' ? komisi : profitBersih;
    let v = base * (1 - num(s.cancelPct) / 100);
    if (s.deductGaji) v -= gajiBonus;
    sims[s.id] = v;
  }

  const salesSim = salesSimOf(settings);
  const salesValue = salesSim ? sims[salesSim.id] : 0;

  return {
    ...row,
    jam, rate, gaji, bonus, gajiBonus, profitBersih, sims, salesValue,
    kualitasPoin: row.kualitas === '' || row.kualitas == null
      ? null
      : bandPoin(settings.kualitasBands, row.kualitas),
    salesPoin: bandPoin(settings.salesBands, salesValue)
  };
}

export function salesSimOf(settings) {
  return (settings.simulations || []).find(s => s.isSalesBase) || (settings.simulations || [])[0];
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
    totals.jam += r.jam;
    totals.komisi += num(r.komisi);
    totals.gaji += r.gaji;
    totals.bonus += r.bonus;
    totals.gajiBonus += r.gajiBonus;
    totals.profitBersih += r.profitBersih;
    for (const s of settings.simulations) totals.sims[s.id] += r.sims[s.id];
  }

  const salesSim = salesSimOf(settings);
  const salesValue = salesSim ? totals.sims[salesSim.id] : 0;

  const kualitasVals = calc.filter(r => r.kualitas !== '' && r.kualitas != null).map(r => num(r.kualitas));
  const kualitasAvg = kualitasVals.length
    ? kualitasVals.reduce((a, b) => a + b, 0) / kualitasVals.length
    : null;

  const poin = {
    kualitas: kualitasAvg == null ? 0 : bandPoin(settings.kualitasBands, kualitasAvg),
    produktivitas: bandPoin(settings.produktivitasBands, totals.jam),
    sales: bandPoin(settings.salesBands, salesValue)
  };

  const w = settings.weights;
  const kpi =
    (poin.kualitas * num(w.kualitas) +
      poin.produktivitas * num(w.produktivitas) +
      poin.sales * num(w.sales)) / 100;

  // KPI berjalan per hari (akumulasi sampai tanggal tersebut)
  let jamRun = 0, salesRun = 0, kualSum = 0, kualN = 0;
  const running = calc.map(r => {
    jamRun += r.jam;
    salesRun += salesSim ? r.sims[salesSim.id] : 0;
    if (r.kualitas !== '' && r.kualitas != null) { kualSum += num(r.kualitas); kualN++; }

    const kAvg = kualN ? kualSum / kualN : null;
    const p = {
      kualitas: kAvg == null ? 0 : bandPoin(settings.kualitasBands, kAvg),
      produktivitas: bandPoin(settings.produktivitasBands, jamRun),
      sales: bandPoin(settings.salesBands, salesRun)
    };
    const k = (p.kualitas * num(w.kualitas) + p.produktivitas * num(w.produktivitas) + p.sales * num(w.sales)) / 100;
    return { ...r, kpiKumulatif: k, jamKumulatif: jamRun, salesKumulatif: salesRun, poinKumulatif: p };
  });

  return {
    rows: calc, running, totals, salesValue, kualitasAvg, poin, kpi,
    color: colorOf(kpi, settings)
  };
}

export function colorOf(kpi, settings) {
  const sorted = [...settings.kpiColorBands].sort((a, b) => b.min - a.min);
  for (const b of sorted) if (kpi >= b.min) return b;
  return sorted[sorted.length - 1];
}

// Berapa poin lagi supaya KPI tembus 100, dan berapa rupiah simulasi yang dibutuhkan.
export function gapToFull(period, settings) {
  const w = settings.weights;
  const need = 100;
  const current = period.kpi;
  if (current >= need) return { done: true, kurang: 0, salesTarget: null };

  const fixed = (period.poin.kualitas * num(w.kualitas) + period.poin.produktivitas * num(w.produktivitas)) / 100;
  const neededSalesPoin = num(w.sales) > 0 ? ((need - fixed) * 100) / num(w.sales) : Infinity;

  let salesTarget = null;
  if (neededSalesPoin <= 100) {
    const band = [...settings.salesBands].sort((a, b) => a.min - b.min).find(b => b.poin >= neededSalesPoin);
    if (band) salesTarget = band.min;
  }

  return {
    done: false,
    kurang: need - current,
    neededSalesPoin: Math.min(neededSalesPoin, 100),
    salesTarget,
    kurangRupiah: salesTarget == null ? null : Math.max(0, salesTarget - period.salesValue),
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
export function generateLetters(monthly, settings) {
  const rules = settings.spRules;
  const out = [];
  let teguranAktif = [];
  let spLevel = 0;

  for (const m of monthly) {
    const endOfMonth = lastDayOf(m.period);

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
