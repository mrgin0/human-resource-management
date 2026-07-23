import { initFirebase, fb } from './firebase.js';
import { BOOTSTRAP_ADMIN_EMAILS, IS_CONFIGURED } from './config.js';
import * as S from './store.js';
import * as C from './calc.js';
import { DEFAULT_LETTERS, renderLetter, letterTitle, letterNumber, exportPdf, escapeHtml } from './letters.js';

// ============================================================
//  STATE
// ============================================================
const st = {
  user: null,
  role: 'viewer',
  settings: null,
  hosts: [],
  daily: [],
  letters: [],
  users: [],
  hostId: null,
  period: new Date().toISOString().slice(0, 7),
  view: 'dashboard'
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const isAdmin = () => st.role === 'admin';
const salesSim = () => C.salesSimOf(st.settings) || { id: '', label: 'Simulasi' };

// ============================================================
//  BOOT
// ============================================================
(async function boot() {
  await initFirebase();

  $('#gateNote').textContent = IS_CONFIGURED
    ? 'Akun pertama yang terdaftar perlu dijadikan admin lewat Firebase Console atau daftar BOOTSTRAP_ADMIN_EMAILS di config.js.'
    : 'Firebase belum diisi di assets/js/config.js. Aplikasi berjalan dalam mode demo: kamu bisa mencoba semua fitur, tapi data hilang saat halaman dimuat ulang.';

  if (!IS_CONFIGURED) {
    $('#loginForm').innerHTML =
      '<button type="button" class="btn btn-primary" id="btnDemo">Masuk mode demo</button>';
    $('#btnDemo').onclick = () => startSession({ email: 'demo@lokal' });
    return;
  }

  fb.api.onAuthStateChanged(fb.auth, async user => {
    if (user) startSession(user);
    else { $('#gate').hidden = false; $('#shell').hidden = true; }
  });
})();

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  await auth('in');
});
$('#btnRegister')?.addEventListener('click', () => auth('up'));

async function auth(mode) {
  const email = $('#loginEmail').value.trim();
  const pass = $('#loginPass').value;
  $('#gateMsg').textContent = '';
  try {
    const fn = mode === 'in' ? fb.api.signIn : fb.api.signUp;
    await fn(fb.auth, email, pass);
  } catch (err) {
    $('#gateMsg').textContent = authMessage(err.code) || err.message;
  }
}

function authMessage(code) {
  return {
    'auth/invalid-credential': 'Email atau kata sandi salah.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/weak-password': 'Kata sandi minimal 6 karakter.',
    'auth/email-already-in-use': 'Email ini sudah terdaftar. Gunakan tombol Masuk.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'
  }[code];
}

$('#btnLogout').addEventListener('click', async () => {
  if (S.isLive()) await fb.api.signOut(fb.auth);
  location.reload();
});

async function startSession(user) {
  const profile = await S.ensureUserProfile(user, BOOTSTRAP_ADMIN_EMAILS);
  st.user = profile;
  st.role = profile.role;

  $('#whoName').textContent = profile.name || profile.email;
  $('#whoRole').textContent = isAdmin() ? 'Admin' : 'Hanya lihat';
  $('#gate').hidden = true;
  $('#shell').hidden = false;
  $$('[data-admin]').forEach(n => { n.hidden = !isAdmin(); });

  await loadAll();
  $('#periodPick').value = st.period;
  render();
}

async function loadAll() {
  const raw = await S.loadSettings();
  st.settings = C.migrateSettings(raw);
  if (!st.settings.letters || !st.settings.letters.ST) {
    st.settings.letters = { ...DEFAULT_LETTERS };
  }
  // Simpan hasil migrasi supaya struktur lama tidak dibaca ulang tiap kali.
  if (isAdmin() && C.num(raw.schema) < C.SCHEMA) {
    try { await S.saveSettings(st.settings); } catch (e) { /* abaikan */ }
  }

  st.hosts = await S.listAll('hosts');
  if (!st.hosts.length) {
    const id = await S.create('hosts', { name: 'Host 1', jabatan: 'Host Live', active: true });
    st.hosts = [{ id, name: 'Host 1', jabatan: 'Host Live', active: true }];
  }
  if (!st.hostId || !st.hosts.some(h => h.id === st.hostId)) st.hostId = st.hosts[0].id;

  st.daily = await S.listAll('daily');
  st.letters = await S.listAll('letters');
  if (S.isLive() && isAdmin()) st.users = await S.listAll('users');

  fillHostPicker();
}

function fillHostPicker() {
  $('#hostPick').innerHTML = st.hosts
    .map(h => `<option value="${h.id}"${h.id === st.hostId ? ' selected' : ''}>${escapeHtml(h.name)}</option>`)
    .join('');

  // Label sidebar ikut menampilkan jumlah host, misal "Host (2 team)".
  const label = $('#hostPick').closest('.fld')?.querySelector('span');
  if (label) label.textContent = `Host (${st.hosts.length} team)`;
}

$('#hostPick').addEventListener('change', e => { st.hostId = e.target.value; render(); });
$('#periodPick').addEventListener('change', e => { st.period = e.target.value; render(); });

$('#nav').addEventListener('click', e => {
  const b = e.target.closest('.nav-item');
  if (!b) return;
  st.view = b.dataset.view;
  $$('.nav-item').forEach(n => n.classList.toggle('is-active', n === b));
  render();
});

// ============================================================
//  DERIVED DATA
// ============================================================
const hostRows = () => st.daily.filter(r => r.hostId === st.hostId);
const periodRows = p => hostRows().filter(r => (r.date || '').slice(0, 7) === p);
const currentHost = () => st.hosts.find(h => h.id === st.hostId) || { name: '-', jabatan: 'Host Live' };

function allPeriods() {
  const set = new Set(hostRows().map(r => (r.date || '').slice(0, 7)).filter(Boolean));
  set.add(st.period);
  return [...set].sort();
}

function monthlySeries() {
  return allPeriods().map(p => {
    const rows = periodRows(p);
    const per = C.computePeriod(rows, st.settings);
    return {
      period: p,
      hostId: st.hostId,
      kpi: per.kpi,
      color: per.color,
      banned: rows.some(r => r.banned),
      per
    };
  });
}

function autoLetters() {
  const today = new Date().toISOString().slice(0, 7);
  const closed = monthlySeries().filter(m => m.period <= today && m.per.rows.length > 0);
  return C.generateLetters(closed, st.settings);
}

function allLetters() {
  const manual = st.letters
    .filter(l => l.hostId === st.hostId)
    .map(l => ({ ...l, auto: false }));
  return [...autoLetters(), ...manual].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

// ============================================================
//  RENDER ROUTER
// ============================================================
const TITLES = {
  dashboard: 'Ringkasan', harian: 'Data harian', kpi: 'Penilaian KPI',
  surat: 'Surat teguran & peringatan', riwayat: 'Riwayat bulanan', setting: 'Setting'
};

function render() {
  if (!st.settings) return;
  $('#viewTitle').textContent = TITLES[st.view];
  $('#ctxLine').textContent = `${currentHost().name} · ${C.monthLabel(st.period)}`;
  $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === st.view));
  $('#headActions').innerHTML = '';

  // Ganti node section dengan yang baru supaya listener render sebelumnya ikut hilang.
  const old = $(`.view[data-view="${st.view}"]`);
  const box = document.createElement('section');
  box.className = 'view is-active';
  box.dataset.view = st.view;
  old.replaceWith(box);

  ({
    dashboard: viewDashboard, harian: viewHarian, kpi: viewKpi,
    surat: viewSurat, riwayat: viewRiwayat, setting: viewSetting
  })[st.view](box);
}

