async function loadProfilData(){
  const user = window.currentUser;
  const cachedNama = localStorage.getItem("adminCabangName") || "Admin Cabang";

  document.getElementById("prNama").innerText = cachedNama;
  document.getElementById("prDetailNama").innerText = cachedNama;
  document.getElementById("prDetailId").innerText = localStorage.getItem("adminCabangID") || "-";
  document.getElementById("prDetailEmail").innerText = user?.email || "-";

  // kalau sudah ada data dari cek login di index.js, langsung pakai itu biar hemat 1x fetch
  const cachedData = window.currentAdminData;
  if(cachedData){
    document.getElementById("prDetailStatus").innerText = cachedData.status || "-";
    return;
  }

  if(!user) return;

  try{
    const doc = await db.collection("adminCabang").doc(user.uid).get();
    if(!doc.exists) return;
    const d = doc.data();
    document.getElementById("prDetailStatus").innerText = d.status || "-";
  }catch(err){
    console.error("Gagal ambil data profil:", err);
  }
}
