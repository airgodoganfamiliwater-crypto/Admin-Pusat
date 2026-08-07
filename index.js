/* ================= FIREBASE ================= */
firebase.initializeApp({
  apiKey: "AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain: "klien-39696.firebaseapp.com",
  projectId: "klien-39696",
});

const auth = firebase.auth();
const db = firebase.firestore();

/* ================= POPUP UMUM ================= */
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");

function showPopup(msg){
  popupText.innerText = msg;
  popup.classList.add("active");
}
function closePopup(){
  popup.classList.remove("active");
}
document.getElementById("popupCloseBtn").addEventListener("click", closePopup);

/* ================= ROUTER ================= */
const views = ["home", "laporan", "statement", "profil"];
window.currentView = "home";

function goToView(name, trigger = "push"){
  if(!views.includes(name)) name = "home";

  const prevViewEl = document.querySelector(".view.active");

  views.forEach(v => {
    document.getElementById("view-" + v).classList.remove("active", "view-anim-push", "view-anim-pop");
  });

  const nextViewEl = document.getElementById("view-" + name);
  nextViewEl.classList.add("active");

  if(prevViewEl){
    const animClass = trigger === "pop" ? "view-anim-pop" : "view-anim-push";
    nextViewEl.classList.add(animClass);
    nextViewEl.addEventListener("animationend", () => {
      nextViewEl.classList.remove(animClass);
    }, { once: true });
  }

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });

  window.currentView = name;

  if(location.hash !== "#" + name){
    history.replaceState(null, "", "#" + name);
  }

  requestAnimationFrame(() => {
    if(name === "home" && typeof loadHomeData === "function") loadHomeData();
    if(name === "laporan" && typeof loadLaporanData === "function") loadLaporanData();
    if(name === "statement" && typeof loadStatementData === "function") loadStatementData();
    if(name === "profil" && typeof loadProfilData === "function") loadProfilData();
  });
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => goToView(btn.dataset.view, "push"));
});

// tombol shortcut di home (quick access)
document.querySelectorAll("[data-goto]").forEach(btn => {
  btn.addEventListener("click", () => goToView(btn.dataset.goto, "push"));
});

/* ===== BACK ANDROID -> selalu ke home, abaikan histori ===== */
history.pushState({ app: true }, "");
history.pushState({ app: true }, "");
history.pushState({ app: true }, "");
location.hash = "home";

let _backLocked = false;

function _handleBack(){
  if(_backLocked) return;
  _backLocked = true;

  if(window.currentView !== "home"){
    goToView("home", "pop");
  }

  history.pushState({ app: true }, "", "#" + window.currentView);
  setTimeout(() => { _backLocked = false; }, 300);
}

window.addEventListener("hashchange", () => {
  if(location.hash !== "#" + window.currentView){
    _handleBack();
  }
});

/* ================= LOGOUT ================= */
const logoutModal = document.getElementById("logoutConfirmModal");

document.getElementById("btnLogout").addEventListener("click", () => {
  logoutModal.classList.add("active");
});
document.getElementById("logoutCancelBtn").addEventListener("click", () => {
  logoutModal.classList.remove("active");
});
document.getElementById("logoutOkBtn").addEventListener("click", async () => {
  logoutModal.classList.remove("active");
  localStorage.removeItem("adminCabang");
  localStorage.removeItem("adminCabangName");
  localStorage.removeItem("adminCabangID");
  await auth.signOut();
  window.location.href = "login.html";
});