// ============================================================
//  01 — RINGKASAN
// ============================================================
function viewDashboard(box) {
  const per = C.computePeriod(periodRows(st.period), st.settings);
  const gap = C.gapToFull(per, st.settings);
  const w = st.settings.weights;
  const letters = allLetters();
  const aktif = letters.filter(l => !C.validity(l.issuedAt, st.settings.spRules.validityMonths).expired);

  $('#headActions').innerHTML = `<button class="btn" data-act="print">Cetak halaman</button>`;
  $('#headActions').onclick = e => { if (e.target.dataset.act === 'print') window.print(); };

  box.innerHTML = `
    ${meterCard(per, gap)}

    <div class="card"><div class="stats">
      ${stat('Hari live', per.totals.hari, `${C.num(per.totals.jam).toLocaleString('id-ID')} jam total`)}
      ${stat('Komisi', C.rupiah(per.totals.komisi))}
      ${stat('Gaji + bonus', C.rupiah(per.totals.gajiBonus))}
      ${stat('Profit bersih', C.rupiah(per.totals.profitBersih), per.totals.profitBersih < 0 ? 'Minus' : '')}
      ${stat('Sales', C.rupiah(per.salesValue), `${per.poin.sales} poin`)}
      ${stat('Surat aktif', aktif.length, aktif.length ? aktif.map(l => l.type).join(', ') : 'Tidak ada')}
    </div></div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>Komponen KPI</h3></div>
        <div class="tbl-scroll"><table class="tbl">
          <thead><tr><th>Komponen</th><th class="num">Nilai</th><th class="num">Poin</th><th class="num">Bobot</th><th class="num">Kontribusi</th></tr></thead>
          <tbody>
            ${compRow('Kualitas', per.kualitasAvg == null ? 'belum diisi' : per.kualitasAvg.toFixed(0), per.poin.kualitas, w.kualitas)}
            ${compRow('Produktivitas', `${per.totals.jam} jam`, per.poin.produktivitas, w.produktivitas)}
            ${compRow(`Sales (${escapeHtml(salesSim().label)})`, C.rupiah(per.salesValue), per.poin.sales, w.sales)}
          </tbody>
          <tfoot><tr><td class="lbl" colspan="4">KPI bulan ini</td><td class="num">${per.kpi.toFixed(1)}</td></tr></tfoot>
        </table></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Surat terbaru</h3><p class="sub">Masa berlaku ${st.settings.spRules.validityMonths} bulan</p></div>
        ${letters.length ? `<div class="tbl-scroll"><table class="tbl">
          <thead><tr><th>Surat</th><th>Periode</th><th>Terbit</th><th>Masa berlaku</th></tr></thead>
          <tbody>${letters.slice(0, 6).map(l => {
            const v = C.validity(l.issuedAt, st.settings.spRules.validityMonths);
            return `<tr>
              <td><span class="pill ${l.type === 'ST' ? 'st' : 'sp'}">${l.type}</span></td>
              <td>${C.monthLabel(l.period)}</td>
              <td class="num">${l.issuedAt}</td>
              <td>${v.expired ? '<span class="pill dead">Expired</span>' : escapeHtml(v.text)}</td>
            </tr>`;
          }).join('')}</tbody></table></div>`
        : `<div class="empty"><b>Belum ada surat</b>Catatan disiplin masih bersih.</div>`}
      </div>
    </div>`;
}

function meterCard(per, gap) {
  const segs = 25;
  const on = Math.round((Math.max(0, Math.min(100, per.kpi)) / 100) * segs);
  const bars = Array.from({ length: segs }, (_, i) =>
    `<i class="seg ${i < on ? 'on b-' + per.color.key : ''}"></i>`).join('');

  const reward = per.kpi >= st.settings.spRules.rewardAtKpi;
  let note;
  if (reward) {
    note = `KPI menyentuh ${st.settings.spRules.rewardAtKpi} poin. Host berhak atas reward sesuai ketentuan perusahaan.`;
  } else if (gap.tidakTercapai) {
    note = `Kurang <b>${gap.kurang.toFixed(1)} poin</b> lagi menuju 100. Poin sales maksimum sudah tidak cukup menutup selisih bulan ini — kejar lewat kualitas dan jam live.`;
  } else {
    note = `Kurang <b>${gap.kurang.toFixed(1)} poin</b> lagi menuju 100.` +
      (gap.salesTarget != null
        ? ` Butuh ${escapeHtml(salesSim().label)} kumulatif menyentuh <b>${C.rupiah(gap.salesTarget)}</b>, kurang <b>${C.rupiah(gap.kurangRupiah)}</b> lagi dari ${C.rupiah(per.salesValue)}.`
        : '');
  }

  return `<div class="card"><div class="meter-wrap">
    <div class="meter-top">
      <div>
        <p class="eyebrow">KPI ${C.monthLabel(st.period)}</p>
        <div class="meter-score">
          <b class="c-${per.color.key}">${per.kpi.toFixed(1)}</b>
          <span>dari 100 poin · ${per.totals.hari} hari tercatat</span>
        </div>
      </div>
      <span class="meter-state c-${per.color.key}">${escapeHtml(per.color.label)}</span>
    </div>
    <div class="meter">${bars}</div>
    <div class="meter-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    <p class="meter-note">${note}</p>
  </div></div>`;
}

