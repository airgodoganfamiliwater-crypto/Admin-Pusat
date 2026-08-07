/* ================= LAPORAN (port dari analis.js) =================
   Tab Klien & Sales ambil data dari collection "inputAdmin" milik
   admin yang login (adminUID == uid), difilter per bulan/tahun.
   Tab Data masih placeholder.
====================================================================== */

const lpListKlien = document.getElementById("lpListKlien");
const lpSummaryKlien = document.getElementById("lpSummaryKlien");
const lpListSales = document.getElementById("lpListSales");
const lpSummarySales = document.getElementById("lpSummarySales");

let lpSelectedMonth;
let lpSelectedYear;
let lpSelectedDocId = null;
let lpInited = false;

/* ================= UTIL ================= */

function lpToNumber(val){
  if(val === null || val === undefined || val === "") return null;
  return Number(val);
}

// support minus & desimal
function lpParseInputNumber(val){
  if(!val) return 0;
  return Number(
    val.replace(/\./g, "").replace(",", ".")
  ) || 0;
}

function lpFormatTanggal(str){
  if(!str) return "-";
  const d = new Date(str);
  return d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function lpRenderExpDetail(p){
  const gas = lpToNumber(p.gas) || 0;
  const tutup = lpToNumber(p.tutup) || 0;
  const bensin = lpToNumber(p.bensin) || 0;
  const listrik = lpToNumber(p.listrik) || 0;
  const lainnya = Array.isArray(p.lainnya) ? p.lainnya : [];

  let rows = `
    <div class="lp-exp-sub-row"><span><i class="fa-solid fa-fire"></i> Gas</span><b>${rupiah(gas)}</b></div>
    <div class="lp-exp-sub-row"><span><i class="fa-solid fa-box"></i> Tutup</span><b>${rupiah(tutup)}</b></div>
    <div class="lp-exp-sub-row"><span><i class="fa-solid fa-gas-pump"></i> Bensin</span><b>${rupiah(bensin)}</b></div>
    <div class="lp-exp-sub-row"><span><i class="fa-solid fa-bolt"></i> Listrik</span><b>${rupiah(listrik)}</b></div>
  `;

  lainnya.forEach(item => {
    const ket = item.keterangan || "Lainnya";
    const harga = lpToNumber(item.harga) || 0;
    rows += `<div class="lp-exp-sub-row"><span><i class="fa-solid fa-ellipsis"></i> ${ket}</span><b>${rupiah(harga)}</b></div>`;
  });

  return `<div class="lp-exp-sub-list">${rows}</div>`;
}

function lpHitungQty(nominal, pembagi){
  if(!nominal || nominal <= 0) return 0;
  return Math.floor(nominal / pembagi) || 1;
}

/* ================= INIT & TAB ================= */

async function loadLaporanData(){
  const user = window.currentUser;
  if(!user) return;

  if(!lpInited){
    const now = new Date();
    lpSelectedMonth = now.getMonth();
    lpSelectedYear = now.getFullYear();

    lpInitTahun();
    lpSetDefaultFilterUI();
    lpUpdateFilterButton();
    lpInited = true;
  }

  const activeTab = document.querySelector(".lp-tab.active").dataset.tab;

  if(activeTab === "klien") lpLoadDataKlien(user.uid);
  else if(activeTab === "sales") lpLoadDataSales(user.uid);
  else if(activeTab === "data") lpLoadDataGabungan(user.uid);
}

document.querySelectorAll(".lp-tab").forEach(tab => {
  tab.addEventListener("click", () => lpSwitchTab(tab.dataset.tab));
});

function lpSwitchTab(tab){
  document.querySelectorAll(".lp-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".lp-tab-content").forEach(c => c.classList.remove("active"));

  document.querySelector(`.lp-tab[data-tab="${tab}"]`).classList.add("active");
  document.getElementById("lp-tab-" + tab).classList.add("active");

  const user = window.currentUser;
  if(!user) return;

  if(tab === "klien") lpLoadDataKlien(user.uid);
  else if(tab === "sales") lpLoadDataSales(user.uid);
  else if(tab === "data") lpLoadDataGabungan(user.uid);
}

document.getElementById("lpAddBtn").addEventListener("click", () => {
  lpOpenInputSheet();
});

/* ================= FILTER ================= */

function lpUpdateFilterButton(){
  const bulanText = document.getElementById("lpFilterBulan").options[lpSelectedMonth].text;
  document.getElementById("lpFilterText").innerText = `${bulanText} ${lpSelectedYear}`;
}

function lpInitTahun(){
  const el = document.getElementById("lpFilterTahun");
  const now = new Date().getFullYear();

  for(let i = now; i >= 2020; i--){
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    el.appendChild(opt);
  }
}

function lpSetDefaultFilterUI(){
  document.getElementById("lpFilterBulan").value = lpSelectedMonth;
  document.getElementById("lpFilterTahun").value = lpSelectedYear;
}

const lpFilterPopup = document.getElementById("lpFilterPopup");

document.getElementById("lpFilterBtn").addEventListener("click", () => {
  lpFilterPopup.classList.add("active");
});
document.getElementById("lpFilterCancelBtn").addEventListener("click", () => {
  lpFilterPopup.classList.remove("active");
});
document.getElementById("lpFilterApplyBtn").addEventListener("click", () => {
  lpSelectedMonth = Number(document.getElementById("lpFilterBulan").value);
  lpSelectedYear = Number(document.getElementById("lpFilterTahun").value);

  lpUpdateFilterButton();
  lpFilterPopup.classList.remove("active");

  const user = window.currentUser;
  if(!user) return;

  const activeTab = document.querySelector(".lp-tab.active").dataset.tab;
  if(activeTab === "klien") lpLoadDataKlien(user.uid);
  else if(activeTab === "sales") lpLoadDataSales(user.uid);
});

/* ================= LOAD KLIEN ================= */

async function lpLoadDataKlien(uid){
  const snap = await db.collection("inputAdmin")
    .where("adminUID", "==", uid)
    .get();

  if(snap.empty){
    lpListKlien.innerHTML = "<p class='lp-small'>Belum ada data</p>";
    lpSummaryKlien.innerHTML = "";
    return;
  }

  let arr = [];
  snap.forEach(d => {
    const data = d.data();
    if(data.tanggal){
      const t = new Date(data.tanggal);
      if(t.getMonth() === lpSelectedMonth && t.getFullYear() === lpSelectedYear){
        arr.push(data);
      }
    }
  });

  if(arr.length === 0){
    lpListKlien.innerHTML = "<p class='lp-small'>Belum ada data bulan ini</p>";
    lpSummaryKlien.innerHTML = "";
    return;
  }

  arr.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));

  lpListKlien.innerHTML = "";

  let totalMargin = 0;
  let totalKlien = 0;
  let totalPembayaran = 0;
  let totalPengeluaranAll = 0;

  arr.forEach(d => {
    const p = d.pengeluaran || {};

    const totalPengeluaran = lpToNumber(p.totalPengeluaran);
    const marginKlien = lpToNumber(d.marginKlien);
    const omset = lpToNumber(d.pembagianKlien);
    const klien = lpToNumber(d.klien);
    const pembayaran = lpToNumber(d.pembayaranKlien);

    totalMargin += marginKlien;
    totalKlien += klien;
    totalPembayaran += pembayaran;
    totalPengeluaranAll += totalPengeluaran;

    const validasi = lpToNumber(d.validasi);
    const docId = d.adminUID + "_" + d.tanggal;
    const isMismatch = omset !== validasi;

    const div = document.createElement("div");
    div.className = "lp-item";
    div.setAttribute("data-id", docId);
    div.setAttribute("data-omset", omset);
    div.setAttribute("data-validasi", validasi ?? "");

    div.innerHTML = `
      <div class="lp-item-check"></div>
      <div class="lp-line bold">
        <span>📅 ${lpFormatTanggal(d.tanggal)}</span>
        ${isMismatch ? `<span class="lp-badge-error">Selisih</span>` : ""}
      </div>
      <hr>
      <div class="lp-line"><span>Closing Klien</span><b>${klien || 0}</b></div>
      <div class="lp-line"><span>Pembayaran</span><b>${rupiah(pembayaran)}</b></div>

      <div class="lp-exp-block">
        <div class="lp-line"><span>Pengeluaran</span><b>${rupiah(totalPengeluaran)}</b></div>
        ${lpRenderExpDetail(p)}
      </div>

      <div class="lp-line"><span>Margin</span><b>${rupiah(marginKlien)}</b></div>
      <div class="lp-line"><span>Validasi</span><b class="lp-validasi-value">${rupiah(validasi)}</b></div>
      <div class="lp-profit ${omset >= 0 ? "plus" : "minus"}">Omset: ${rupiah(omset)}</div>
    `;

    lpBindLongPress(div, docId);
    lpListKlien.appendChild(div);
  });

  const adminData = window.currentAdminData || {};
  const marginBase = Number(adminData.marginKlien) || 0;
  const gajiKokiRate = Number(adminData.gajiKoki) || 0;
  const totalOmset = totalKlien * marginBase;
  const totalUpahKoki = totalKlien * gajiKokiRate;

  lpSummaryKlien.innerHTML = `
    <div class="lp-summary-box">
      <div class="lp-sum-row"><span>Closing Klien</span><b>${totalKlien}</b></div>
      <div class="lp-sum-row"><span>Pembayaran</span><b>${rupiah(totalPembayaran)}</b></div>
      <div class="lp-sum-row"><span>Pengeluaran</span><b>${rupiah(totalPengeluaranAll)}</b></div>
      <div class="lp-sum-row"><span>Upah Koki</span><b>${rupiah(totalUpahKoki)}</b></div>
      <div class="lp-sum-row"><span>Margin</span><b>${rupiah(totalMargin)}</b></div>
      <div class="lp-divider"></div>
      <div class="lp-sum-row highlight"><span>Total Omset</span><b>${rupiah(totalOmset)}</b></div>
      <div class="lp-small" style="padding:8px 0 0;">Periode ${lpSelectedMonth + 1}/${lpSelectedYear}</div>
    </div>
  `;
}

