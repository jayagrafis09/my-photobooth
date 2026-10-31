const API_URL = "/api/upload";
const video = document.getElementById("video");
const canvas = document.getElementById("result");
const ctx = canvas.getContext("2d");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const frameButtons = [...document.querySelectorAll("[data-frame]")];
const cameraBtn = document.getElementById("cameraBtn");
const captureBtn = document.getElementById("captureBtn");
const resetBtn = document.getElementById("resetBtn");
const downloadBtn = document.getElementById("downloadBtn");
const uploadBtn = document.getElementById("uploadBtn");
const startCameraBtn = document.getElementById("startCameraBtn");
let stream = null;
let photos = [];
let maxPhotos = 3;
let selectedFrame = "classic";
let uploaded = false;
let uploading = false;

const frameNames = {classic:"Classic Cream",minimal:"Modern Minimal",gold:"Gold Noir"};
function status(message){document.getElementById("status").textContent=message;}
function updateCounter(){document.getElementById("counter").textContent=photos.length+" / "+maxPhotos;}
function updateSummary(){document.getElementById("selectionSummary").textContent=frameNames[selectedFrame]+" · "+({1:"Single Photo",3:"Photo Strip 3",4:"Photo Grid 4"}[maxPhotos]);}
function selectMode(value){
  maxPhotos=Number(value);
  modeButtons.forEach(btn=>{const active=Number(btn.dataset.mode)===maxPhotos;btn.classList.toggle("is-selected",active);btn.setAttribute("aria-pressed",String(active));});
  resetPhotos();updateSummary();
}
function selectFrame(value){
  selectedFrame=value;
  frameButtons.forEach(btn=>{const active=btn.dataset.frame===value;btn.classList.toggle("is-selected",active);btn.setAttribute("aria-pressed",String(active));});
  updateSummary();
  if(photos.length===maxPhotos)composePhotos();
}
async function startCamera(){
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("Browser tidak mendukung akses kamera. Gunakan HTTPS.");
    if(stream)stream.getTracks().forEach(track=>track.stop());
    status("Menghubungkan kamera...");
    cameraBtn.disabled=true;captureBtn.disabled=true;
    stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:960}},audio:false});
    video.srcObject=stream;await video.play();
    document.getElementById("cameraPlaceholder").hidden=true;
    cameraBtn.disabled=false;captureBtn.disabled=false;
    status("Kamera aktif. Silakan mulai mengambil foto.");
  }catch(error){
    cameraBtn.disabled=false;captureBtn.disabled=true;
    status("Kamera gagal: "+error.message);console.error(error);
  }
}
function capturePhoto(){
  if(!stream||photos.length>=maxPhotos)return;
  const temp=document.createElement("canvas");temp.width=video.videoWidth;temp.height=video.videoHeight;
  if(!temp.width||!temp.height){status("Kamera belum siap. Coba beberapa saat lagi.");return;}
  const tempCtx=temp.getContext("2d");tempCtx.translate(temp.width,0);tempCtx.scale(-1,1);tempCtx.drawImage(video,0,0);
  photos.push(temp);updateCounter();
  if(photos.length===maxPhotos){
    composePhotos();captureBtn.disabled=true;downloadBtn.disabled=false;uploadBtn.disabled=false;
    status("Foto selesai. Kamu bisa mengunduh atau menyimpan ke Google Drive.");
  }else status("Foto "+photos.length+" berhasil. Ambil foto berikutnya.");
}
function drawCover(image,x,y,w,h){
  const scale=Math.max(w/image.width,h/image.height),sw=w/scale,sh=h/scale,sx=(image.width-sw)/2,sy=(image.height-sh)/2;
  ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);
}
function composePhotos(){
  const photoW=600,photoH=450,gap=14,pad=selectedFrame==="minimal"?18:28,header=selectedFrame==="gold"?54:42,footer=selectedFrame==="gold"?58:52;
  const isGrid=maxPhotos===4;
  const cols=isGrid?2:1,rows=isGrid?2:maxPhotos;
  const cellW=isGrid?430:600,cellH=isGrid?322:450;
  const innerW=cols*cellW+(cols-1)*gap,innerH=rows*cellH+(rows-1)*gap;
  canvas.width=innerW+pad*2;canvas.height=innerH+pad*2+header+footer;
  const bg=selectedFrame==="gold"?"#171816":selectedFrame==="minimal"?"#ffffff":"#f4efe6";
  const ink=selectedFrame==="gold"?"#e4c98e":selectedFrame==="minimal"?"#343434":"#806b4e";
  ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle=selectedFrame==="gold"?"#b18a45":selectedFrame==="minimal"?"#d8d8d8":"#cbbda7";
  ctx.lineWidth=selectedFrame==="minimal"?1:2;ctx.strokeRect(8,8,canvas.width-16,canvas.height-16);
  ctx.fillStyle=ink;ctx.textAlign="center";ctx.font="600 19px Georgia";ctx.fillText(selectedFrame==="gold"?"GOLD EDITION":"MY PHOTOBOOTH",canvas.width/2,pad+25);
  photos.forEach((photo,index)=>{
    const col=isGrid?index%2:0,row=isGrid?Math.floor(index/2):index;
    const x=pad+col*(cellW+gap),y=pad+header+row*(cellH+gap);
    ctx.fillStyle=selectedFrame==="gold"?"#2d2e29":"#e9e5dd";ctx.fillRect(x-3,y-3,cellW+6,cellH+6);
    drawCover(photo,x,y,cellW,cellH);
  });
  ctx.fillStyle=ink;ctx.font="11px Arial";ctx.fillText("CAPTURE THE MOMENT  ·  "+new Date().getFullYear(),canvas.width/2,canvas.height-pad-15);
  canvas.style.display="block";document.getElementById("resultPlaceholder").hidden=true;
}
function resetPhotos(){
  if(uploading)return;
  photos=[];uploaded=false;canvas.style.display="none";canvas.width=0;canvas.height=0;
  document.getElementById("resultPlaceholder").hidden=false;
  document.getElementById("qrPanel").hidden=true;document.getElementById("qrcode").innerHTML="";
  downloadBtn.disabled=true;uploadBtn.disabled=true;uploadBtn.textContent="Upload & Buat QR";
  captureBtn.disabled=!stream;updateCounter();status("Siap mengambil foto.");
}
function downloadPhoto(){
  if(!photos.length||photos.length!==maxPhotos)return;
  const link=document.createElement("a");link.href=canvas.toDataURL("image/png");link.download="my-photobooth-"+Date.now()+".png";link.click();
}
async function uploadPhoto(){
  if(uploading||uploaded||photos.length!==maxPhotos)return;
  uploading=true;uploadBtn.disabled=true;uploadBtn.textContent="Mengunggah...";status("Mengirim foto ke Google Drive...");
  try{
    const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:canvas.toDataURL("image/jpeg",0.85),mode:String(maxPhotos),frame:selectedFrame})});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(result.message||"Upload gagal.");
    if(!result.fileUrl)throw new Error("Server tidak mengembalikan tautan foto.");
    uploaded=true;document.getElementById("fileName").textContent=result.fileName||"Foto tersimpan";
    document.getElementById("driveLink").href=result.fileUrl;document.getElementById("qrPanel").hidden=false;
    const qr=document.getElementById("qrcode");qr.innerHTML="";
    if(typeof QRCode!=="undefined")new QRCode(qr,{text:result.fileUrl,width:190,height:190,correctLevel:QRCode.CorrectLevel.M});
    uploadBtn.textContent="Berhasil disimpan";status("Upload berhasil. QR Code siap dipindai.");
  }catch(error){uploadBtn.disabled=false;uploadBtn.textContent="Coba Upload Lagi";status("Upload gagal: "+error.message);console.error(error);}
  finally{uploading=false;}
}
modeButtons.forEach(btn=>btn.addEventListener("click",()=>selectMode(btn.dataset.mode)));
frameButtons.forEach(btn=>btn.addEventListener("click",()=>selectFrame(btn.dataset.frame)));
cameraBtn.addEventListener("click",startCamera);captureBtn.addEventListener("click",capturePhoto);
resetBtn.addEventListener("click",resetPhotos);downloadBtn.addEventListener("click",downloadPhoto);uploadBtn.addEventListener("click",uploadPhoto);
startCameraBtn.addEventListener("click",()=>{document.getElementById("cameraSection").scrollIntoView({behavior:"smooth"});if(!stream)startCamera();});
const adminModal=document.getElementById("adminModal");
const adminPin=document.getElementById("adminPin");
const adminLoginForm=document.getElementById("adminLoginForm");
const adminLoginBtn=document.getElementById("adminLoginBtn");
const adminLoginStatus=document.getElementById("adminLoginStatus");
const adminDashboard=document.getElementById("adminDashboard");
const adminHistoryBody=document.getElementById("adminHistoryBody");
const adminHistoryStatus=document.getElementById("adminHistoryStatus");
let adminSessionToken=null;
function closeAdminModal(){adminModal.hidden=true;adminLoginStatus.textContent="";adminPin.value="";}
function showAdminDashboard(){
  adminLoginForm.hidden=true;adminLoginStatus.hidden=true;adminDashboard.hidden=false;
  document.getElementById("adminModalTitle").textContent="Pengelolaan Photobooth";
}
function formatAdminDate(value){
  if(!value)return "-";
  const d=new Date(value);
  return Number.isNaN(d.getTime())?String(value):d.toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"});
}
function safeText(value){return value===null||value===undefined||value===""?"-":String(value);}
function appendAdminCell(row,value){
  const td=document.createElement("td");td.textContent=safeText(value);row.appendChild(td);return td;
}
async function loadAdminData(){
  if(!adminSessionToken)return;
  adminHistoryStatus.textContent="Memuat riwayat foto...";
  document.getElementById("adminRefreshBtn").disabled=true;
  try{
    const response=await fetch("/api/admin/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:adminSessionToken})});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(result.message||"Gagal mengambil data admin.");
    const stats=result.stats||{};
    document.getElementById("adminTotalPhotos").textContent=safeText(stats.totalPhotos??stats.total??result.totalPhotos??0);
    document.getElementById("adminTodayPhotos").textContent=safeText(stats.todayPhotos??stats.today??result.todayPhotos??0);
    const records=result.records||result.history||result.data||[];
    adminHistoryBody.replaceChildren();
    if(!records.length){adminHistoryStatus.textContent="Belum ada riwayat foto.";return;}
    records.forEach(item=>{
      const row=document.createElement("tr");
      appendAdminCell(row,formatAdminDate(item.tanggalUpload??item.date??item.timestamp??item.uploadDate));
      appendAdminCell(row,item.namaFile??item.fileName??item.name);
      appendAdminCell(row,item.modeFoto??item.mode);
      appendAdminCell(row,item.frame);
      const linkCell=document.createElement("td");
      const url=item.linkGoogleDrive??item.fileUrl??item.url;
      if(url){const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Buka foto ↗";linkCell.appendChild(a);}
      else linkCell.textContent="-";
      row.appendChild(linkCell);adminHistoryBody.appendChild(row);
    });
    adminHistoryStatus.textContent="Menampilkan "+records.length+" riwayat terbaru.";
  }catch(error){
    adminHistoryStatus.textContent=error.message;
    if(/sesi|token|login|expired/i.test(error.message)){adminSessionToken=null;adminDashboard.hidden=true;adminLoginForm.hidden=false;adminLoginStatus.hidden=false;adminLoginStatus.textContent="Sesi berakhir. Silakan login kembali.";}
  }finally{document.getElementById("adminRefreshBtn").disabled=false;}
}
document.getElementById("adminInfoBtn").addEventListener("click",()=>{
  adminModal.hidden=false;
  if(adminSessionToken){showAdminDashboard();loadAdminData();}
  else{adminLoginForm.hidden=false;adminLoginStatus.hidden=false;adminDashboard.hidden=true;document.getElementById("adminModalTitle").textContent="Admin Login";adminPin.focus();}
});
document.getElementById("adminCloseBtn").addEventListener("click",closeAdminModal);
adminModal.addEventListener("click",event=>{if(event.target===adminModal)closeAdminModal();});
adminLoginForm.addEventListener("submit",async event=>{
  event.preventDefault();
  const pin=adminPin.value.trim();
  if(!pin){adminLoginStatus.textContent="PIN wajib diisi.";return;}
  adminLoginBtn.disabled=true;adminLoginStatus.textContent="Memeriksa PIN...";
  try{
    const response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin})});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(result.message||"Login admin gagal.");
    if(!result.token)throw new Error("Login berhasil, tetapi token sesi tidak diterima. Periksa versi Code.gs dan deployment.");
    adminSessionToken=result.token;adminPin.value="";adminLoginStatus.textContent="";
    showAdminDashboard();await loadAdminData();
  }catch(error){adminLoginStatus.textContent=error.message;adminLoginStatus.classList.remove("is-success");}
  finally{adminLoginBtn.disabled=false;}
});
document.getElementById("adminRefreshBtn").addEventListener("click",loadAdminData);
document.getElementById("adminLogoutBtn").addEventListener("click",()=>{
  adminSessionToken=null;adminDashboard.hidden=true;adminLoginForm.hidden=false;adminLoginStatus.hidden=false;
  adminLoginStatus.textContent="Kamu sudah keluar dari area admin.";adminLoginStatus.classList.remove("is-success");
  document.getElementById("adminModalTitle").textContent="Admin Login";
});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!adminModal.hidden)closeAdminModal();});
window.addEventListener("beforeunload",()=>{if(stream)stream.getTracks().forEach(track=>track.stop());});
selectMode(3);selectFrame("classic");updateCounter();