const stat = (label, val, sub = '') =>
  `<div class="stat"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;

const compRow = (name, nilai, poin, bobot) =>
  `<tr><td>${name}</td><td class="num">${nilai}</td><td class="num">${poin}</td>
   <td class="num">${bobot}%</td><td class="num">${((poin * bobot) / 100).toFixed(1)}</td></tr>`;

// ============================================================
//  02 — DATA HARIAN
// ============================================================
function viewHarian(box) {
  const per = C.computePeriod(periodRows(st.period), st.settings);
  const sims = st.settings.simulations;

  if (isAdmin()) {
    $('#headActions').innerHTML = `<button class="btn btn-primary" id="addRow">Tambah hari</button>`;
    $('#addRow').onclick = () => rowForm(null);
  }

  const head = `
    <tr>
      <th class="num">No</th><th>Tanggal</th><th class="num">Live/jam</th>
      <th class="num">Tarif/jam</th><th class="num">Komisi</th><th class="num">Gaji</th><th class="num">Bonus</th>
      <th class="num">Gaji + bonus</th><th class="num">Profit bersih</th>
      ${sims.map(s => `<th class="num">${escapeHtml(s.label)}</th>`).join('')}
      <th></th>
    </tr>`;

  const body = per.rows.map((r, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${r.date}${r.banned ? ' <span class="pill sp">Banned</span>' : ''}</td>
      <td class="num">${r.jam}</td>
      <td class="num">${C.rupiah(r.rate)}</td>
      <td class="num">${C.rupiah(r.komisi)}</td>
      <td class="num">${C.rupiah(r.gaji)}</td>
      <td class="num">${C.rupiah(r.bonus)}</td>
      <td class="num">${C.rupiah(r.gajiBonus)}</td>
      <td class="num ${r.profitBersih < 0 ? 'neg' : ''}">${C.rupiah(r.profitBersih)}</td>
      ${sims.map(s => `<td class="num ${r.sims[s.id] < 0 ? 'neg' : ''}">${C.rupiah(r.sims[s.id])}</td>`).join('')}
      <td>${isAdmin() ? `<div class="rowact">
        <button class="btn btn-sm" data-edit="${r.id}">Ubah</button>
        <button class="btn btn-sm btn-danger" data-del="${r.id}">Hapus</button></div>` : ''}</td>
    </tr>`).join('');

  const foot = `
    <tr>
      <td class="lbl" colspan="2">Total ${per.totals.hari} hari</td>
      <td class="num">${per.totals.jam}</td>
      <td class="num">—</td>
      <td class="num">${C.rupiah(per.totals.komisi)}</td>
      <td class="num">${C.rupiah(per.totals.gaji)}</td>
      <td class="num">${C.rupiah(per.totals.bonus)}</td>
      <td class="num">${C.rupiah(per.totals.gajiBonus)}</td>
      <td class="num">${C.rupiah(per.totals.profitBersih)}</td>
      ${sims.map(s => `<td class="num">${C.rupiah(per.totals.sims[s.id])}</td>`).join('')}
      <td></td>
    </tr>`;

  box.innerHTML = `
    <div class="note"><b>Cara hitung.</b> Gaji = tarif per jam × jam live. Gaji + bonus dan profit bersih terisi otomatis.
    Kolom simulasi mengikuti aturan di Setting: saat ini
    ${sims.map(s => `<em>${escapeHtml(s.label)}</em> = ${s.basis === 'komisi' ? 'komisi' : 'profit bersih'} × ${(100 - C.num(s.cancelPct))}%${s.deductGaji ? ' − (gaji + bonus)' : ''}`).join('; ')}.</div>

    <div class="card">
      <div class="card-head">
        <div><h3>Catatan live ${C.monthLabel(st.period)}</h3>
        <p class="sub">${per.totals.hari} hari tercatat</p></div>
      </div>
      ${per.rows.length
        ? `<div class="tbl-scroll"><table class="tbl"><thead>${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>`
        : `<div class="empty"><b>Belum ada data bulan ini</b>${isAdmin() ? 'Tekan “Tambah hari” untuk mulai mencatat.' : 'Hubungi admin untuk mengisi data.'}</div>`}
    </div>`;

  box.addEventListener('click', async e => {
    const ed = e.target.dataset.edit, dl = e.target.dataset.del;
    if (ed) rowForm(st.daily.find(r => r.id === ed));
    if (dl && confirm('Hapus catatan hari ini? Tindakan ini tidak bisa dibatalkan.')) {
      await S.remove('daily', dl);
      st.daily = st.daily.filter(r => r.id !== dl);
      toast('Catatan dihapus'); render();
    }
  });
}

function rowForm(row) {
  const g = st.settings.gajiTypes, b = st.settings.bonusTypes;
  const cur = row || {
    date: `${st.period}-01`, jam: 3, komisi: 0,
    gajiId: g[0]?.id, bonusId: b[0]?.id, banned: false
  };

  openModal(row ? 'Ubah catatan harian' : 'Tambah catatan harian', `
    <div class="grid grid-2">
      <label class="fld"><span>Tanggal</span><input type="date" id="f_date" value="${cur.date}"></label>
      <label class="fld"><span>Live / jam</span><input type="number" step="0.5" min="0" id="f_jam" value="${C.num(cur.jam)}"></label>
      <label class="fld"><span>Komisi yang dihasilkan (Rp)</span><input type="number" min="0" id="f_komisi" value="${C.num(cur.komisi)}"></label>
      <label class="fld"><span>Jenis gaji (tarif per jam)</span><select id="f_gaji">
        ${g.map(x => `<option value="${x.id}"${x.id === cur.gajiId ? ' selected' : ''}>${escapeHtml(x.label)} — ${C.rupiah(x.rate)}/jam</option>`).join('')}
      </select></label>
      <label class="fld"><span>Jenis bonus</span><select id="f_bonus">
        ${b.map(x => `<option value="${x.id}"${x.id === cur.bonusId ? ' selected' : ''}>${escapeHtml(x.label)} — ${C.rupiah(x.amount)}</option>`).join('')}
      </select></label>
      <label class="fld"><span>Kualitas (nilai mentah, opsional)</span><input type="number" id="f_kualitas" value="${cur.kualitas ?? ''}" placeholder="misal 235"></label>
    </div>
    <label style="display:flex;gap:8px;align-items:center;margin-top:4px">
      <input type="checkbox" id="f_banned" ${cur.banned ? 'checked' : ''} style="width:auto">
      <span style="font-size:13px">Terjadi pelanggaran yang mengakibatkan akun kena banned</span>
    </label>
    <p id="f_preview" class="note" style="margin-top:14px"></p>
  `, [
    { label: 'Simpan', primary: true, run: async () => {
      const gs = st.settings.gajiTypes.find(x => x.id === $('#f_gaji').value);
      const bs = st.settings.bonusTypes.find(x => x.id === $('#f_bonus').value);
      const jam = C.num($('#f_jam').value);
      const data = {
        hostId: st.hostId,
        date: $('#f_date').value,
        jam,
        komisi: C.num($('#f_komisi').value),
        gajiId: gs?.id || '',
        gajiRate: C.num(gs?.rate),
        gaji: C.num(gs?.rate) * jam,
        bonusId: bs?.id || '',
        bonus: C.num(bs?.amount),
        kualitas: $('#f_kualitas').value === '' ? null : C.num($('#f_kualitas').value),
        banned: $('#f_banned').checked
      };
      if (!data.date) { toast('Tanggal wajib diisi'); return false; }
      if (row) { await S.update('daily', row.id, data); Object.assign(row, data); }
      else { const id = await S.create('daily', data); st.daily.push({ id, ...data }); }
      toast('Catatan tersimpan');
      render();
    }}
  ]);

  const live = () => {
    const r = C.computeRow({
      jam: C.num($('#f_jam').value),
      komisi: C.num($('#f_komisi').value),
      gajiId: $('#f_gaji').value,
      bonusId: $('#f_bonus').value
    }, st.settings);
    $('#f_preview').innerHTML =
      `<b>Hasil hitung.</b> Gaji ${C.rupiah(r.rate)} × ${r.jam} jam = ${C.rupiah(r.gaji)} · ` +
      `Gaji + bonus ${C.rupiah(r.gajiBonus)} · Profit bersih ${C.rupiah(r.profitBersih)} · ` +
      st.settings.simulations.map(s => `${escapeHtml(s.label)} ${C.rupiah(r.sims[s.id])}`).join(' · ') +
      ` · Poin sales ${r.salesPoin}`;
  };
  ['#f_jam', '#f_komisi', '#f_gaji', '#f_bonus'].forEach(s => $(s).addEventListener('input', live));
  live();
}