/* ================= VALIDASI ================= */

const lpValidasiPopup = document.getElementById("lpValidasiPopup");
const lpInputValidasi = document.getElementById("lpInputValidasi");

function lpOpenValidasi(docId){
  lpSelectedDocId = docId;

  const div = document.querySelector(`.lp-item[data-id="${docId}"]`);
  if(!div) return;

  let val = div.getAttribute("data-validasi");

  if(val === "" || val === null){
    lpInputValidasi.value = "";
  }else{
    lpInputValidasi.value = Number(val).toLocaleString("id-ID");
  }

  lpInputValidasi.readOnly = false;
  lpValidasiPopup.classList.add("active");
}

document.getElementById("lpValidasiCancelBtn").addEventListener("click", () => {
  lpValidasiPopup.classList.remove("active");
});

lpInputValidasi.addEventListener("input", e => {
  let v = e.target.value;
  const isNegative = v.startsWith("-");
  v = v.replace(/[^\d,]/g, "");

  let parts = v.split(",");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  e.target.value = (isNegative ? "-" : "") + parts.join(",");
});

document.getElementById("lpValidasiSaveBtn").addEventListener("click", lpSimpanValidasi);

async function lpSimpanValidasi(){
  const raw = lpInputValidasi.value;
  const angka = raw === "" ? null : lpParseInputNumber(raw);

  if(!lpSelectedDocId){
    showPopup("Data tidak ditemukan");
    return;
  }

  try{
    const docRef = db.collection("inputAdmin").doc(lpSelectedDocId);
    const snap = await docRef.get();

    if(!snap.exists){
      showPopup("Data tidak ditemukan");
      return;
    }

    const data = snap.data();
    const p = data.pengeluaran || {};
    const tanggal = data.tanggal || null;

    const gas = lpToNumber(p.gas) || 0;
    const tutup = lpToNumber(p.tutup) || 0;
    const bensin = lpToNumber(p.bensin) || 0;
    const listrik = lpToNumber(p.listrik) || 0;
    const lainnya = lpToNumber(p.lainnya) || 0;
    const keterangan = p.keterangan || "";
    const totalPengeluaran = lpToNumber(p.totalPengeluaran) || 0;

    const gasQty = lpHitungQty(gas, 20000);
    const tutupQty = lpHitungQty(tutup, 120000);
    const bensinQty = lpHitungQty(bensin, 15000);

    await docRef.set({
      validasi: angka,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection("pengeluaran").doc(lpSelectedDocId).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      tanggal: tanggal,
      gas: { qty: gasQty, cost: gas },
      tutup: { qty: tutupQty, cost: tutup },
      bensin: { qty: bensinQty, cost: bensin },
      listrik: listrik,
      lainnya: { keterangan: keterangan, cost: lainnya },
      totalPengeluaran: totalPengeluaran
    }, { merge: true });

    lpUpdateValidasiUI(lpSelectedDocId, angka);

    lpInputValidasi.value = angka === null ? "" : Number(angka).toLocaleString("id-ID");
    lpInputValidasi.readOnly = true;

    setTimeout(() => {
      lpValidasiPopup.classList.remove("active");
      lpInputValidasi.readOnly = false;
    }, 800);

  }catch(e){
    showPopup("Gagal simpan: " + e.message);
  }
}

