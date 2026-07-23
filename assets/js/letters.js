// ============================================================
//  TEMPLATE SURAT
//  Placeholder yang tersedia:
//  {{perusahaan}} {{alamat}} {{kota}} {{hrNama}} {{hrJabatan}}
//  {{nama}} {{jabatan}} {{periode}} {{kpi}} {{alasan}}
//  {{nomor}} {{tanggal}} {{berlakuSampai}} {{masaBerlaku}}
// ============================================================

const KOP = `{{perusahaan}}
{{alamat}}

Nomor   : {{nomor}}
Perihal : {{judul}}
Tanggal : {{tanggal}}
`;

const PENUTUP_HAK = `HAK KARYAWAN

Sesuai asas due process, Saudara/i berhak:
1. Memberikan penjelasan dan bukti tandingan atas fakta yang dimuat dalam surat ini.
2. Didampingi oleh rekan kerja atau perwakilan pekerja saat pemeriksaan.
3. Mengajukan keberatan tertulis kepada atasan dari pemberi surat atau kepada HR paling lambat 7 (tujuh) hari kerja sejak surat ini diterima.

Surat ini dibuat rangkap dua, satu untuk Saudara/i dan satu untuk arsip personalia. Penolakan menandatangani surat tidak membatalkan keberlakuannya dan akan dicatat dengan dua orang saksi.


{{kota}}, {{tanggal}}


Menyetujui menerima,                          Diterbitkan oleh,



(________________________)                    (________________________)
{{nama}}                                      {{hrNama}}
{{jabatan}}                                   {{hrJabatan}}
`;

export const DEFAULT_LETTERS = {
  ST: `${KOP}
SURAT TEGURAN

Kepada Yth.
Saudara/i {{nama}}
{{jabatan}}

Berdasarkan evaluasi kinerja periode {{periode}}, perusahaan menyampaikan teguran tertulis dengan uraian sebagai berikut.

I. DASAR EVALUASI
Nilai KPI periode {{periode}}: {{kpi}} poin.
{{alasan}}

II. SIFAT SURAT
Surat ini merupakan teguran tertulis dan bukan Surat Peringatan. Surat ini diterbitkan sebagai langkah pembinaan pertama dalam mekanisme disiplin progresif perusahaan.

III. PERBAIKAN YANG DIMINTA
Saudara/i diminta memperbaiki pencapaian KPI pada periode berikutnya, dengan pendampingan dan pembinaan dari atasan langsung. Perusahaan akan melakukan peninjauan pada akhir periode berikutnya.

IV. KONSEKUENSI
Akumulasi teguran tertulis dalam masa berlakunya akan ditingkatkan menjadi Surat Peringatan sesuai peraturan perusahaan.

V. MASA BERLAKU
Surat ini berlaku sampai dengan {{berlakuSampai}}. Setelah tanggal tersebut, surat ini tidak lagi diperhitungkan dalam penilaian disiplin.

${PENUTUP_HAK}`,

  SP1: `${KOP}
SURAT PERINGATAN PERTAMA (SP 1)

Kepada Yth.
Saudara/i {{nama}}
{{jabatan}}

I. DASAR PENERBITAN
Nilai KPI periode {{periode}}: {{kpi}} poin.
{{alasan}}

II. PROSES YANG TELAH DITEMPUH
Sebelum surat ini diterbitkan, perusahaan telah melakukan pemeriksaan atas data kinerja dan memberikan kesempatan kepada Saudara/i untuk menyampaikan penjelasan. Surat ini diterbitkan berdasarkan prinsip disiplin progresif dan proporsionalitas sanksi.

III. PERBAIKAN YANG DIMINTA
Saudara/i wajib mencapai standar KPI yang berlaku pada periode berikutnya. Atasan langsung akan menetapkan rencana perbaikan dan melakukan peninjauan berkala.

IV. KONSEKUENSI
Apabila dalam masa berlaku surat ini pencapaian tidak membaik atau terjadi pelanggaran serupa, perusahaan akan menerbitkan Surat Peringatan Kedua (SP 2).

V. MASA BERLAKU
Surat ini berlaku 6 (enam) bulan, sampai dengan {{berlakuSampai}}. Setelah masa berlaku berakhir tanpa pengulangan, catatan disiplin kembali bersih.

${PENUTUP_HAK}`,

  SP2: `${KOP}
SURAT PERINGATAN KEDUA (SP 2)

Kepada Yth.
Saudara/i {{nama}}
{{jabatan}}

I. DASAR PENERBITAN
Nilai KPI periode {{periode}}: {{kpi}} poin.
{{alasan}}
Surat ini diterbitkan karena Surat Peringatan Pertama masih dalam masa berlaku dan perbaikan yang diminta belum tercapai.

II. PROSES YANG TELAH DITEMPUH
Perusahaan telah melakukan pemeriksaan, memberikan kesempatan Saudara/i untuk didengar, serta mempertimbangkan penjelasan yang disampaikan sebelum menetapkan sanksi ini.

III. PERBAIKAN YANG DIMINTA
Saudara/i wajib mengikuti program perbaikan kinerja yang ditetapkan perusahaan dan mencapai standar KPI pada periode berikutnya. Evaluasi dilakukan setiap bulan.

IV. KONSEKUENSI
Kegagalan memenuhi standar dalam masa berlaku surat ini akan berakibat pada penerbitan Surat Peringatan Ketiga (SP 3) yang merupakan peringatan terakhir.

V. MASA BERLAKU
Surat ini berlaku 6 (enam) bulan, sampai dengan {{berlakuSampai}}.

${PENUTUP_HAK}`,

  SP3: `${KOP}
SURAT PERINGATAN KETIGA DAN TERAKHIR (SP 3)

Kepada Yth.
Saudara/i {{nama}}
{{jabatan}}

I. DASAR PENERBITAN
Nilai KPI periode {{periode}}: {{kpi}} poin.
{{alasan}}

II. PROSES YANG TELAH DITEMPUH
Perusahaan telah menerbitkan peringatan bertahap sebelumnya, melakukan pemeriksaan atas fakta, dan memberikan kesempatan kepada Saudara/i untuk menyampaikan pembelaan. Sanksi ini ditetapkan setelah mempertimbangkan seluruh keterangan yang ada.

III. STATUS
Surat ini merupakan peringatan terakhir. Selama masa berlakunya, pelanggaran atau kegagalan pencapaian berikutnya dapat menjadi dasar pemutusan hubungan kerja sesuai peraturan perundang-undangan yang berlaku dan peraturan perusahaan.

IV. PERBAIKAN YANG DIMINTA
Saudara/i wajib mencapai standar KPI yang ditetapkan dan menaati seluruh ketentuan perusahaan tanpa pengecualian selama masa berlaku surat ini.

V. MASA BERLAKU
Surat ini berlaku 6 (enam) bulan, sampai dengan {{berlakuSampai}}.

${PENUTUP_HAK}`
};

