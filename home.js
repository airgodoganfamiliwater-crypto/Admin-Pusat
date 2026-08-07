/* ================= UTIL ================= */
function rupiah(n){
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function getGreeting(){
  const h = new Date().getHours();
  if(h >= 4 && h < 11) return "Pagi";
  if(h >= 11 && h < 15) return "Siang";
  if(h >= 15 && h < 18) return "Sore";
  return "Malam";
}

function getTanggalHariIni(){
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const bulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const now = new Date();
  return `${hari[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
}

function todayKey(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ================= LOAD HOME ================= */
async function loadHomeData(){
  const nama = localStorage.getItem("adminCabangName") || "Admin";

  document.getElementById("greeting").innerText = `Selamat ${getGreeting()}, ${nama}`;
  document.getElementById("todayDate").innerText = getTanggalHariIni();

  // placeholder: nanti diisi dari data laporan hari ini (collection inputAdmin)
  document.getElementById("sumClosingHariIni").innerText = "0";
  document.getElementById("sumOmsetHariIni").innerText = rupiah(0);

  const user = window.currentUser;
  if(!user) return;

  try{
    const snap = await db.collection("inputAdmin")
      .where("adminUID", "==", user.uid)
      .where("tanggal", "==", todayKey())
      .get();

    let closing = 0;
    let omset = 0;
    snap.forEach(doc => {
      const d = doc.data();
      closing += d.klien || 0;
      omset += d.pembayaranKlien || 0;
    });

    document.getElementById("sumClosingHariIni").innerText = closing;
    document.getElementById("sumOmsetHariIni").innerText = rupiah(omset);
  }catch(err){
    console.error("Gagal ambil ringkasan hari ini:", err);
  }
}