function lpUpdateValidasiUI(docId, angka){
  const div = document.querySelector(`.lp-item[data-id="${docId}"]`);
  if(!div) return;

  div.setAttribute("data-validasi", angka ?? "");

  const validasiEl = div.querySelector(".lp-validasi-value");
  if(validasiEl){
    validasiEl.innerText = angka === null ? "-" : rupiah(angka);
  }

  const omset = Number(div.getAttribute("data-omset")) || 0;
  let badge = div.querySelector(".lp-badge-error");
  const isMismatch = angka === null || omset !== angka;

  if(isMismatch){
    if(!badge){
      badge = document.createElement("span");
      badge.className = "lp-badge-error";
      badge.innerText = "Selisih";
      div.querySelector(".lp-line.bold").appendChild(badge);
    }
  }else{
    if(badge) badge.remove();
  }
}

/* ================= SALES ================= */

async function lpLoadDataSales(uid){
  const snap = await db.collection("inputAdmin")
    .where("adminUID", "==", uid)
    .get();

  if(snap.empty){
    lpListSales.innerHTML = "<p class='lp-small'>Belum ada data</p>";
    lpSummarySales.innerHTML = "";
    return;
  }

  let arr = [];
  snap.forEach(d => {
    const data = d.data();
    if(data.tanggal){
      const t = new Date(data.tanggal);
      if(t.getMonth() === lpSelectedMonth && t.getFullYear() === lpSelectedYear){
        arr.push(data);
      }
    }
  });

  if(arr.length === 0){
    lpListSales.innerHTML = "<p class='lp-small'>Belum ada data bulan ini</p>";
    lpSummarySales.innerHTML = "";
    return;
  }

  arr.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));

  lpListSales.innerHTML = "";
  let totalClosing = 0;
  let totalPembayaran = 0;

  arr.forEach(d => {
    const sales = lpToNumber(d.sales) || 0;
    const pembayaran = lpToNumber(d.pembayaranSales);
    const tagihan = sales * 5000;
    const keterangan = pembayaran - tagihan;

    totalClosing += sales;
    totalPembayaran += pembayaran;

    const div = document.createElement("div");
    div.className = "lp-item";
    div.innerHTML = `
      <div class="lp-line bold"><span>📅 ${lpFormatTanggal(d.tanggal)}</span></div>
      <hr>
      <div class="lp-line"><span>Sales</span><b>${sales}</b></div>
      <div class="lp-line"><span>Pembayaran Sales</span><b>${rupiah(pembayaran)}</b></div>
      <div class="lp-line"><span>Tagihan</span><b>${rupiah(tagihan)}</b></div>
      <div class="lp-line"><span>Keterangan</span><b class="${keterangan < 0 ? "lp-ket-minus" : "lp-ket-plus"}">${rupiah(keterangan)}</b></div>
    `;
    lpListSales.appendChild(div);
  });

  const totalTagihan = totalClosing * 5000;
  const totalKeterangan = totalPembayaran - totalTagihan;

  lpSummarySales.innerHTML = `
    <div class="lp-summary-sales lp-summary-sales-kpi">
      <div class="lp-sum-row"><span>Total Closing</span><b>${totalClosing}</b></div>
      <div class="lp-sum-row"><span>Total Tagihan</span><b>${rupiah(totalTagihan)}</b></div>
      <div class="lp-sum-row"><span>Pembayaran</span><b>${rupiah(totalPembayaran)}</b></div>
      <div class="lp-divider"></div>
      <div class="lp-sum-row highlight"><span>Keterangan</span><b class="${totalKeterangan < 0 ? "lp-ket-minus" : "lp-ket-plus"}">${rupiah(totalKeterangan)}</b></div>
      <div class="lp-small" style="padding:8px 0 0;">Periode ${lpSelectedMonth + 1}/${lpSelectedYear}</div>
    </div>
  `;
}