// ============================================================
//  03 — PENILAIAN KPI
// ============================================================
function viewKpi(box) {
  const per = C.computePeriod(periodRows(st.period), st.settings);
  const gap = C.gapToFull(per, st.settings);
  const w = st.settings.weights;
  const sim = salesSim();

  box.innerHTML = `
    ${meterCard(per, gap)}

    <div class="card">
      <div class="card-head">
        <div><h3>Input KPI per hari</h3>
        <p class="sub">Hanya kolom kualitas yang diisi manual. Produktivitas dan sales terhitung otomatis dari data harian.</p></div>
      </div>
      ${per.running.length ? `<div class="tbl-scroll"><table class="tbl">
        <thead><tr>
          <th class="num">No</th><th>Tanggal</th>
          <th class="num">Kualitas</th><th class="num">Poin</th>
          <th class="num">Jam hari ini</th><th class="num">Jam kumulatif</th><th class="num">Poin</th>
          <th class="num">${escapeHtml(sim.label)} kumulatif</th><th class="num">Poin</th>
          <th class="num">KPI kumulatif</th><th>Status</th>
        </tr></thead>
        <tbody>${per.running.map((r, i) => {
          const col = C.colorOf(r.kpiKumulatif, st.settings);
          return `<tr>
            <td class="num">${i + 1}</td>
            <td>${r.date}</td>
            <td class="num">${isAdmin()
              ? `<input type="number" data-kual="${r.id}" value="${r.kualitas ?? ''}" style="width:82px;padding:4px 6px;border:1px solid var(--line);border-radius:4px;font-family:var(--mono);text-align:right">`
              : (r.kualitas ?? '—')}</td>
            <td class="num">${r.kualitasPoin ?? '—'}</td>
            <td class="num">${r.jam}</td>
            <td class="num">${r.jamKumulatif}</td>
            <td class="num">${r.poinKumulatif.produktivitas}</td>
            <td class="num ${r.salesKumulatif < 0 ? 'neg' : ''}">${C.rupiah(r.salesKumulatif)}</td>
            <td class="num">${r.poinKumulatif.sales}</td>
            <td class="num"><b>${r.kpiKumulatif.toFixed(1)}</b></td>
            <td><span class="pill ${pillClass(col.key)}">${col.key}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : `<div class="empty"><b>Belum ada data harian</b>Isi data harian dulu di menu 02.</div>`}
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>Rekap KPI bulan ini</h3></div>
        <div class="tbl-scroll"><table class="tbl">
          <thead><tr><th>Komponen</th><th class="num">Nilai kumulatif</th><th class="num">Poin</th><th class="num">Bobot</th><th class="num">Kontribusi</th></tr></thead>
          <tbody>
            ${compRow('Kualitas (rata-rata)', per.kualitasAvg == null ? 'belum diisi' : per.kualitasAvg.toFixed(1), per.poin.kualitas, w.kualitas)}
            ${compRow('Produktivitas', `${per.totals.jam} jam`, per.poin.produktivitas, w.produktivitas)}
            ${compRow('Sales', C.rupiah(per.salesValue), per.poin.sales, w.sales)}
          </tbody>
          <tfoot><tr><td class="lbl" colspan="4">Total KPI</td><td class="num">${per.kpi.toFixed(1)}</td></tr></tfoot>
        </table></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Cara sales dinilai</h3></div>
        <div class="card-body">
          <p style="margin-top:0;font-size:13px;color:var(--ink-2)">
            Poin sales dibaca langsung dari akumulasi <b>${escapeHtml(sim.label)}</b> satu bulan,
            dicocokkan ke tabel skor sales di Setting. Tidak lagi memakai persentase.
          </p>
          <div class="tbl-scroll"><table class="tbl">
            <tbody>
              <tr><td>${escapeHtml(sim.label)} kumulatif</td><td class="num"><b>${C.rupiah(per.salesValue)}</b></td></tr>
              <tr><td>Poin sales</td><td class="num"><b>${per.poin.sales}</b></td></tr>
              <tr><td>Ambang poin berikutnya</td><td class="num">${(() => {
                const next = [...st.settings.salesBands].sort((a, b) => a.min - b.min).find(bd => bd.min > per.salesValue);
                return next ? `${C.rupiah(next.min)} → ${next.poin} poin` : 'sudah tertinggi';
              })()}</td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
    </div>`;

  box.querySelectorAll('[data-kual]').forEach(inp => {
    inp.addEventListener('change', async () => {
      const id = inp.dataset.kual;
      const val = inp.value === '' ? null : C.num(inp.value);
      const rec = st.daily.find(r => r.id === id);
      rec.kualitas = val;
      await S.update('daily', id, { kualitas: val });
      toast('Nilai kualitas tersimpan');
      render();
    });
  });
}

const pillClass = key => ({ hijau: 'ok', kuning: 'warn', pink: 'st', merah: 'sp' }[key] || 'dead');

// ============================================================
//  04 — SURAT ST & SP
// ============================================================
function viewSurat(box) {
  const letters = allLetters();
  const months = st.settings.spRules.validityMonths;

  $('#headActions').innerHTML =
    `<button class="btn" id="pdfTable">Unduh tabel PDF</button>` +
    (isAdmin() ? `<button class="btn btn-primary" id="addLetter">Terbitkan surat manual</button>` : '');

  box.innerHTML = `
    <div class="note"><b>Aturan yang dipakai.</b> Status pink menerbitkan surat teguran.
    ${st.settings.spRules.teguranToSp1}× surat teguran dalam masa berlaku naik menjadi SP 1.
    Status merah langsung SP, bertingkat setiap bulan merah berikutnya sampai SP 3.
    Pelanggaran yang menyebabkan akun banned langsung ${st.settings.spRules.bannedLetter}.
    SP 3 berarti pemutusan hubungan kerja. Masa berlaku setiap surat ${months} bulan.</div>

    <div class="card" id="letterCard">
      <div class="card-head"><div><h3>Daftar surat</h3><p class="sub">${letters.length} surat tercatat</p></div></div>
      ${letters.length ? `<div class="tbl-scroll"><table class="tbl">
        <thead><tr>
          <th class="num">No</th><th>Jenis</th><th>Periode KPI</th><th class="num">KPI</th>
          <th>Alasan</th><th>Terbit</th><th>Berlaku sampai</th><th>Masa berlaku</th><th>Sumber</th><th></th>
        </tr></thead>
        <tbody>${letters.map((l, i) => {
          const v = C.validity(l.issuedAt, months);
          return `<tr>
            <td class="num">${i + 1}</td>
            <td><span class="pill ${l.type === 'ST' ? 'st' : 'sp'}">${l.type}</span>${l.terminated ? ' <span class="pill dead">PHK</span>' : ''}</td>
            <td>${l.period ? C.monthLabel(l.period) : '—'}</td>
            <td class="num">${l.kpi != null ? Number(l.kpi).toFixed(1) : '—'}</td>
            <td style="max-width:320px">${escapeHtml(l.reason || '')}</td>
            <td class="num">${l.issuedAt}</td>
            <td class="num">${v.expiresAt}</td>
            <td>${v.expired ? '<span class="pill dead">Expired</span>' : escapeHtml(v.text)}</td>
            <td>${l.auto ? 'Otomatis' : 'Manual'}</td>
            <td><div class="rowact">
              <button class="btn btn-sm" data-view-letter="${l.id}">Lihat</button>
              <button class="btn btn-sm" data-pdf-letter="${l.id}">PDF</button>
              ${!l.auto && isAdmin() ? `<button class="btn btn-sm btn-danger" data-del-letter="${l.id}">Hapus</button>` : ''}
            </div></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : `<div class="empty"><b>Belum ada surat</b>Semua periode masih di atas ambang teguran.</div>`}
    </div>`;

  $('#pdfTable').onclick = () => {
    const node = box.querySelector('#letterCard .tbl') || box.querySelector('#letterCard');
    const wrap = document.createElement('div');
    wrap.innerHTML = `<h2 style="font-family:serif">Rekapitulasi Surat Teguran dan Surat Peringatan</h2>
      <p style="font-family:serif">${escapeHtml(currentHost().name)} — dicetak ${C.tanggalPanjang(new Date().toISOString().slice(0, 10))}</p>`;
    wrap.appendChild(node.cloneNode(true));
    wrap.querySelectorAll('button').forEach(b => b.remove());
    exportPdf(wrap, `rekap-surat-${currentHost().name}.pdf`);
  };
  if (isAdmin()) $('#addLetter').onclick = () => letterForm();

  box.addEventListener('click', async e => {
    const v = e.target.dataset.viewLetter, p = e.target.dataset.pdfLetter, d = e.target.dataset.delLetter;
    if (v || p) {
      const l = letters.find(x => x.id === (v || p));
      const text = composeLetter(l);
      if (p) exportPdf(text, `${l.type}-${currentHost().name}-${l.period || l.issuedAt}.pdf`);
      else openModal(letterTitle(l.type), `<div class="letter-preview">${escapeHtml(text)}</div>`, [
        { label: 'Unduh PDF', primary: true, keepOpen: true, run: () => exportPdf(text, `${l.type}-${l.period || l.issuedAt}.pdf`) }
      ]);
    }
    if (d && confirm('Hapus surat manual ini?')) {
      await S.remove('letters', d);
      st.letters = st.letters.filter(x => x.id !== d);
      toast('Surat dihapus'); render();
    }
  });
}

function composeLetter(l) {
  const s = st.settings, h = currentHost();
  const v = C.validity(l.issuedAt, s.spRules.validityMonths);
  const tpl = s.letters[l.type] || DEFAULT_LETTERS[l.type] || '';
  const seq = allLetters().filter(x => x.type === l.type).length;
  return renderLetter(tpl, {
    perusahaan: s.company.name,
    alamat: s.company.address,
    kota: s.company.city,
    hrNama: s.company.hrName,
    hrJabatan: s.company.hrTitle,
    nama: h.name,
    jabatan: h.jabatan || 'Host Live',
    periode: l.period ? C.monthLabel(l.period) : '-',
    kpi: l.kpi != null ? Number(l.kpi).toFixed(1) : '-',
    alasan: l.reason || '',
    nomor: letterNumber(l.type, l.period || l.issuedAt.slice(0, 7), seq),
    judul: letterTitle(l.type),
    tanggal: C.tanggalPanjang(l.issuedAt),
    berlakuSampai: C.tanggalPanjang(v.expiresAt),
    masaBerlaku: v.text
  });
}

function letterForm() {
  const today = new Date().toISOString().slice(0, 10);
  openModal('Terbitkan surat manual', `
    <div class="grid grid-2">
      <label class="fld"><span>Jenis surat</span><select id="l_type">
        <option value="ST">Surat Teguran</option>
        <option value="SP1">SP 1</option><option value="SP2">SP 2</option><option value="SP3">SP 3</option>
      </select></label>
      <label class="fld"><span>Tanggal terbit</span><input type="date" id="l_date" value="${today}"></label>
      <label class="fld"><span>Periode KPI terkait</span><input type="month" id="l_period" value="${st.period}"></label>
      <label class="fld"><span>Nilai KPI (opsional)</span><input type="number" step="0.1" id="l_kpi"></label>
    </div>
    <label class="fld"><span>Uraian fakta / alasan</span><textarea id="l_reason" placeholder="Uraikan pelanggaran atau kekurangan pencapaian secara faktual: apa, kapan, bukti apa."></textarea></label>
  `, [
    { label: 'Terbitkan', primary: true, run: async () => {
      const data = {
        hostId: st.hostId,
        type: $('#l_type').value,
        issuedAt: $('#l_date').value,
        period: $('#l_period').value,
        kpi: $('#l_kpi').value === '' ? null : C.num($('#l_kpi').value),
        reason: $('#l_reason').value.trim(),
        terminated: $('#l_type').value === 'SP3'
      };
      if (!data.reason) { toast('Uraian alasan wajib diisi'); return false; }
      const id = await S.create('letters', data);
      st.letters.push({ id, ...data });
      toast('Surat diterbitkan'); render();
    }}
  ]);
}

// ============================================================
//  05 — RIWAYAT BULANAN
// ============================================================
function viewRiwayat(box) {
  const series = monthlySeries().filter(m => m.per.rows.length).reverse();
  const letters = allLetters();
  const months = st.settings.spRules.validityMonths;

  const count = (p, t) => letters.filter(l => l.period === p && (t === 'ST' ? l.type === 'ST' : l.type.startsWith('SP'))).length;
  const spList = p => letters.filter(l => l.period === p && l.type.startsWith('SP')).map(l => l.type).join(', ') || '—';

  $('#headActions').innerHTML = `<button class="btn" id="pdfHist">Unduh riwayat PDF</button>`;

  box.innerHTML = `
    <div class="card" id="histCard">
      <div class="card-head"><div><h3>Riwayat KPI dan surat per bulan</h3>
      <p class="sub">${escapeHtml(currentHost().name)} · ${series.length} bulan tercatat</p></div></div>
      ${series.length ? `<div class="tbl-scroll"><table class="tbl">
        <thead><tr>
          <th>Bulan</th><th class="num">Hari</th><th class="num">Jam</th>
          <th class="num">Kualitas</th><th class="num">Sales</th><th class="num">KPI</th>
          <th>Status</th><th class="num">Surat teguran</th><th class="num">Surat peringatan</th><th>Rincian SP</th><th class="num">Profit bersih</th>
        </tr></thead>
        <tbody>${series.map(m => `<tr>
          <td>${C.monthLabel(m.period)}</td>
          <td class="num">${m.per.totals.hari}</td>
          <td class="num">${m.per.totals.jam}</td>
          <td class="num">${m.per.kualitasAvg == null ? '—' : m.per.kualitasAvg.toFixed(0)}</td>
          <td class="num ${m.per.salesValue < 0 ? 'neg' : ''}">${C.rupiah(m.per.salesValue)}</td>
          <td class="num"><b>${m.kpi.toFixed(1)}</b></td>
          <td><span class="pill ${pillClass(m.color.key)}">${m.color.key}</span>${m.kpi >= st.settings.spRules.rewardAtKpi ? ' <span class="pill ok">Reward</span>' : ''}</td>
          <td class="num">${count(m.period, 'ST')}</td>
          <td class="num">${count(m.period, 'SP')}</td>
          <td>${spList(m.period)}</td>
          <td class="num ${m.per.totals.profitBersih < 0 ? 'neg' : ''}">${C.rupiah(m.per.totals.profitBersih)}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr>
          <td class="lbl">Total</td>
          <td class="num">${series.reduce((a, m) => a + m.per.totals.hari, 0)}</td>
          <td class="num">${series.reduce((a, m) => a + m.per.totals.jam, 0)}</td>
          <td class="num">—</td>
          <td class="num">${C.rupiah(series.reduce((a, m) => a + m.per.salesValue, 0))}</td>
          <td class="num">${series.length ? (series.reduce((a, m) => a + m.kpi, 0) / series.length).toFixed(1) : '0'}</td>
          <td>rata-rata</td>
          <td class="num">${letters.filter(l => l.type === 'ST').length}</td>
          <td class="num">${letters.filter(l => l.type.startsWith('SP')).length}</td>
          <td></td>
          <td class="num">${C.rupiah(series.reduce((a, m) => a + m.per.totals.profitBersih, 0))}</td>
        </tr></tfoot>
      </table></div>` : `<div class="empty"><b>Belum ada riwayat</b>Riwayat muncul setelah ada data harian yang tercatat.</div>`}
    </div>

    <div class="card">
      <div class="card-head"><h3>Status disiplin saat ini</h3></div>
      <div class="stats">
        ${stat('Surat aktif', letters.filter(l => !C.validity(l.issuedAt, months).expired).length, `masa berlaku ${months} bulan`)}
        ${stat('SP tertinggi aktif', (() => {
          const a = letters.filter(l => l.type.startsWith('SP') && !C.validity(l.issuedAt, months).expired);
          return a.length ? a.map(l => l.type).sort().pop() : 'Tidak ada';
        })())}
        ${stat('Teguran aktif', letters.filter(l => l.type === 'ST' && !C.validity(l.issuedAt, months).expired).length, `${st.settings.spRules.teguranToSp1}× menjadi SP 1`)}
        ${stat('Bulan reward', series.filter(m => m.kpi >= st.settings.spRules.rewardAtKpi).length, `KPI ≥ ${st.settings.spRules.rewardAtKpi}`)}
      </div>
    </div>`;

  $('#pdfHist').onclick = () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<h2 style="font-family:serif">Riwayat KPI dan Catatan Disiplin</h2>
      <p style="font-family:serif">${escapeHtml(currentHost().name)} — dicetak ${C.tanggalPanjang(new Date().toISOString().slice(0, 10))}</p>`;
    const t = box.querySelector('#histCard .tbl');
    if (t) wrap.appendChild(t.cloneNode(true));
    exportPdf(wrap, `riwayat-kpi-${currentHost().name}.pdf`);
  };
}

// ============================================================
//  06 — SETTING
// ============================================================
const SAVE_BTN = '<button class="btn btn-sm btn-primary" data-save>Simpan</button>';

function viewSetting(box) {
  if (!isAdmin()) { box.innerHTML = `<div class="empty"><b>Akses terbatas</b>Menu ini hanya untuk admin.</div>`; return; }
  const s = st.settings;
  const sim = salesSim();

  $('#headActions').innerHTML = `<button class="btn btn-primary" id="saveSet">Simpan semua perubahan</button>`;

  box.innerHTML = `
    <div class="note"><b>Menyimpan.</b> Setiap kartu punya tombol Simpan sendiri. Perubahan baru masuk ke database
    setelah tombol itu ditekan, jadi tekan Simpan sebelum berpindah menu atau menutup browser.</div>

    <div class="card">
      <div class="card-head"><div><h3>Identitas perusahaan</h3><p class="sub">Dipakai pada kop surat</p></div>${SAVE_BTN}</div>
      <div class="card-body"><div class="grid grid-3">
        ${txt('company.name', 'Nama perusahaan', s.company.name)}
        ${txt('company.address', 'Alamat', s.company.address)}
        ${txt('company.city', 'Kota penerbitan', s.company.city)}
        ${txt('company.hrName', 'Nama penanda tangan', s.company.hrName)}
        ${txt('company.hrTitle', 'Jabatan penanda tangan', s.company.hrTitle)}
      </div></div>
    </div>

    <div class="card">
      <div class="card-head"><div><h3>Host</h3><p class="sub">${st.hosts.length} team terdaftar. Perubahan nama langsung tersimpan.</p></div>
        <button class="btn btn-sm" id="addHost">Tambah host</button></div>
      <div class="card-body" id="hostList"></div>
    </div>

    <div class="grid grid-2">
      ${listCard('gajiTypes', 'Jenis gaji harian', 'Gaji harian = tarif per jam × jam live', 'rate', 'Tarif per jam (Rp)')}
      ${listCard('bonusTypes', 'Jenis bonus', 'Nominal tetap per hari', 'amount', 'Nominal (Rp)')}
    </div>

    <div class="card">
      <div class="card-head"><div><h3>Kolom simulasi cancel order</h3>
        <p class="sub">Kolom dengan “Dasar sales” = Ya yang dipakai menilai sales</p></div>
        <div style="display:flex;gap:8px"><button class="btn btn-sm" data-add-sim>Tambah kolom</button>${SAVE_BTN}</div></div>
      <div class="card-body" id="simList"></div>
    </div>

    <div class="card">
      <div class="card-head"><div><h3>Bobot KPI</h3><p class="sub">Total harus 100%</p></div>${SAVE_BTN}</div>
      <div class="card-body"><div class="grid grid-3">
        ${numf('weights.kualitas', 'Kualitas (%)', s.weights.kualitas)}
        ${numf('weights.produktivitas', 'Produktivitas (%)', s.weights.produktivitas)}
        ${numf('weights.sales', 'Sales (%)', s.weights.sales)}
      </div>
      <p class="note" id="wSum" style="margin-bottom:0"></p></div>
    </div>

    <div class="card">
      <div class="card-head"><div><h3>Tabel skor</h3>
        <p class="sub">Baris dibaca dari nilai tertinggi. Nilai ≥ ambang memakai poin baris itu.</p></div>${SAVE_BTN}</div>
      <div class="card-body"><div class="set-cols">
        ${bandBlock('kualitasBands', 'Kualitas', 'Ambang nilai')}
        ${bandBlock('produktivitasBands', 'Produktivitas', 'Ambang jam')}
        ${bandBlock('salesBands', 'Sales', `${escapeHtml(sim.label)} (Rp)`)}
      </div></div>
    </div>

    <div class="card">
      <div class="card-head"><div><h3>Warna status KPI</h3><p class="sub">Menentukan surat apa yang terbit otomatis</p></div>${SAVE_BTN}</div>
      <div class="card-body" id="colorList"></div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Aturan surat</h3>${SAVE_BTN}</div>
      <div class="card-body"><div class="grid grid-4">
        ${numf('spRules.teguranToSp1', 'Jumlah teguran menjadi SP 1', s.spRules.teguranToSp1)}
        ${numf('spRules.validityMonths', 'Masa berlaku surat (bulan)', s.spRules.validityMonths)}
        ${numf('spRules.rewardAtKpi', 'KPI minimum dapat reward', s.spRules.rewardAtKpi)}
        <label class="fld"><span>Surat saat kena banned</span>
          <select data-path="spRules.bannedLetter">
            ${['SP1', 'SP2', 'SP3'].map(v => `<option${v === s.spRules.bannedLetter ? ' selected' : ''}>${v}</option>`).join('')}
          </select></label>
      </div></div>
    </div>

    <div class="card">
      <div class="card-head"><div><h3>Naskah surat</h3>
        <p class="sub">Placeholder: {{nama}} {{jabatan}} {{periode}} {{kpi}} {{alasan}} {{nomor}} {{tanggal}} {{berlakuSampai}} {{perusahaan}} {{alamat}} {{kota}} {{hrNama}} {{hrJabatan}}</p></div>
        <div style="display:flex;gap:8px"><button class="btn btn-sm" id="resetTpl">Pakai naskah standar internasional</button>${SAVE_BTN}</div></div>
      <div class="card-body">
        ${['ST', 'SP1', 'SP2', 'SP3'].map(t => `
          <label class="fld"><span>${letterTitle(t)}</span>
            <textarea data-tpl="${t}" style="min-height:180px">${escapeHtml(s.letters[t] || '')}</textarea></label>`).join('')}
      </div>
    </div>

    ${S.isLive() ? `<div class="card">
      <div class="card-head"><h3>Pengguna</h3><p class="sub">Perubahan peran langsung tersimpan.</p></div>
      <div class="card-body" id="userList"></div>
    </div>` : ''}`;

  renderHosts(); renderSims(); renderColors(); renderUsers(); sumWeights();

  box.addEventListener('input', e => {
    const p = e.target.dataset.path;
    if (p) { setPath(st.settings, p, e.target.type === 'number' ? C.num(e.target.value) : e.target.value); sumWeights(); }
    const b = e.target.dataset.band;
    if (b) {
      const [key, i, field] = b.split('|');
      st.settings[key][i][field] = field === 'label' ? e.target.value : C.num(e.target.value);
    }
    if (e.target.dataset.tpl) st.settings.letters[e.target.dataset.tpl] = e.target.value;
  });

  box.addEventListener('click', async e => {
    const t = e.target;

    if (t.hasAttribute('data-save')) { await persist(); return; }

    if (t.dataset.bandDel) {
      const [key, i] = t.dataset.bandDel.split('|');
      st.settings[key].splice(Number(i), 1); render();
    }
    if (t.dataset.bandAdd) {
      st.settings[t.dataset.bandAdd].push({ min: 0, poin: 0, label: 'baris baru' }); render();
    }
    if (t.dataset.itemAdd) {
      const key = t.dataset.itemAdd;
      const item = { id: 'i' + Date.now().toString(36), label: 'Item baru' };
      if (key === 'gajiTypes') item.rate = 20000; else item.amount = 0;
      st.settings[key].push(item); render();
    }
    if (t.dataset.itemDel) {
      const [key, i] = t.dataset.itemDel.split('|');
      st.settings[key].splice(Number(i), 1); render();
    }
    if (t.hasAttribute('data-add-sim')) {
      st.settings.simulations.push({
        id: 's' + Date.now().toString(36), label: 'Simulasi baru',
        cancelPct: 50, basis: 'profit', deductGaji: false, isSalesBase: false
      });
      render();
    }
    if (t.id === 'addHost') {
      const name = prompt('Nama host baru:');
      if (name) {
        const id = await S.create('hosts', { name, jabatan: 'Host Live', active: true });
        st.hosts.push({ id, name, jabatan: 'Host Live', active: true });
        fillHostPicker(); render(); toast('Host ditambahkan');
      }
    }
    if (t.dataset.hostDel) {
      if (confirm('Hapus host ini? Data harian miliknya tidak ikut terhapus.')) {
        await S.remove('hosts', t.dataset.hostDel);
        st.hosts = st.hosts.filter(h => h.id !== t.dataset.hostDel);
        if (st.hostId === t.dataset.hostDel) st.hostId = st.hosts[0]?.id;
        fillHostPicker(); render();
      }
    }
    if (t.id === 'resetTpl') {
      if (confirm('Ganti keempat naskah dengan template standar internasional? Naskah yang sekarang akan hilang.')) {
        st.settings.letters = { ...DEFAULT_LETTERS };
        render(); toast('Naskah standar dipasang. Tekan Simpan pada kartu naskah surat.');
      }
    }
  });

  $('#saveSet').onclick = () => persist(true);

  async function persist(checkWeights = false) {
    if (checkWeights) {
      const w = st.settings.weights;
      if (C.num(w.kualitas) + C.num(w.produktivitas) + C.num(w.sales) !== 100) {
        if (!confirm('Total bobot bukan 100%. Tetap simpan?')) return;
      }
    }
    try {
      await S.saveSettings(st.settings);
      toast('Pengaturan tersimpan');
    } catch (err) {
      toast('Gagal menyimpan: ' + (err.message || err));
    }
  }

  function sumWeights() {
    const w = st.settings.weights;
    const total = C.num(w.kualitas) + C.num(w.produktivitas) + C.num(w.sales);
    const el = $('#wSum');
    if (el) el.innerHTML = `<b>Total bobot ${total}%.</b> ${total === 100 ? 'Sudah benar.' : 'Sesuaikan sampai 100% agar KPI maksimum tepat 100 poin.'}`;
  }

  function renderHosts() {
    $('#hostList').innerHTML = st.hosts.map(h => `
      <div class="band-row">
        <input value="${escapeHtml(h.name)}" data-host="${h.id}|name">
        <input value="${escapeHtml(h.jabatan || '')}" data-host="${h.id}|jabatan" placeholder="Jabatan">
        <span style="font-size:12px;color:var(--mute)">${hostRowsOf(h.id)} catatan harian</span>
        <button class="btn btn-sm btn-danger" data-host-del="${h.id}">Hapus</button>
      </div>`).join('');
    $('#hostList').addEventListener('change', async e => {
      if (!e.target.dataset.host) return;
      const [id, field] = e.target.dataset.host.split('|');
      const h = st.hosts.find(x => x.id === id);
      h[field] = e.target.value;
      await S.update('hosts', id, { [field]: e.target.value });
      fillHostPicker(); toast('Host diperbarui');
    });
  }

  function renderSims() {
    $('#simList').innerHTML = `
      <div class="band-head" style="grid-template-columns:2fr 1fr 1.2fr 1fr 1fr auto">
        <span>Judul kolom</span><span>Cancel (%)</span><span>Basis hitung</span><span>Kurangi gaji+bonus</span><span>Dasar sales</span><span></span>
      </div>
      ${st.settings.simulations.map((x, i) => `
        <div class="band-row" style="grid-template-columns:2fr 1fr 1.2fr 1fr 1fr auto">
          <input value="${escapeHtml(x.label)}" data-sim="${i}|label">
          <input type="number" value="${x.cancelPct}" data-sim="${i}|cancelPct">
          <select data-sim="${i}|basis">
            <option value="profit"${x.basis === 'profit' ? ' selected' : ''}>Profit bersih</option>
            <option value="komisi"${x.basis === 'komisi' ? ' selected' : ''}>Komisi</option>
          </select>
          <select data-sim="${i}|deductGaji">
            <option value="no"${!x.deductGaji ? ' selected' : ''}>Tidak</option>
            <option value="yes"${x.deductGaji ? ' selected' : ''}>Ya</option>
          </select>
          <select data-sim="${i}|isSalesBase">
            <option value="no"${!x.isSalesBase ? ' selected' : ''}>Bukan</option>
            <option value="yes"${x.isSalesBase ? ' selected' : ''}>Ya</option>
          </select>
          <button class="btn btn-sm btn-danger" data-sim-del="${i}">Hapus</button>
        </div>`).join('')}`;

    $('#simList').addEventListener('input', e => {
      const d = e.target.dataset.sim;
      if (!d) return;
      const [i, f] = d.split('|');
      const sim = st.settings.simulations[Number(i)];
      if (f === 'cancelPct') sim[f] = C.num(e.target.value);
      else if (f === 'deductGaji' || f === 'isSalesBase') {
        sim[f] = e.target.value === 'yes';
        if (f === 'isSalesBase' && sim[f]) st.settings.simulations.forEach((o, j) => { if (j !== Number(i)) o.isSalesBase = false; });
      } else sim[f] = e.target.value;
    });
    $('#simList').addEventListener('click', e => {
      if (e.target.dataset.simDel != null) {
        st.settings.simulations.splice(Number(e.target.dataset.simDel), 1); render();
      }
    });
  }

  function renderColors() {
    $('#colorList').innerHTML = `
      <div class="band-head" style="grid-template-columns:1fr 1fr 2fr 1.2fr auto">
        <span>KPI minimum</span><span>Kode warna</span><span>Label tampil</span><span>Tindakan</span><span></span>
      </div>
      ${st.settings.kpiColorBands.map((c, i) => `
        <div class="band-row" style="grid-template-columns:1fr 1fr 2fr 1.2fr auto">
          <input type="number" value="${c.min}" data-col="${i}|min">
          <select data-col="${i}|key">
            ${['hijau', 'kuning', 'pink', 'merah'].map(k => `<option${k === c.key ? ' selected' : ''}>${k}</option>`).join('')}
          </select>
          <input value="${escapeHtml(c.label)}" data-col="${i}|label">
          <select data-col="${i}|action">
            <option value="none"${c.action === 'none' ? ' selected' : ''}>Tidak ada surat</option>
            <option value="ST"${c.action === 'ST' ? ' selected' : ''}>Surat teguran</option>
            <option value="SP"${c.action === 'SP' ? ' selected' : ''}>Surat peringatan</option>
          </select>
          <button class="btn btn-sm btn-danger" data-col-del="${i}">Hapus</button>
        </div>`).join('')}`;

    $('#colorList').addEventListener('input', e => {
      const d = e.target.dataset.col; if (!d) return;
      const [i, f] = d.split('|');
      st.settings.kpiColorBands[Number(i)][f] = f === 'min' ? C.num(e.target.value) : e.target.value;
    });
    $('#colorList').addEventListener('click', e => {
      if (e.target.dataset.colDel != null) { st.settings.kpiColorBands.splice(Number(e.target.dataset.colDel), 1); render(); }
    });
  }

  function renderUsers() {
    const wrap = $('#userList'); if (!wrap) return;
    wrap.innerHTML = st.users.length ? st.users.map(u => `
      <div class="band-row" style="grid-template-columns:2fr 1.5fr 1fr auto">
        <span style="font-size:13px">${escapeHtml(u.email || '')}</span>
        <span style="font-size:13px;color:var(--mute)">${escapeHtml(u.name || '')}</span>
        <select data-role="${u.id}">
          <option value="viewer"${u.role === 'viewer' ? ' selected' : ''}>Hanya lihat</option>
          <option value="admin"${u.role === 'admin' ? ' selected' : ''}>Admin</option>
        </select><span></span>
      </div>`).join('') : '<p style="color:var(--mute);font-size:13px;margin:0">Belum ada pengguna lain yang terdaftar.</p>';

    wrap.addEventListener('change', async e => {
      if (!e.target.dataset.role) return;
      await S.setUserRole(e.target.dataset.role, e.target.value);
      toast('Peran pengguna diperbarui');
    });
  }
}

const hostRowsOf = id => st.daily.filter(r => r.hostId === id).length;

const txt = (path, label, val) =>
  `<label class="fld"><span>${label}</span><input data-path="${path}" value="${escapeHtml(val ?? '')}"></label>`;
const numf = (path, label, val) =>
  `<label class="fld"><span>${label}</span><input type="number" data-path="${path}" value="${C.num(val)}"></label>`;

function listCard(key, title, sub, field, fieldLabel) {
  const items = st.settings[key];
  return `<div class="card">
    <div class="card-head"><div><h3>${title}</h3><p class="sub">${sub}</p></div>
      <div style="display:flex;gap:8px"><button class="btn btn-sm" data-item-add="${key}">Tambah</button>${SAVE_BTN}</div></div>
    <div class="card-body">
      <div class="band-head" style="grid-template-columns:2fr 1fr auto"><span>Nama</span><span>${fieldLabel}</span><span></span></div>
      ${items.map((x, i) => `<div class="band-row" style="grid-template-columns:2fr 1fr auto">
        <input value="${escapeHtml(x.label)}" data-band="${key}|${i}|label">
        <input type="number" value="${C.num(x[field])}" data-band="${key}|${i}|${field}">
        <button class="btn btn-sm btn-danger" data-item-del="${key}|${i}">Hapus</button>
      </div>`).join('')}
    </div></div>`;
}

function bandBlock(key, title, minLabel) {
  return `<div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <h4 style="font-size:13px;font-family:var(--display)">${title}</h4>
      <button class="btn btn-sm" data-band-add="${key}">Tambah baris</button>
    </div>
    <div class="band-head"><span>${minLabel}</span><span>Poin</span><span>Keterangan</span><span></span></div>
    ${st.settings[key].map((b, i) => `<div class="band-row">
      <input type="number" value="${b.min}" data-band="${key}|${i}|min">
      <input type="number" value="${b.poin}" data-band="${key}|${i}|poin">
      <input value="${escapeHtml(b.label || '')}" data-band="${key}|${i}|label">
      <button class="btn btn-sm btn-danger" data-band-del="${key}|${i}">×</button>
    </div>`).join('')}
  </div>`;
}

function setPath(obj, path, val) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = val;
}

// ============================================================
//  MODAL & TOAST
// ============================================================
function openModal(title, html, actions = []) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  $('#modalFoot').innerHTML = '';
  actions.forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.primary ? 'btn-primary' : '');
    b.textContent = a.label;
    b.onclick = async () => {
      const res = await a.run();
      if (res !== false && !a.keepOpen) closeModal();
    };
    $('#modalFoot').appendChild(b);
  });
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; }
$('#modalClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