export function renderLetter(template, vars) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] == null ? '' : String(vars[k])
  );
}

export function letterTitle(type) {
  return {
    ST: 'Surat Teguran',
    SP1: 'Surat Peringatan Pertama',
    SP2: 'Surat Peringatan Kedua',
    SP3: 'Surat Peringatan Ketiga dan Terakhir'
  }[type] || 'Surat';
}

export function letterNumber(type, period, seq = 1) {
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const [y, m] = period.split('-').map(Number);
  const kode = type === 'ST' ? 'ST' : `SP-${type.slice(2)}`;
  return `${String(seq).padStart(3, '0')}/${kode}/HRD/${roman[m]}/${y}`;
}

// --------- ekspor PDF ---------
let pdfLibPromise = null;
function loadPdfLib() {
  if (pdfLibPromise) return pdfLibPromise;
  pdfLibPromise = new Promise((resolve, reject) => {
    if (window.html2pdf) return resolve(window.html2pdf);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    s.onload = () => resolve(window.html2pdf);
    s.onerror = () => reject(new Error('gagal memuat pustaka PDF'));
    document.head.appendChild(s);
  });
  return pdfLibPromise;
}

export async function exportPdf(textOrNode, filename) {
  const wrap = document.createElement('div');
  wrap.className = 'pdf-page';
  if (typeof textOrNode === 'string') {
    const pre = document.createElement('pre');
    pre.textContent = textOrNode;
    wrap.appendChild(pre);
  } else {
    wrap.appendChild(textOrNode.cloneNode(true));
  }
  document.body.appendChild(wrap);

  try {
    const html2pdf = await loadPdfLib();
    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(wrap)
      .save();
    return true;
  } catch (e) {
    // Fallback: buka dialog cetak browser, pilih "Save as PDF"
    const w = window.open('', '_blank');
    w.document.write(`<title>${filename}</title><style>
      body{font-family:"Times New Roman",serif;white-space:pre-wrap;line-height:1.55;padding:24px;font-size:12pt}
      table{border-collapse:collapse;width:100%;font-size:10pt}td,th{border:1px solid #444;padding:5px 7px}
    </style>`);
    w.document.write(typeof textOrNode === 'string'
      ? `<pre style="font-family:'Times New Roman',serif;white-space:pre-wrap">${escapeHtml(textOrNode)}</pre>`
      : textOrNode.outerHTML);
    w.document.close();
    w.focus();
    w.print();
    return false;
  } finally {
    wrap.remove();
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