const lpInputOverlay = document.getElementById("lpInputOverlay");
const lpTanggalInput = document.getElementById("lpTanggal");
const lpDateBox = document.getElementById("lpDateBox");

document.getElementById("lpInputCloseBtn").addEventListener("click", lpCloseInputSheet);
lpInputOverlay.addEventListener("click", (e) => {
  if(e.target === lpInputOverlay) lpCloseInputSheet();
});

function lpOpenInputSheet(){
  lpResetInputForm();

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  lpTanggalInput.value = `${y}-${m}-${d}`;
  lpDateBox.classList.add("filled");

  lpInputOverlay.classList.add("active");
  lpCheckExistingLaporan();
}

function lpCloseInputSheet(){
  lpInputOverlay.classList.remove("active");
}

let lpEditMode = false;

lpTanggalInput.addEventListener("change", async () => {
  lpDateBox.classList.toggle("filled", !!lpTanggalInput.value);
  await lpCheckExistingLaporan();
});

async function lpCheckExistingLaporan(){
  const tanggal = lpTanggalInput.value;
  const user = window.currentUser;

  if(!tanggal || !user){
    lpSetFormValues(null);
    return;
  }

  const docId = user.uid + "_" + tanggal;

  document.getElementById("lpInputTitle").innerText = "Memuat...";

  try{
    const doc = await db.collection("inputAdmin").doc(docId).get();

    if(doc.exists){
      lpSetFormValues(doc.data());
      lpEditMode = true;
      document.getElementById("lpInputTitle").innerText = "Edit Laporan";
    }else{
      lpSetFormValues(null);
      lpEditMode = false;
      document.getElementById("lpInputTitle").innerText = "Input Laporan";
    }
  }catch(e){
    console.error("Gagal cek laporan existing:", e);
    lpSetFormValues(null);
    lpEditMode = false;
    document.getElementById("lpInputTitle").innerText = "Input Laporan";
  }
}