/* ================= CEK LOGIN ================= */
auth.onAuthStateChanged(async user => {
  if(!user){
    window.location.href = "login.html";
    return;
  }

  try{
    const doc = await db.collection("adminCabang").doc(user.uid).get();

    if(!doc.exists){
      showPopup("Akun tidak terdaftar sebagai admin cabang");
      await auth.signOut();
      window.location.href = "login.html";
      return;
    }

    const data = doc.data();

    if(data.role !== "admin_cabang"){
      showPopup("Role tidak diizinkan mengakses halaman ini");
      await auth.signOut();
      window.location.href = "login.html";
      return;
    }
    if(data.status !== "approved"){
      showPopup("Akun belum disetujui pusat");
      await auth.signOut();
      window.location.href = "login.html";
      return;
    }

    window.currentUser = user;
    window.currentAdminData = data;

    localStorage.setItem("adminCabang", "true");
    localStorage.setItem("adminCabangName", data.nama || "");
    localStorage.setItem("adminCabangID", data.id || "");

    goToView("home");

  }catch(err){
    console.error("Gagal cek akun admin:", err);
    showPopup("Gagal memuat akun: " + err.message);
  }
});

/* ====== SWIPE-DOWN TO CLOSE (BOTTOM SHEET) ======= */
function initSheetSwipeToClose(){
  document.querySelectorAll(".sheet-overlay").forEach(overlay => {
    const sheet = overlay.querySelector(".sheet");
    const handle = overlay.querySelector(".sheet-handle");
    const sheetBody = overlay.querySelector(".sheet-body");
    if(!sheet || sheet.dataset.swipeBound) return;

    sheet.dataset.swipeBound = "true";

    let startY = 0;
    let currentY = 0;
    let startedOnHandle = false;
    let dragging = false;   // udah pasti nge-drag sheet-nya
    let locked = false;     // udah dipastiin ini scroll biasa, jangan diintersep lagi

    function scrollAtTop(){
      return !sheetBody || sheetBody.scrollTop <= 0;
    }

    function onTouchStart(e){
      const touch = e.touches[0];
      startY = touch.clientY;
      currentY = startY;
      startedOnHandle = !!(handle && handle.contains(e.target));
      dragging = false;
      locked = false;
      sheet.style.transition = "none";
    }

    function onTouchMove(e){
      const touch = e.touches[0];
      currentY = touch.clientY;
      const delta = currentY - startY;

      if(locked) return; // ini scroll konten biasa, biarin native

      if(!dragging){
        if(delta <= 4) return; // belum jelas arahnya, tunggu gerak lebih jauh

        // dari handle selalu boleh drag, dari body cuma boleh kalau scroll udah mentok atas
        if(startedOnHandle || scrollAtTop()){
          dragging = true;
        }else{
          locked = true;
          return;
        }
      }

      // udah mode drag sheet -> stop scroll & pull-to-refresh bawaan browser
      e.preventDefault();
      const clamped = Math.max(0, delta);
      sheet.style.transform = `translateY(${clamped}px)`;
    }

    function onTouchEnd(){
      if(dragging){
        sheet.style.transition = "";
        const delta = Math.max(0, currentY - startY);
        const threshold = sheet.offsetHeight * 0.25;

        if(delta > threshold){
          overlay.classList.remove("active");
        }
        sheet.style.transform = "";
      }
      dragging = false;
      locked = false;
    }

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", onTouchEnd);
    sheet.addEventListener("touchcancel", onTouchEnd);

    // drag pakai mouse (buat testing di desktop), dari handle aja
    if(handle){
      handle.addEventListener("mousedown", (e) => {
        startY = e.clientY;
        currentY = startY;
        sheet.style.transition = "none";

        const moveHandler = (ev) => {
          currentY = ev.clientY;
          const delta = Math.max(0, currentY - startY);
          sheet.style.transform = `translateY(${delta}px)`;
        };
        const upHandler = () => {
          sheet.style.transition = "";
          const delta = Math.max(0, currentY - startY);
          const threshold = sheet.offsetHeight * 0.25;
          if(delta > threshold) overlay.classList.remove("active");
          sheet.style.transform = "";
          document.removeEventListener("mousemove", moveHandler);
          document.removeEventListener("mouseup", upHandler);
        };
        document.addEventListener("mousemove", moveHandler);
        document.addEventListener("mouseup", upHandler);
      });
    }
  });
}

initSheetSwipeToClose();
