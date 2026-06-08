export default function handler(_req: any, res: any) {
  const adminCode = process.env.ADMIN_ACTIVATION_CODE || "JAGO-ADMIN-2024";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Dashboard - JagoCV</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#1e293b;padding:20px}
h1{font-size:22px;margin-bottom:4px;color:#1e40af}
.sub{color:#64748b;font-size:13px;margin-bottom:20px}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.filters{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.filters button{padding:6px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600}
.filters button.active{background:#1e40af;color:#fff;border-color:#1e40af}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
th,td{padding:10px 12px;text-align:left;font-size:12px;border-bottom:1px solid #e2e8f0}
th{background:#f8fafc;font-weight:700;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
tr:hover{background:#f8fafc}
.status{padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700}
.status-pending{background:#fef3c7;color:#92400e}
.status-paid{background:#d1fae5;color:#065f46}
.status-failed{background:#fee2e2;color:#991b1b}
.status-pending-verifikasi-manual{background:#e0e7ff;color:#3730a3}
.btn{padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;transition:all .15s}
.btn-confirm{background:#059669;color:#fff}
.btn-confirm:hover{background:#047857}
.btn-reject{background:#dc2626;color:#fff}
.btn-reject:hover{background:#b91c1c}
.btn-sm{padding:4px 10px;font-size:10px}
.actions{display:flex;gap:4px}
#loginPage{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;gap:12px}
#loginPage input{padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;width:260px}
#loginPage button{padding:10px 24px;background:#1e40af;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700}
#loginPage button:hover{background:#1d4ed8}
#loginPage .error{color:#dc2626;font-size:13px}
.loading{text-align:center;padding:40px;color:#94a3b8;font-size:13px}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px}
.toast{position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;color:#fff;font-size:13px;font-weight:600;z-index:999;animation:fadeIn .3s}
.toast-success{background:#059669}
.toast-error{background:#dc2626}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>
<div id="app">
<div id="loginPage">
<h1 style="font-size:28px;margin-bottom:4px">🔐 Admin JagoCV</h1>
<p class="sub" style="margin-bottom:8px">Masukkan kode aktivasi admin</p>
<input type="text" id="codeInput" placeholder="Kode Aktivasi" autocomplete="off" onkeydown="if(event.key==='Enter')adminLogin()"/>
<button onclick="adminLogin()">Masuk</button>
<p class="error" id="loginError"></p>
</div>
</div>
<script>
const ADMIN_CODE = ${JSON.stringify(adminCode)};
let pollTimer;
function startPolling(){
  if(pollTimer) clearInterval(pollTimer);
  pollTimer=setInterval(loadTransactions,5000);
}
if(sessionStorage.getItem('adminLoggedIn')==='true'){
  document.getElementById('loginPage').style.display='none';
  loadTransactions();
  startPolling();
}
function adminLogin(){
  const val=document.getElementById('codeInput').value.trim();
  if(val===ADMIN_CODE){
    sessionStorage.setItem('adminLoggedIn','true');
    document.getElementById('loginPage').style.display='none';
    loadTransactions();
    startPolling();
  } else {
    document.getElementById('loginError').textContent='Kode aktivasi salah!';
  }
}
let allTx=[];
let filter='all';
async function loadTransactions(){
  document.getElementById('app').innerHTML='<div class="loading">Memuat transaksi...</div>';
  try {
    const r=await fetch('/api/billing/admin/transactions');
    const d=await r.json();
    if(d.success) allTx=d.transactions;
    render();
  } catch(e){
    document.getElementById('app').innerHTML='<div class="loading" style="color:#dc2626">Gagal memuat: '+e.message+'</div>';
  }
}
function render(){
  const filtered=filter==='all'?allTx:allTx.filter(t=>t.status===filter);
  const counts={all:allTx.length,pending:allTx.filter(t=>t.status==='PENDING'||t.status==='PENDING VERIFIKASI MANUAL').length,paid:allTx.filter(t=>t.status==='PAID').length,failed:allTx.filter(t=>t.status==='FAILED').length};
  let html='<div class="header"><div><h1>📋 Dashboard Pembayaran</h1><p class="sub">'+allTx.length+' transaksi total</p></div><button class="btn btn-sm" style="background:#e2e8f0" onclick="loadTransactions()">🔄 Refresh</button></div>';
  html+='<div class="filters">';
  const labels={all:'Semua ('+counts.all+')',pending:'Pending ('+counts.pending+')',paid:'Lunas ('+counts.paid+')',failed:'Ditolak ('+counts.failed+')'};
  Object.entries(labels).forEach(([k,v])=>{
    html+='<button class="'+(filter===k?'active':'')+'" onclick="filter=\\''+k+'\\';render()">'+v+'</button>';
  });
  html+='</div>';
  if(filtered.length===0){
    html+='<div class="loading">Tidak ada transaksi</div>';
  } else {
    html+='<table><thead><tr><th>ID</th><th>Email</th><th>Paket</th><th>Nominal</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>';
    filtered.forEach(tx=>{
      const statusClass='status-'+tx.status.toLowerCase().replace(/ /g,'-');
      const nominal='Rp '+(tx.nominal||0).toLocaleString('id-ID');
      const date=new Date(tx.createdAt).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      const canAct=tx.status==='PENDING'||tx.status==='PENDING VERIFIKASI MANUAL';
      const hasScreenshot = !!tx.hasScreenshot;
      html+='<tr><td><code>'+tx.id.slice(0,16)+'</code></td><td>'+tx.email+'</td><td><strong>'+tx.paket+'</strong></td><td>'+nominal+'</td><td><span class="status '+statusClass+'">'+tx.status+'</span></td><td>'+date+'</td><td class="actions">';
      if(hasScreenshot){
        html+='<a href="/api/billing/admin/screenshot/'+encodeURIComponent(tx.id)+'" target="_blank" class="btn btn-sm" style="background:#6366f1;color:#fff;text-decoration:none">📷 Lihat</a>';
      }
      if(canAct){
        html+='<button class="btn btn-confirm btn-sm" onclick=\\'confirmTx('+JSON.stringify(tx.id)+')\\'>✅ Konfirmasi</button>';
        html+='<button class="btn btn-reject btn-sm" onclick=\\'rejectTx('+JSON.stringify(tx.id)+')\\'>❌ Tolak</button>';
      } else {
        html+='<span style="color:#94a3b8;font-size:11px">—</span>';
      }
      html+='</td></tr>';
    });
    html+='</tbody></table>';
  }
  html+='<div id="toast"></div>';
  document.getElementById('app').innerHTML=html;
}
async function confirmTx(id){
  if(!confirm('Konfirmasi transaksi ini?'))return;
  try {
    const r=await fetch('/api/billing/admin/confirm-manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transactionId:id})});
    const d=await r.json();
    if(d.success){
      showToast('✅ '+d.message,'success');
      loadTransactions();
    } else {
      showToast('❌ '+(d.error||'Gagal'),'error');
    }
  } catch(e){
    showToast('❌ '+e.message,'error');
  }
}
async function rejectTx(id){
  if(!confirm('Tolak transaksi ini?'))return;
  try {
    const r=await fetch('/api/billing/admin/reject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transactionId:id})});
    const d=await r.json();
    if(d.success){
      showToast('✅ Transaksi ditolak','success');
      loadTransactions();
    } else {
      showToast('❌ '+(d.error||'Gagal'),'error');
    }
  } catch(e){
    showToast('❌ '+e.message,'error');
  }
}
function showToast(msg,type){
  const t=document.getElementById('toast');
  t.innerHTML='<div class="toast toast-'+type+'">'+msg+'</div>';
  setTimeout(()=>t.innerHTML='',3000);
}
</script>
</body>
</html>`);
}