function lpSetFormValues(data){
  document.getElementById("lpLainnyaBox").innerHTML = "";
  lpLainCount = 0;

  if(!data){
    ["lpKlien", "lpSales", "lpPaySales", "lpGasHarga", "lpTutupHarga", "lpBensinHarga", "lpListrik"]
      .forEach(id => { document.getElementById(id).value = ""; });
    lpHitungTotal();
    return;
  }

  const p = data.pengeluaran || {};

  document.getElementById("lpKlien").value = data.klien ? Number(data.klien).toLocaleString("id-ID") : "";
  document.getElementById("lpSales").value = data.sales ? Number(data.sales).toLocaleString("id-ID") : "";
  document.getElementById("lpPaySales").value = data.pembayaranSales ? Number(data.pembayaranSales).toLocaleString("id-ID") : "";
  document.getElementById("lpGasHarga").value = p.gas ? Number(p.gas).toLocaleString("id-ID") : "";
  document.getElementById("lpTutupHarga").value = p.tutup ? Number(p.tutup).toLocaleString("id-ID") : "";
  document.getElementById("lpBensinHarga").value = p.bensin ? Number(p.bensin).toLocaleString("id-ID") : "";
  document.getElementById("lpListrik").value = p.listrik ? Number(p.listrik).toLocaleString("id-ID") : "";

  if(Array.isArray(p.lainnya)){
    p.lainnya.forEach(item => {
      lpAddLainnyaRow(item.keterangan || "", item.harga || 0);
    });
  }

  lpHitungTotal();
}

function lpGetRaw(id){
  return Number(document.getElementById(id).value.replace(/\./g, "")) || 0;
}

