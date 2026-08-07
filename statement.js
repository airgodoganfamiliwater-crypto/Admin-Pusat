/* ================= STATEMENT (3 TAB: Statement / ROI / Ekuitas) =================
   Tab Statement & ROI masih placeholder.
   Tab Ekuitas ambil & kelola data collection "investor" (global, semua investor).
=================================================================================== */

let stmInited = false;

async function loadStatementData(){
  const activeTab = document.querySelector(".st-tab.active").dataset.tab;

  if(!stmInited){
    stmInitFilterDefault();
    stmInited = true;
  }

  if(activeTab === "statement") stmLoadList();
  else if(activeTab === "ekuitas") stLoadEkuitas();
  else if(activeTab === "roi") roiLoadInvestorList();
}

document.querySelectorAll(".st-tab").forEach(tab => {
  tab.addEventListener("click", () => stSwitchTab(tab.dataset.tab));
});

function stSwitchTab(tab){
  document.querySelectorAll(".st-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".st-tab-content").forEach(c => c.classList.remove("active"));

  document.querySelector(`.st-tab[data-tab="${tab}"]`).classList.add("active");
  document.getElementById("st-tab-" + tab).classList.add("active");

  if(tab === "statement") stmLoadList();
  else if(tab === "ekuitas") stLoadEkuitas();
  else if(tab === "roi") roiLoadInvestorList();
}

/* ================= EKUITAS: LIST ================= */

async function stLoadEkuitas(){
  const listEl = document.getElementById("stEkuitasList");

  try{
    const snap = await db.collection("investor").get();

    if(snap.empty){
      listEl.innerHTML = `<p class="st-small">Belum ada data investor</p>`;
      return;
    }

    let arr = [];
    snap.forEach(doc => arr.push(doc.data()));

    arr.sort((a, b) => (Number(b.jumlahInvestasi) || 0) - (Number(a.jumlahInvestasi) || 0));

    listEl.innerHTML = "";

    arr.forEach(d => {
      const nama = d.nama || "-";
      const investasi = Number(d.jumlahInvestasi) || 0;
      const portofolio = Number(d.portofolio) || 0;
      const ret = Number(d.return) || 0;
      const assetPersen = (Number(d.asset) || 0) / 10;

      const bank = (d.noRek && d.noRek.bank) || "-";
      const norek = (d.noRek && d.noRek.nomor) || "-";

      const div = document.createElement("div");
      div.className = "st-eq-item";
      div.onclick = () => eqOpenSheet("edit", d);
      div.innerHTML = `
        <div class="st-eq-head">
          <div class="st-eq-avatar"><i class="fa-solid fa-user"></i></div>
          <div>
            <div class="st-eq-name">${nama}</div>
            <div class="st-eq-email">${d.email || "-"}</div>
          </div>
          <div class="st-eq-percent">${assetPersen.toFixed(1)}%</div>
        </div>
        <hr>
        <div class="st-eq-row"><span>Investasi</span><b>${rupiah(investasi)}</b></div>
        <div class="st-eq-row"><span>Portofolio</span><b>${rupiah(portofolio)}</b></div>
        <div class="st-eq-row"><span>Return</span><b class="st-eq-return">${rupiah(ret)}</b></div>
        <div class="st-eq-row"><span>Rekening</span><b>${bank} - ${norek}</b></div>
      `;
      listEl.appendChild(div);
    });

  }catch(err){
    listEl.innerHTML = `<p class="st-small">Gagal ambil data investor: ${err.message}</p>`;
    console.error("Gagal ambil ekuitas:", err);
  }
}

/* ================= EKUITAS: SECONDARY FIREBASE APP =================
   Dipakai khusus buat bikin akun Auth investor baru, biar admin yang
   lagi login di app utama nggak ke-logout otomatis.
======================================================================= */

const secondaryApp = firebase.initializeApp({
  apiKey: "AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain: "klien-39696.firebaseapp.com",
  projectId: "klien-39696",
}, "Secondary");

const secondaryAuth = secondaryApp.auth();

/* ================= EKUITAS: BOTTOM SHEET TAMBAH/EDIT ================= */

const eqSheetOverlay = document.getElementById("eqSheetOverlay");
let eqMode = "add";
let eqEditUid = null;

document.getElementById("eqAddBtn").addEventListener("click", () => {
  eqOpenSheet("add");
});

document.getElementById("eqCloseBtn").addEventListener("click", eqCloseSheet);
eqSheetOverlay.addEventListener("click", (e) => {
  if(e.target === eqSheetOverlay) eqCloseSheet();
});

["eqInvestasi", "eqPortofolio", "eqReturn"].forEach(id => {
  document.getElementById(id).addEventListener("input", (e) => {
    lpFormatInputField(e.target);
  });
});

function eqOpenSheet(mode, data){
  eqMode = mode;
  eqEditUid = mode === "edit" ? data.uid : null;

  document.getElementById("eqSheetTitle").innerText = mode === "add" ? "Tambah Investor" : "Edit Investor";
  document.getElementById("eqPasswordGroup").style.display = mode === "add" ? "block" : "none";
  document.getElementById("eqEmail").readOnly = mode === "edit";

  if(mode === "edit" && data){
    document.getElementById("eqNama").value = data.nama || "";
    document.getElementById("eqEmail").value = data.email || "";
    document.getElementById("eqPassword").value = "";
    document.getElementById("eqInvestasi").value = data.jumlahInvestasi ? Number(data.jumlahInvestasi).toLocaleString("id-ID") : "";
    document.getElementById("eqPortofolio").value = data.portofolio ? Number(data.portofolio).toLocaleString("id-ID") : "";
    document.getElementById("eqReturn").value = data.return ? Number(data.return).toLocaleString("id-ID") : "";
    document.getElementById("eqAsset").value = data.asset ? (Number(data.asset) / 10) : "";
    document.getElementById("eqBank").value = (data.noRek && data.noRek.bank) || "";
    document.getElementById("eqNorek").value = (data.noRek && data.noRek.nomor) || "";
  }else{
    ["eqNama", "eqEmail", "eqPassword", "eqInvestasi", "eqPortofolio", "eqReturn", "eqAsset", "eqBank", "eqNorek"]
      .forEach(id => { document.getElementById(id).value = ""; });
  }

  eqSheetOverlay.classList.add("active");
}

function eqCloseSheet(){
  eqSheetOverlay.classList.remove("active");
}

document.getElementById("eqSaveBtn").addEventListener("click", eqSaveInvestor);

async function eqSaveInvestor(){
  const nama = document.getElementById("eqNama").value.trim();
  const email = document.getElementById("eqEmail").value.trim();
  const password = document.getElementById("eqPassword").value;

  const jumlahInvestasi = lpGetRaw("eqInvestasi");
  const portofolio = lpGetRaw("eqPortofolio");
  const ret = lpGetRaw("eqReturn");
  const assetPersen = parseFloat(document.getElementById("eqAsset").value) || 0;
  const asset = Math.round(assetPersen * 10);

  const bank = document.getElementById("eqBank").value.trim();
  const nomor = document.getElementById("eqNorek").value.trim();

  if(!nama || !email){
    showPopup("Nama & email wajib diisi");
    return;
  }

  const dataInvestor = {
    nama,
    email,
    jumlahInvestasi,
    portofolio,
    return: ret,
    asset,
    noRek: { bank, nomor }
  };

  try{
    if(eqMode === "add"){
      if(!password || password.length < 6){
        showPopup("Password minimal 6 karakter");
        return;
      }

      const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;
      await secondaryAuth.signOut();

      await db.collection("investor").doc(uid).set({
        ...dataInvestor,
        uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showPopup("Akun investor berhasil dibuat");
    }else{
      await db.collection("investor").doc(eqEditUid).update(dataInvestor);
      showPopup("Data investor berhasil diperbarui");
    }

    eqCloseSheet();
    stLoadEkuitas();

  }catch(e){
    showPopup("Gagal simpan: " + e.message);
  }
}

/* ================= STATEMENT: FILTER PERIODE (CUSTOM PICKER) ================= */

let stmFilterBulan = "";
let stmFilterTahun = "";

let stmPendingBulan = "";
let stmPendingTahun = "";

function stmInitFilterDefault(){
  const now = new Date();
  stmFilterBulan = "";
  stmFilterTahun = now.getFullYear().toString();

  stmInitPickerTahun();
  stmUpdateFilterButtonText();
  stmOpenInputCard("add");
}

function stmInitPickerTahun(){
  const el = document.getElementById("stmPickerTahun");
  const now = new Date().getFullYear();

  el.innerHTML = `<div class="stm-picker-item" data-value="">Semua</div>`;

  for(let i = now; i >= 2020; i--){
    const item = document.createElement("div");
    item.className = "stm-picker-item";
    item.dataset.value = i.toString();
    item.innerText = i;
    el.appendChild(item);
  }
}

function stmUpdateFilterButtonText(){
  let label = "Semua Periode";
  if(stmFilterBulan && stmFilterTahun) label = `${stmFilterBulan} ${stmFilterTahun}`;
  else if(stmFilterBulan) label = stmFilterBulan;
  else if(stmFilterTahun) label = `Semua Bulan ${stmFilterTahun}`;

  document.getElementById("stmFilterText").innerText = label;
}

function stmSyncPickerUI(){
  stmPendingBulan = stmFilterBulan;
  stmPendingTahun = stmFilterTahun;

  document.querySelectorAll("#stmPickerBulan .stm-picker-item").forEach(el => {
    el.classList.toggle("active", el.dataset.value === stmPendingBulan);
  });
  document.querySelectorAll("#stmPickerTahun .stm-picker-item").forEach(el => {
    el.classList.toggle("active", el.dataset.value === stmPendingTahun);
  });
}

const stmFilterPopup = document.getElementById("stmFilterPopup");

document.getElementById("stmFilterBtn").addEventListener("click", () => {
  stmSyncPickerUI();
  stmFilterPopup.classList.add("active");
});

stmFilterPopup.addEventListener("click", (e) => {
  if(e.target === stmFilterPopup) stmFilterPopup.classList.remove("active");
});

document.getElementById("stmPickerBulan").addEventListener("click", (e) => {
  const item = e.target.closest(".stm-picker-item");
  if(!item) return;
  stmPendingBulan = item.dataset.value;
  document.querySelectorAll("#stmPickerBulan .stm-picker-item").forEach(el => {
    el.classList.toggle("active", el === item);
  });
});

document.getElementById("stmPickerTahun").addEventListener("click", (e) => {
  const item = e.target.closest(".stm-picker-item");
  if(!item) return;
  stmPendingTahun = item.dataset.value;
  document.querySelectorAll("#stmPickerTahun .stm-picker-item").forEach(el => {
    el.classList.toggle("active", el === item);
  });
});

document.getElementById("stmFilterApplyBtn").addEventListener("click", () => {
  stmFilterBulan = stmPendingBulan;
  stmFilterTahun = stmPendingTahun;

  stmUpdateFilterButtonText();
  stmFilterPopup.classList.remove("active");
  stmLoadList();
});

document.getElementById("stmFilterResetBtn").addEventListener("click", () => {
  const now = new Date();
  stmFilterBulan = "";
  stmFilterTahun = now.getFullYear().toString();

  stmSyncPickerUI();
  stmUpdateFilterButtonText();
  stmFilterPopup.classList.remove("active");
  stmLoadList();
});

/* ================= STATEMENT: LIST & CARD ================= */

function stmShow(val){
  return val && val !== 0;
}

async function stmLoadList(){
  const wrap = document.getElementById("stList");

  try{
    const snap = await db.collection("statement").orderBy("createdAt", "desc").get();

    if(snap.empty){
      wrap.innerHTML = `
        <div class="st-empty">
          <i class="fa-solid fa-file-invoice"></i>
          <p>Belum ada statement</p>
          <span>Klik "Input Statement" buat bikin rekap periode ini</span>
        </div>
      `;
      return;
    }

    wrap.innerHTML = "";
    let matched = 0;

    snap.forEach(doc => {
      const d = doc.data();
      const periode = d.periode || {};
      const bulan = periode.bulan || "-";
      const tahun = periode.tahun || "-";

      if(stmFilterBulan && bulan !== stmFilterBulan) return;
      if(stmFilterTahun && tahun !== stmFilterTahun) return;

      wrap.appendChild(stmRenderCard(doc));
      matched++;
    });

    if(matched === 0){
      wrap.innerHTML = `
        <div class="st-empty">
          <i class="fa-solid fa-filter-circle-xmark"></i>
          <p>Nggak ada data</p>
          <span>Coba ganti periode filter-nya</span>
        </div>
      `;
    }

  }catch(err){
    wrap.innerHTML = `<p class="st-small">Gagal ambil statement: ${err.message}</p>`;
    console.error("Gagal ambil statement:", err);
  }
}

function stmRenderCard(doc){
  const d = doc.data();
  const docId = doc.id;

  const periode = d.periode || {};
  const bulan = periode.bulan || "-";
  const tahun = periode.tahun || "-";

  const exp = d.Expenditure || {};
  const lain = d.lain || {};

  const gas = exp.gas || 0;
  const tutup = exp.tutup || 0;
  const lainnyaVal = exp.lainnya || 0;
  const spend = lain.spend || 0;

  const upahKoki = d.upahKoki || 0;
  const kas = d.kas || 0;
  const reinvestasi = d.reinvestasi || 0;

  const totalExpenses = gas + tutup + lainnyaVal + spend + upahKoki + kas + reinvestasi;

  const adminData = window.currentAdminData || {};
  const marginBase = Number(adminData.marginKlien) || 0;
  const omset = (d.penjualan || 0) * marginBase;
  const profit = omset - totalExpenses;

  const div = document.createElement("div");
  div.className = "stm-card";

  div.innerHTML = `
    <div class="stm-bulan">${(bulan + " " + tahun).toUpperCase()}</div>

    <div class="stm-section-title">INCOME</div>
    ${stmShow(d.penjualan) ? `<div class="stm-row"><span>Sales / Penjualan</span><b>${d.penjualan}</b></div>` : ""}
    ${stmShow(omset) ? `<div class="stm-row"><span>Omset</span><b>${rupiah(omset)}</b></div>` : ""}

    <div class="stm-divider"></div>

    <div class="stm-section-title">EXPENSES</div>
    ${stmShow(gas) ? `<div class="stm-row sub"><span>Gas</span><span>${rupiah(gas)}</span></div>` : ""}
    ${stmShow(tutup) ? `<div class="stm-row sub"><span>Tutup</span><span>${rupiah(tutup)}</span></div>` : ""}
    ${stmShow(lainnyaVal) ? `<div class="stm-row sub"><span>Lainnya</span><span>${rupiah(lainnyaVal)}</span></div>` : ""}
    ${stmShow(upahKoki) ? `<div class="stm-row sub"><span>Gaji Koki</span><span>${rupiah(upahKoki)}</span></div>` : ""}
    ${stmShow(spend) ? `<div class="stm-row sub"><span>${lain.keterangan || "Lain-lain"}</span><span>${rupiah(spend)}</span></div>` : ""}
    ${stmShow(kas) ? `<div class="stm-row sub"><span>Kas</span><span>${rupiah(kas)}</span></div>` : ""}
    ${stmShow(reinvestasi) ? `<div class="stm-row sub"><span>Reinvestasi</span><span>${rupiah(reinvestasi)}</span></div>` : ""}

    <div class="stm-divider"></div>

    <div class="stm-row total"><span>Total Expenses</span><b>${rupiah(totalExpenses)}</b></div>

    <div class="stm-divider"></div>

    <div class="stm-row">
      <span class="stm-total-label">Profit / Loss</span>
      <b class="stm-profit ${profit >= 0 ? "plus" : "minus"}">${rupiah(profit)}</b>
    </div>

    <div class="stm-actions">
      <button class="stm-btn-edit" type="button"><i class="fa-solid fa-pen"></i> Edit</button>
      <button class="stm-btn-delete" type="button"><i class="fa-solid fa-trash"></i> Hapus</button>
    </div>
  `;

  div.querySelector(".stm-btn-edit").addEventListener("click", () => stmOpenInputCard("edit", docId, d));
  div.querySelector(".stm-btn-delete").addEventListener("click", () => stmOpenDeleteConfirm(docId));

  return div;
}

let stmMode = "add";
let stmEditDocId = null;

const stmInputCard = document.getElementById("stmInputCard");
const stmInputBulan = document.getElementById("stmInputBulan");
const stmInputTahun = document.getElementById("stmInputTahun");
const stmPreview = document.getElementById("stmPreview");

// tombol X di card sekarang fungsinya "batal edit / balik ke mode tambah baru"
document.getElementById("stmInputCloseBtn").addEventListener("click", () => {
  stmOpenInputCard("add");
});

["stmKas", "stmReinvestasi"].forEach(id => {
  document.getElementById(id).addEventListener("input", (e) => {
    lpFormatInputField(e.target);
  });
});

stmInputBulan.addEventListener("change", stmRefreshPreview);
stmInputTahun.addEventListener("input", stmRefreshPreview);

function stmOpenInputCard(mode, docId, data){
  stmMode = mode;
  stmEditDocId = mode === "edit" ? docId : null;

  document.getElementById("stmInputTitle").innerText = mode === "add" ? "Input Statement" : "Edit Statement";

  if(mode === "edit" && data){
    const periode = data.periode || {};
    stmInputBulan.value = periode.bulan || "";
    stmInputTahun.value = periode.tahun || "";
    stmInputBulan.disabled = true;
    stmInputTahun.disabled = true;

    document.getElementById("stmKas").value = data.kas ? Number(data.kas).toLocaleString("id-ID") : "";
    document.getElementById("stmReinvestasi").value = data.reinvestasi ? Number(data.reinvestasi).toLocaleString("id-ID") : "";

    stmInputCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }else{
    const now = new Date();

    stmInputBulan.disabled = false;
    stmInputTahun.disabled = false;
    stmInputBulan.value = now.toLocaleString("id-ID", { month: "long" });
    stmInputTahun.value = now.getFullYear();
    document.getElementById("stmKas").value = "";
    document.getElementById("stmReinvestasi").value = "";
  }

  stmRefreshPreview();
}

/* ================= HITUNG DATA OTOMATIS DARI inputAdmin ================= */

async function stmHitungPeriode(bulanNama, tahun){
  const user = window.currentUser;
  if(!user) return null;

  const snap = await db.collection("inputAdmin")
    .where("adminUID", "==", user.uid)
    .get();

  let totalKlien = 0;
  let gas = 0;
  let tutup = 0;
  let lainnya = 0;

  snap.forEach(doc => {
    const d = doc.data();
    if(!d.tanggal) return;

    const t = new Date(d.tanggal);
    const b = t.toLocaleString("id-ID", { month: "long" });
    const th = t.getFullYear().toString();
    if(b !== bulanNama || th !== tahun) return;

    totalKlien += d.klien || 0;

    const p = d.pengeluaran || {};
    gas += p.gas || 0;
    tutup += p.tutup || 0;

    // "lainnya" itu array {keterangan, harga} dari laporan harian, dijumlah otomatis
    if(Array.isArray(p.lainnya)){
      p.lainnya.forEach(item => { lainnya += Number(item.harga) || 0; });
    }
  });

  const adminData = window.currentAdminData || {};
  const marginBase = Number(adminData.marginKlien) || 0;
  const gajiKokiRate = Number(adminData.gajiKoki) || 0;

  const margin = totalKlien * marginBase;
  const upahKoki = totalKlien * gajiKokiRate;

  return { totalKlien, gas, tutup, lainnya, margin, upahKoki, marginBase };
}

async function stmRefreshPreview(){
  const bulanNama = stmInputBulan.value;
  const tahun = stmInputTahun.value;

  if(!bulanNama || !tahun){
    stmPreview.innerHTML = `<p class="st-small">Pilih bulan & tahun buat lihat data</p>`;
    return;
  }

  stmPreview.innerHTML = `<p class="st-small">Menghitung...</p>`;

  const hasil = await stmHitungPeriode(bulanNama, tahun);
  if(!hasil) return;

  if(!hasil.marginBase){
    stmPreview.innerHTML = `<p class="st-small">Data pengaturan (marginKlien) admin belum lengkap. Hubungi pusat dulu.</p>`;
    return;
  }

  stmPreview.innerHTML = `
    <div class="stm-row"><span>Total Klien</span><b>${hasil.totalKlien}</b></div>
    <div class="stm-row"><span>Gas</span><b>${rupiah(hasil.gas)}</b></div>
    <div class="stm-row"><span>Tutup</span><b>${rupiah(hasil.tutup)}</b></div>
    <div class="stm-row"><span>Lainnya</span><b>${rupiah(hasil.lainnya)}</b></div>
    <div class="stm-row"><span>Gaji Koki</span><b>${rupiah(hasil.upahKoki)}</b></div>
    <div class="stm-row"><span>Omset (Margin)</span><b>${rupiah(hasil.margin)}</b></div>
  `;
}

/* ================= SIMPAN ================= */

document.getElementById("stmSaveBtn").addEventListener("click", stmSaveStatement);

async function stmSaveStatement(){
  const bulanNama = stmInputBulan.value;
  const tahun = stmInputTahun.value;

  if(!bulanNama || !tahun){
    showPopup("Pilih bulan & tahun dulu!");
    return;
  }

  const kas = lpGetRaw("stmKas");
  const reinvestasi = lpGetRaw("stmReinvestasi");

  const btn = document.getElementById("stmSaveBtn");
  btn.disabled = true;

  try{
    const hasil = await stmHitungPeriode(bulanNama, tahun);

    if(!hasil || !hasil.marginBase){
      showPopup("Data pengaturan (marginKlien) admin belum lengkap. Hubungi pusat dulu.");
      return;
    }

    const dataFinal = {
      penjualan: hasil.totalKlien,
      margin: hasil.margin,
      kas,
      reinvestasi,
      upahKoki: hasil.upahKoki,
      lain: { keterangan: "", spend: 0 },
      Expenditure: { gas: hasil.gas, tutup: hasil.tutup, lainnya: hasil.lainnya },
      periode: { bulan: bulanNama, tahun },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if(stmMode === "edit" && stmEditDocId){
      await db.collection("statement").doc(stmEditDocId).update(dataFinal);
    }else{
      const existSnap = await db.collection("statement")
        .where("periode.bulan", "==", bulanNama)
        .where("periode.tahun", "==", tahun)
        .get();

      if(!existSnap.empty){
        await db.collection("statement").doc(existSnap.docs[0].id).update(dataFinal);
      }else{
        await db.collection("statement").add(dataFinal);
      }
    }

    showPopup("Statement berhasil disimpan");
    stmCloseInputCard();
    stmLoadList();

  }catch(e){
    showPopup("Gagal simpan: " + e.message);
  }finally{
    btn.disabled = false;
  }
}

/* ================= STATEMENT: HAPUS ================= */

let stmDeleteDocId = null;
const stmDeleteConfirmModal = document.getElementById("stmDeleteConfirmModal");

function stmOpenDeleteConfirm(docId){
  stmDeleteDocId = docId;
  stmDeleteConfirmModal.classList.add("active");
}

document.getElementById("stmDeleteCancelBtn").addEventListener("click", () => {
  stmDeleteConfirmModal.classList.remove("active");
  stmDeleteDocId = null;
});

document.getElementById("stmDeleteOkBtn").addEventListener("click", async () => {
  if(!stmDeleteDocId) return;

  try{
    await db.collection("statement").doc(stmDeleteDocId).delete();
    showPopup("Statement berhasil dihapus");
  }catch(e){
    showPopup("Gagal hapus: " + e.message);
  }

  stmDeleteConfirmModal.classList.remove("active");
  stmDeleteDocId = null;
  stmLoadList();
});

/* ================= TAB ROI =================
   List investor -> klik -> detail investor (input return + riwayat).
   return & portofolio di root investor dihitung ULANG OTOMATIS
   setiap kali ada tambah/edit/hapus di subcollection ROI.
======================================================================= */

let roiActiveInvestor = null;

/* ---------- LIST INVESTOR ---------- */

async function roiLoadInvestorList(){
  const listEl = document.getElementById("roiInvestorList");
  listEl.innerHTML = `<p class="st-small">Memuat...</p>`;

  try{
    const snap = await db.collection("investor").get();

    if(snap.empty){
      listEl.innerHTML = `<p class="st-small">Belum ada data investor</p>`;
      return;
    }

    let arr = [];
    snap.forEach(doc => arr.push({ uid: doc.id, ...doc.data() }));
    arr.sort((a, b) => (Number(b.jumlahInvestasi) || 0) - (Number(a.jumlahInvestasi) || 0));

    listEl.innerHTML = "";

    arr.forEach(d => {
      const div = document.createElement("div");
      div.className = "st-eq-item";
      div.onclick = () => roiOpenDetail(d);

      div.innerHTML = `
        <div class="st-eq-head">
          <div class="st-eq-avatar"><i class="fa-solid fa-user"></i></div>
          <div>
            <div class="st-eq-name">${d.nama || "-"}</div>
            <div class="st-eq-email">${d.email || "-"}</div>
          </div>
          <i class="fa-solid fa-chevron-right" style="color:var(--muted);margin-left:auto;"></i>
        </div>
        <hr>
        <div class="st-eq-row"><span>Investasi</span><b>${rupiah(Number(d.jumlahInvestasi) || 0)}</b></div>
        <div class="st-eq-row"><span>Return</span><b class="st-eq-return">${rupiah(Number(d.return) || 0)}</b></div>
        <div class="st-eq-row"><span>Portofolio</span><b>${rupiah(Number(d.portofolio) || 0)}</b></div>
      `;

      listEl.appendChild(div);
    });

  }catch(err){
    listEl.innerHTML = `<p class="st-small">Gagal ambil data investor: ${err.message}</p>`;
    console.error("Gagal ambil daftar investor (ROI):", err);
  }
}

/* ---------- DETAIL INVESTOR ---------- */

function roiOpenDetail(investor){
  roiActiveInvestor = investor;

  document.getElementById("roiListPage").style.display = "none";
  document.getElementById("roiDetailPage").style.display = "block";

  roiRenderSummary();
  roiResetInputForm();
  roiLoadHistory(investor.uid);
}

document.getElementById("roiBackBtn").addEventListener("click", () => {
  document.getElementById("roiDetailPage").style.display = "none";
  document.getElementById("roiListPage").style.display = "block";
  roiActiveInvestor = null;
  roiLoadInvestorList();
});

function roiRenderSummary(){
  const d = roiActiveInvestor;
  if(!d) return;

  document.getElementById("roiInvestorSummary").innerHTML = `
    <div class="st-eq-head">
      <div class="st-eq-avatar"><i class="fa-solid fa-user"></i></div>
      <div>
        <div class="st-eq-name">${d.nama || "-"}</div>
        <div class="st-eq-email">${d.email || "-"}</div>
      </div>
    </div>
    <hr>
    <div class="st-eq-row"><span>Investasi Awal</span><b>${rupiah(Number(d.jumlahInvestasi) || 0)}</b></div>
    <div class="st-eq-row"><span>Total Return</span><b class="st-eq-return">${rupiah(Number(d.return) || 0)}</b></div>
    <div class="st-eq-row"><span>Portofolio</span><b>${rupiah(Number(d.portofolio) || 0)}</b></div>
  `;
}

/* ---------- CARD INPUT RETURN ---------- */

const roiTanggalInput = document.getElementById("roiTanggal");
const roiDateBox = document.getElementById("roiDateBox");

roiTanggalInput.addEventListener("change", () => {
  roiDateBox.classList.toggle("filled", !!roiTanggalInput.value);
});

document.getElementById("roiReturn").addEventListener("input", (e) => {
  lpFormatInputField(e.target);
});

document.getElementById("roiInputResetBtn").addEventListener("click", roiResetInputForm);

function roiResetInputForm(){
  roiTanggalInput.value = "";
  document.getElementById("roiReturn").value = "";
  roiDateBox.classList.remove("filled");
  document.getElementById("roiInputTitle").innerText = "Input Return";
}

document.getElementById("roiSaveBtn").addEventListener("click", roiSaveReturn);

async function roiSaveReturn(){
  const tanggal = roiTanggalInput.value; // format YYYY-MM-DD, langsung dipakai jadi docId

  if(!tanggal){
    showPopup("Pilih tanggal dulu!");
    return;
  }
  if(!roiActiveInvestor){
    showPopup("Investor tidak ditemukan");
    return;
  }

  const nominal = lpGetRaw("roiReturn");
  const uid = roiActiveInvestor.uid;
  const asset = roiActiveInvestor.jumlahInvestasi || 0;

  const btn = document.getElementById("roiSaveBtn");
  btn.disabled = true;

  try{
    await db.collection("investor").doc(uid).collection("ROI").doc(tanggal).set({
      return: nominal,
      asset: String(asset),
      uid
    });

    const totals = await roiRecalcTotals(uid);
    roiActiveInvestor.return = totals.total;
    roiActiveInvestor.portofolio = totals.portofolio;

    showPopup("Return berhasil disimpan");
    roiResetInputForm();
    roiRenderSummary();
    roiLoadHistory(uid);

  }catch(e){
    showPopup("Gagal simpan: " + e.message);
  }finally{
    btn.disabled = false;
  }
}

/* ---------- HITUNG ULANG return & portofolio DI ROOT investor ---------- */

async function roiRecalcTotals(uid){
  const snap = await db.collection("investor").doc(uid).collection("ROI").get();

  let total = 0;
  snap.forEach(doc => {
    const d = doc.data();
    total += Number(d.return) || 0;
  });

  const investorDoc = await db.collection("investor").doc(uid).get();
  const jumlahInvestasi = Number(investorDoc.data().jumlahInvestasi) || 0;
  const portofolio = jumlahInvestasi + total;

  await db.collection("investor").doc(uid).update({
    return: total,
    portofolio: portofolio
  });

  return { total, portofolio, jumlahInvestasi };
}

/* ---------- RIWAYAT RETURN (EDIT & HAPUS) ---------- */

async function roiLoadHistory(uid){
  const listEl = document.getElementById("roiHistoryList");
  listEl.innerHTML = `<p class="st-small">Memuat...</p>`;

  try{
    const snap = await db.collection("investor").doc(uid).collection("ROI").get();

    if(snap.empty){
      listEl.innerHTML = `<p class="st-small">Belum ada riwayat return</p>`;
      return;
    }

    let items = [];
    snap.forEach(doc => items.push(doc));

    // sortir manual (docId formatnya YYYY-MM-DD, jadi sortir string = sortir tanggal)
    items.sort((a, b) => b.id.localeCompare(a.id));

    listEl.innerHTML = "";

    items.forEach(doc => {
      const d = doc.data();
      const docId = doc.id;

      const div = document.createElement("div");
      div.className = "lp-item";
      div.innerHTML = `
        <div class="lp-line bold"><span>📅 ${docId}</span></div>
        <hr>
        <div class="lp-line"><span>Return</span><b>${rupiah(Number(d.return) || 0)}</b></div>
        <div class="stm-actions">
          <button class="stm-btn-edit" type="button"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="stm-btn-delete" type="button"><i class="fa-solid fa-trash"></i> Hapus</button>
        </div>
      `;

      div.querySelector(".stm-btn-edit").addEventListener("click", () => {
        roiTanggalInput.value = docId;
        roiDateBox.classList.add("filled");
        document.getElementById("roiReturn").value = Number(d.return || 0).toLocaleString("id-ID");
        document.getElementById("roiInputTitle").innerText = "Edit Return " + docId;
        document.getElementById("roiInputCard").scrollIntoView({ behavior: "smooth", block: "start" });
      });

      div.querySelector(".stm-btn-delete").addEventListener("click", () => roiOpenDeleteConfirm(docId));

      listEl.appendChild(div);
    });

  }catch(err){
    listEl.innerHTML = `<p class="st-small">Gagal ambil riwayat: ${err.message}</p>`;
    console.error("Gagal ambil riwayat ROI:", err);
  }
}

let roiDeleteDocId = null;
const roiDeleteConfirmModal = document.getElementById("roiDeleteConfirmModal");

function roiOpenDeleteConfirm(docId){
  roiDeleteDocId = docId;
  roiDeleteConfirmModal.classList.add("active");
}

document.getElementById("roiDeleteCancelBtn").addEventListener("click", () => {
  roiDeleteConfirmModal.classList.remove("active");
  roiDeleteDocId = null;
});

document.getElementById("roiDeleteOkBtn").addEventListener("click", async () => {
  roiDeleteConfirmModal.classList.remove("active");

  if(!roiDeleteDocId || !roiActiveInvestor) return;
  const uid = roiActiveInvestor.uid;

  try{
    await db.collection("investor").doc(uid).collection("ROI").doc(roiDeleteDocId).delete();

    const totals = await roiRecalcTotals(uid);
    roiActiveInvestor.return = totals.total;
    roiActiveInvestor.portofolio = totals.portofolio;

    showPopup("Return berhasil dihapus");
    roiRenderSummary();
    roiLoadHistory(uid);

  }catch(e){
    showPopup("Gagal hapus: " + e.message);
    console.error("Gagal hapus ROI:", e);
  }

  roiDeleteDocId = null;
});