function lpFormatInputField(el){
  el.value = el.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

["lpKlien", "lpSales", "lpPaySales", "lpGasHarga", "lpTutupHarga", "lpBensinHarga", "lpListrik"].forEach(id => {
  document.getElementById(id).addEventListener("input", (e) => {
    lpFormatInputField(e.target);
    lpHitungTotal();
  });
});

function lpHitungTotal(){
  const klien = lpGetRaw("lpKlien");
  const payKl = klien * 5500;
  document.getElementById("lpPayKlien").value = rupiah(payKl);

  const salesPay = lpGetRaw("lpPaySales");
  const gas = lpGetRaw("lpGasHarga");
  const tutup = lpGetRaw("lpTutupHarga");
  const bensin = lpGetRaw("lpBensinHarga");
  const listrik = lpGetRaw("lpListrik");

  let lain = 0;
  document.querySelectorAll(".lp-lain-harga").forEach(i => lain += lpGetRaw(i.id));

  const total = payKl + salesPay - (gas + tutup + bensin + listrik + lain);
  document.getElementById("lpTotalProfit").value = rupiah(total);
}

let lpLainCount = 0;

function lpAddLainnyaRow(keterangan, harga){
  lpLainCount++;
  const div = document.createElement("div");
  div.className = "lp-lain-row";
  div.innerHTML = `
    <input placeholder="Keterangan" value="${keterangan || ""}">
    <input inputmode="numeric" class="lp-lain-harga" id="lpLain${lpLainCount}" placeholder="Harga" value="${harga ? Number(harga).toLocaleString("id-ID") : ""}">
  `;
  document.getElementById("lpLainnyaBox").appendChild(div);

  const hargaInput = div.querySelector(".lp-lain-harga");
  hargaInput.addEventListener("input", () => {
    lpFormatInputField(hargaInput);
    lpHitungTotal();
  });
}

document.getElementById("lpTambahLainnyaBtn").addEventListener("click", () => {
  lpAddLainnyaRow("", "");
});

function lpResetInputForm(){
  ["lpTanggal", "lpKlien", "lpPayKlien", "lpSales", "lpPaySales",
   "lpGasHarga", "lpTutupHarga", "lpBensinHarga", "lpListrik", "lpTotalProfit"]
    .forEach(id => { document.getElementById(id).value = ""; });

  document.getElementById("lpLainnyaBox").innerHTML = "";
  lpLainCount = 0;
  lpDateBox.classList.remove("filled");
  lpEditMode = false;
  document.getElementById("lpInputTitle").innerText = "Input Laporan";
}

document.getElementById("lpKirimBtn").addEventListener("click", lpKirimLaporan);

async function lpKirimLaporan(){
  const tanggal = lpTanggalInput.value;

  if(!tanggal){
    showPopup("Isi tanggal dulu!");
    return;
  }

  const user = window.currentUser;
  if(!user){
    showPopup("User belum login");
    return;
  }

  const uid = user.uid;
  const docId = uid + "_" + tanggal;

  let lainnya = [];
  let totalLain = 0;

  document.querySelectorAll("#lpLainnyaBox .lp-lain-row").forEach(row => {
    const ket = row.children[0].value;
    const harga = lpGetRaw(row.children[1].id);
    if(ket || harga){
      lainnya.push({ keterangan: ket, harga: harga });
      totalLain += harga;
    }
  });

  const klien = lpGetRaw("lpKlien");
  const sales = lpGetRaw("lpSales");

  const klienPay = klien * 5500;
  const salesPay = lpGetRaw("lpPaySales");

  const gas = lpGetRaw("lpGasHarga");
  const tutup = lpGetRaw("lpTutupHarga");
  const bensin = lpGetRaw("lpBensinHarga");
  const listrik = lpGetRaw("lpListrik");

  const totalPengeluaran = gas + tutup + bensin + listrik + totalLain;
  const totalProfit = (klienPay + salesPay) - totalPengeluaran;

  // rumus dinamis: basis diambil dari data adminCabang yang login
  const adminData = window.currentAdminData || {};
  const marginBase = Number(adminData.marginKlien) || 0;
  const gajiKoki = Number(adminData.gajiKoki) || 0;
  const ekuitasPersen = Number(adminData.ekuitas) || 0;
  const ekuitas = ekuitasPersen / 100;

  if(!marginBase || !ekuitas){
    showPopup("Data pengaturan (marginKlien / ekuitas) admin belum lengkap. Hubungi pusat dulu.");
    return;
  }

  const marginKlien = (klien * marginBase) - totalPengeluaran;
  const marginAll = ((klien + sales) * marginBase) - totalPengeluaran;
  const pembagianKlien = (klienPay - totalPengeluaran - (klien * gajiKoki)) * ekuitas;

  const data = {
    tanggal,
    klien,
    pembayaranKlien: klienPay,
    sales,
    pembayaranSales: salesPay,

    pengeluaran: { gas, tutup, bensin, listrik, lainnya, totalPengeluaran },

    totalProfit,
    marginKlien,
    marginAll,
    pembagianKlien,

    adminUID: uid,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try{
    await db.collection("inputAdmin").doc(docId).set(data, { merge: true });

    showPopup("Laporan berhasil disimpan");
    lpResetInputForm();
    lpCloseInputSheet();

    // refresh list tab yang lagi aktif biar data baru langsung kelihatan
    const activeTab = document.querySelector(".lp-tab.active").dataset.tab;
    if(activeTab === "klien") lpLoadDataKlien(uid);
    else if(activeTab === "sales") lpLoadDataSales(uid);

  }catch(e){
    showPopup("Gagal simpan: " + e.message);
  }
}

const LP_LONG_PRESS_MS = 500;

let lpSelectMode = false;
let lpSelectedIds = new Set();
let lpLongPressTimer = null;
let lpLongPressTriggered = false;

function lpBindLongPress(div, docId){
  const start = () => {
    lpLongPressTriggered = false;
    lpLongPressTimer = setTimeout(() => {
      lpLongPressTriggered = true;
      if(!lpSelectMode) lpEnterSelectMode();
      lpToggleSelect(docId, div);
      if(navigator.vibrate) navigator.vibrate(30);
    }, LP_LONG_PRESS_MS);
  };

  const cancelTimer = () => clearTimeout(lpLongPressTimer);

  div.addEventListener("touchstart", start, { passive: true });
  div.addEventListener("touchend", cancelTimer);
  div.addEventListener("touchmove", cancelTimer);
  div.addEventListener("touchcancel", cancelTimer);

  div.addEventListener("mousedown", start);
  div.addEventListener("mouseup", cancelTimer);
  div.addEventListener("mouseleave", cancelTimer);

  div.addEventListener("click", () => {
    if(lpLongPressTriggered){
      lpLongPressTriggered = false; // klik ini bagian dari long-press, abaikan
      return;
    }

    if(lpSelectMode){
      lpToggleSelect(docId, div);
    }else{
      lpOpenValidasi(docId);
    }
  });
}

function lpEnterSelectMode(){
  lpSelectMode = true;
  document.querySelectorAll("#lpListKlien .lp-item").forEach(el => el.classList.add("select-mode"));
  document.getElementById("lpSelectBar").classList.add("active");
}

function lpExitSelectMode(){
  lpSelectMode = false;
  lpSelectedIds.clear();
  document.querySelectorAll("#lpListKlien .lp-item").forEach(el => {
    el.classList.remove("select-mode", "selected");
  });
  document.getElementById("lpSelectBar").classList.remove("active");
  lpUpdateSelectCount();
}

function lpToggleSelect(docId, div){
  if(lpSelectedIds.has(docId)){
    lpSelectedIds.delete(docId);
    div.classList.remove("selected");
  }else{
    lpSelectedIds.add(docId);
    div.classList.add("selected");
  }

  lpUpdateSelectCount();

  if(lpSelectedIds.size === 0) lpExitSelectMode();
}

function lpUpdateSelectCount(){
  document.getElementById("lpSelectCount").innerText = `${lpSelectedIds.size} dipilih`;
}

document.getElementById("lpSelectCancelBtn").addEventListener("click", lpExitSelectMode);

const lpDeleteConfirmModal = document.getElementById("lpDeleteConfirmModal");

document.getElementById("lpSelectDeleteBtn").addEventListener("click", () => {
  if(lpSelectedIds.size === 0) return;

  document.getElementById("lpDeleteConfirmText").innerText =
    `${lpSelectedIds.size} laporan yang dipilih akan dihapus permanen. Data di tab Sales pada tanggal yang sama juga ikut terhapus (satu dokumen yang sama).`;

  lpDeleteConfirmModal.classList.add("active");
});

document.getElementById("lpDeleteCancelBtn").addEventListener("click", () => {
  lpDeleteConfirmModal.classList.remove("active");
});

document.getElementById("lpDeleteOkBtn").addEventListener("click", async () => {
  lpDeleteConfirmModal.classList.remove("active");

  const ids = Array.from(lpSelectedIds);
  if(ids.length === 0) return;

  const btn = document.getElementById("lpSelectDeleteBtn");
  btn.disabled = true;

  try{
    const batch = db.batch();
    ids.forEach(id => {
      batch.delete(db.collection("inputAdmin").doc(id));
    });
    await batch.commit();

    showPopup(`${ids.length} laporan berhasil dihapus`);
  }catch(e){
    showPopup("Gagal hapus: " + e.message);
    console.error("Gagal hapus laporan:", e);
  }finally{
    btn.disabled = false;
    lpExitSelectMode();

    const user = window.currentUser;
    if(user) lpLoadDataKlien(user.uid);
  }
});

async function lpLoadDataGabungan(uid){
  const wrap = document.getElementById("lpListData");
  wrap.innerHTML = `<p class="lp-small">Memuat...</p>`;

  try{
    const snap = await db.collection("inputAdmin")
      .where("adminUID", "==", uid)
      .get();

    if(snap.empty){
      wrap.innerHTML = `<p class="lp-small">Belum ada data</p>`;
      return;
    }

    let arr = [];
    snap.forEach(doc => arr.push(doc.data()));
    arr.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));

    wrap.innerHTML = "";

    arr.forEach(d => {
      const p = d.pengeluaran || {};

      const klien = lpToNumber(d.klien);
      const pembayaranKlien = lpToNumber(d.pembayaranKlien);
      const sales = lpToNumber(d.sales);
      const pembayaranSales = lpToNumber(d.pembayaranSales);

      const gas = lpToNumber(p.gas);
      const tutup = lpToNumber(p.tutup);
      const bensin = lpToNumber(p.bensin);
      const listrik = lpToNumber(p.listrik);
      const totalPengeluaran = lpToNumber(p.totalPengeluaran);

      const totalProfit = lpToNumber(d.totalProfit);
      const marginKlien = lpToNumber(d.marginKlien);
      const marginAll = lpToNumber(d.marginAll);
      const pembagianKlien = lpToNumber(d.pembagianKlien);
      const validasi = lpToNumber(d.validasi);

      let lainnyaRows = "";
      if(Array.isArray(p.lainnya)){
        p.lainnya.forEach(item => {
          const ket = item.keterangan || "Lainnya";
          const harga = lpToNumber(item.harga) || 0;
          lainnyaRows += `<div class="lp-exp-sub-row"><span><i class="fa-solid fa-ellipsis"></i> ${ket}</span><b>${rupiah(harga)}</b></div>`;
        });
      }

      const div = document.createElement("div");
      div.className = "lp-item";

      div.innerHTML = `
        <div class="lp-line bold"><span>📅 ${lpFormatTanggal(d.tanggal)}</span></div>
        <hr>

        <div class="lp-form-subtitle" style="margin-top:0;">Klien</div>
        <div class="lp-line"><span>Closing</span><b>${klien || 0}</b></div>
        <div class="lp-line"><span>Pembayaran</span><b>${rupiah(pembayaranKlien)}</b></div>

        <div class="lp-form-subtitle">Sales</div>
        <div class="lp-line"><span>Closing</span><b>${sales || 0}</b></div>
        <div class="lp-line"><span>Pembayaran</span><b>${rupiah(pembayaranSales)}</b></div>

        <div class="lp-line bold"><span>Total Closing (Klien+Sales)</span><b>${(klien || 0) + (sales || 0)}</b></div>

        <div class="lp-form-subtitle">Pengeluaran</div>
        <div class="lp-exp-block">
          <div class="lp-line"><span>Total</span><b>${rupiah(totalPengeluaran)}</b></div>
          <div class="lp-exp-sub-list">
            <div class="lp-exp-sub-row"><span><i class="fa-solid fa-fire"></i> Gas</span><b>${rupiah(gas)}</b></div>
            <div class="lp-exp-sub-row"><span><i class="fa-solid fa-box"></i> Tutup</span><b>${rupiah(tutup)}</b></div>
            <div class="lp-exp-sub-row"><span><i class="fa-solid fa-gas-pump"></i> Bensin</span><b>${rupiah(bensin)}</b></div>
            <div class="lp-exp-sub-row"><span><i class="fa-solid fa-bolt"></i> Listrik</span><b>${rupiah(listrik)}</b></div>
            ${lainnyaRows}
          </div>
        </div>

        <div class="lp-form-subtitle">Ringkasan</div>
        <div class="lp-line"><span>Margin Klien</span><b>${rupiah(marginKlien)}</b></div>
        <div class="lp-line"><span>Margin Gabungan</span><b>${rupiah(marginAll)}</b></div>
        <div class="lp-line"><span>Total Profit</span><b>${rupiah(totalProfit)}</b></div>
        <div class="lp-line"><span>Omset (Pembagian)</span><b>${rupiah(pembagianKlien)}</b></div>
        <div class="lp-line"><span>Validasi</span><b>${rupiah(validasi)}</b></div>
      `;

      wrap.appendChild(div);
    });

  }catch(err){
    wrap.innerHTML = `<p class="lp-small">Gagal ambil data: ${err.message}</p>`;
    console.error("Gagal ambil data gabungan:", err);
  }
}
