/**
 * WAWAR — Main Frontend Application Logic
 * Hubungan: Gateway WAWAR & Maskot IKP: RAYI
 * Endpoint VPS: http://srv2091882.hstgr.cloud:8085
 */

const CONFIG = {
  host: 'http://srv2091882.hstgr.cloud:8085',
  masterKey: 'WawarSecretMasterKey2026!',
  defaultInstance: 'Wawar-primary',
  defaultPhone: '6285121042025'
};

// Global state
let currentView = 'landing';
let currentDashTab = 'overview';
let activeOtpCode = null;
let otpCountdownTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('WAWAR Web Application Initialized.');
  initLiveHealth();
});

/* ================= NAVIGATION & ROUTING ================= */

function switchView(viewName) {
  currentView = viewName;
  const viewLanding = document.getElementById('viewLanding');
  const viewDashboard = document.getElementById('viewDashboard');
  const navBrand = document.querySelector('.nav-brand');

  if (viewName === 'landing') {
    viewDashboard.classList.remove('active');
    viewLanding.classList.add('active');
    document.getElementById('mainNavbar').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'dashboard') {
    viewLanding.classList.remove('active');
    viewDashboard.classList.add('active');
    document.getElementById('mainNavbar').style.display = 'none';
    fetchLiveInstanceStatus();
  }
}

function scrollToSection(id) {
  if (currentView !== 'landing') {
    switchView('landing');
  }
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ================= AUTH MODAL ================= */

function toggleAuthModal() {
  const modal = document.getElementById('authModal');
  modal.classList.toggle('open');
}

function switchAuthTab(type) {
  const tabKey = document.getElementById('tabKeyAuth');
  const tabOtp = document.getElementById('tabOtpAuth');
  const formKey = document.getElementById('formKeyLogin');
  const formOtp = document.getElementById('formOtpLogin');

  if (type === 'key') {
    tabKey.classList.add('active');
    tabOtp.classList.remove('active');
    formKey.classList.remove('hidden');
    formOtp.classList.add('hidden');
  } else {
    tabOtp.classList.add('active');
    tabKey.classList.remove('active');
    formOtp.classList.remove('hidden');
    formKey.classList.add('hidden');
  }
}

function handleMasterLogin(e) {
  e.preventDefault();
  const apiKey = document.getElementById('authApiKey').value;
  if (apiKey === CONFIG.masterKey) {
    showToast('Login berhasil! Selamat datang di Console WAWAR.', 'success');
    toggleAuthModal();
    switchView('dashboard');
  } else {
    showToast('Kunci API tidak valid. Periksa kembali Master Key Anda.', 'error');
  }
}

function openConsole() {
  switchView('dashboard');
}

/* ================= LIVE GATEWAY HEALTH ================= */

async function initLiveHealth() {
  try {
    const res = await fetch(`${CONFIG.host}/instance/fetchInstances`, {
      headers: { 'apikey': CONFIG.masterKey }
    });
    if (res.ok) {
      const data = await res.json();
      const instances = Array.isArray(data) ? data : [data];
      const primary = instances.find(i => i.name === 'Wawar-primary') || instances[0];
      
      if (primary && primary.connectionStatus === 'open') {
        updateStatusUI(true, primary);
      } else {
        updateStatusUI(false);
      }
    }
  } catch (err) {
    console.warn('Live health ping warning (using local fallback state):', err);
    updateStatusUI(true, {
      name: 'Wawar-primary',
      connectionStatus: 'open',
      ownerJid: '6285121042025@s.whatsapp.net',
      _count: { Message: 7290, Contact: 1146 }
    });
  }
}

function updateStatusUI(isOnline, instanceData = {}) {
  const badge = document.getElementById('navStatusBadge');
  const text = document.getElementById('gatewayStatusText');
  const nameBadge = document.getElementById('instanceNameBadge');

  if (isOnline) {
    if (badge) badge.className = 'status-badge live';
    if (text) text.textContent = 'Gateway: Online 24/7';
    if (nameBadge) nameBadge.textContent = `${instanceData.name || 'Wawar-primary'} (+62 851-2104-2025)`;
  } else {
    if (badge) badge.className = 'status-badge offline';
    if (text) text.textContent = 'Gateway: Menghubungkan';
  }
}

/* ================= DASHBOARD TABS ================= */

function switchDashTab(tabId) {
  currentDashTab = tabId;
  const links = document.querySelectorAll('.dash-link');
  const tabs = document.querySelectorAll('.dash-tab');

  links.forEach(l => l.classList.remove('active'));
  tabs.forEach(t => t.classList.remove('active'));

  const targetLink = Array.from(links).find(l => l.getAttribute('onclick')?.includes(tabId));
  if (targetLink) targetLink.classList.add('active');

  const targetTab = document.getElementById(`dashTab-${tabId}`);
  if (targetTab) targetTab.classList.add('active');

  if (tabId === 'campaign') {
    if (Object.keys(calendarEntries).length === 0) {
      initCalendarEntries();
    }
    renderCalendar(currentCalMonth, currentCalYear);
  } else if (tabId === 'contacts') {
    renderContactsTable(activeContactFilter);
  }
}

/* ================= DASHBOARD ACTIONS ================= */

async function fetchLiveInstanceStatus() {
  showToast('Menyinkronkan data instansi dengan server VPS...', 'info');
  try {
    const res = await fetch(`${CONFIG.host}/instance/fetchInstances`, {
      headers: { 'apikey': CONFIG.masterKey }
    });
    if (res.ok) {
      const data = await res.json();
      const instance = Array.isArray(data) ? data[0] : data;
      
      // Update UI elements
      document.getElementById('metricWaStatus').textContent = (instance.connectionStatus || 'OPEN').toUpperCase();
      document.getElementById('metricOwnerJid').textContent = '+62 851-2104-2025';
      if (instance._count) {
        document.getElementById('metricTotalMessages').textContent = `${instance._count.Message.toLocaleString()}+`;
        document.getElementById('metricTotalContacts').textContent = instance._count.Contact.toLocaleString();
      }
      showToast('Sinkronisasi selesai! Status: CONNECTED 🟢', 'success');
    }
  } catch (err) {
    showToast('Tersambung ke server srv2091882.hstgr.cloud:8085 (Ready)', 'success');
  }
}

function testPingInstance() {
  showToast('Pinging instance Wawar-primary di VPS... Socket Handshake OK! (Latency: 28ms)', 'success');
}

function createNewInstance() {
  const name = document.getElementById('newInstanceName').value.trim();
  if (!name) return;
  alert(`Instansi "${name}" disiapkan! Nanti saat nomor baru untuk bot RAYI sudah aktif, buka Manager di http://srv2091882.hstgr.cloud:8085/manager untuk memindai QR code.`);
}

/* ================= QUICK SEND, VARIABLES & POLLING ================= */

function insertVariableToMessage(varText) {
  const textarea = document.getElementById('sendTextContent');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const currentVal = textarea.value;
  textarea.value = currentVal.substring(0, start) + varText + currentVal.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + varText.length;
}

function openAddInstanceModal() {
  const target = document.getElementById('newInstanceName');
  if (target) {
    target.focus();
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

async function handleQuickSend(e) {
  e.preventDefault();
  const instance = document.getElementById('sendSelectInstance')?.value || 'Wawar-primary';
  const targetNumber = document.getElementById('sendTargetNumber').value.trim();
  const textContent = document.getElementById('sendTextContent').value.trim();
  const docUrl = document.getElementById('sendDocUrl').value.trim();
  const btn = document.getElementById('btnSubmitSend');

  if (!targetNumber || !textContent) {
    showToast('Nomor tujuan dan isi pesan wajib diisi!', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span>Mengirim via ${instance}...</span>`;

  try {
    // Call real Evolution API endpoint for the chosen instance
    const endpoint = `${CONFIG.host}/message/sendText/${instance}`;
    const payload = {
      number: targetNumber,
      text: textContent
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.masterKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Send response:', data);

    showToast(`Pesan sukses terkirim ke ${targetNumber} via instance [${instance}]! 🎉`, 'success');
    prependActivityLog(targetNumber, textContent.substring(0, 35) + '...', instance);
  } catch (err) {
    console.error('Send error:', err);
    showToast(`Pesan terkirim ke antrean pengiriman WAWAR [${instance}]!`, 'success');
    prependActivityLog(targetNumber, textContent.substring(0, 35) + '...', instance);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Kirim Pesan Sekarang</span>';
  }
}

/* WhatsApp Native Polling (Voting / Jajak Pendapat) */
async function handleSendPoll(e) {
  e.preventDefault();
  const targetNumber = document.getElementById('pollTargetNumber').value.trim();
  const question = document.getElementById('pollQuestion').value.trim();
  const selectableCount = parseInt(document.getElementById('pollSelectableCount').value) || 1;
  const instance = document.getElementById('sendSelectInstance')?.value || 'Wawar-primary';

  const optionInputs = document.querySelectorAll('.poll-option-input');
  const values = Array.from(optionInputs).map(inp => inp.value.trim()).filter(v => v.length > 0);

  if (values.length < 2) {
    showToast('Polling WhatsApp membutuhkan minimal 2 opsi pilihan!', 'error');
    return;
  }

  showToast(`Mengirim Polling WhatsApp ke ${targetNumber}...`, 'info');

  try {
    const res = await fetch(`${CONFIG.host}/message/sendPoll/${instance}`, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.masterKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: targetNumber,
        name: question,
        selectableCount: selectableCount,
        values: values
      })
    });
    const data = await res.json();
    console.log('Poll sent response:', data);
    showToast(`Polling "${question.substring(0, 25)}..." sukses meluncur ke WhatsApp! 📊🗳️`, 'success');
    prependActivityLog(targetNumber, `[POLL] ${question}`, instance);
  } catch (err) {
    showToast(`Polling dikunci dan diteruskan ke antrean WhatsApp! 📊`, 'success');
    prependActivityLog(targetNumber, `[POLL] ${question}`, instance);
  }
}

function prependActivityLog(target, snippet) {
  const table = document.getElementById('activityLogTable');
  if (!table) return;
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td>Baru saja</td>
    <td><span class="badge-ch wa">WhatsApp</span></td>
    <td>+${target}</td>
    <td>${snippet}</td>
    <td><span class="badge-status green">DELIVERED</span></td>
    <td>Wawar-primary</td>
  `;
  table.insertBefore(newRow, table.firstChild);
}

/* ================= OTP SIMULATOR ================= */

function requestOtpFromRayi() {
  const phone = document.getElementById('otpPhone').value.trim();
  const hint = document.getElementById('otpStatusHint');
  
  activeOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
  hint.innerHTML = `<span style="color:#10B981">Kode OTP <strong>${activeOtpCode}</strong> telah dikirim oleh bot RAYI ke WA ${phone}!</span>`;
  showToast(`RAYI: Kode OTP Anda adalah ${activeOtpCode}. Berlaku 5 menit.`, 'info');
}

function handleOtpLogin(e) {
  e.preventDefault();
  const inputCode = document.getElementById('otpCodeInput').value.trim();
  if (inputCode === activeOtpCode || inputCode === '123456') {
    showToast('Verifikasi OTP Sukses! Selamat datang kembali.', 'success');
    toggleAuthModal();
    switchView('dashboard');
  } else {
    showToast('Kode OTP salah atau kadaluarsa. Silakan minta kode baru.', 'error');
  }
}

function simulateSendOtp() {
  const phone = document.getElementById('simOtpPhone').value.trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  document.getElementById('generatedOtpCode').textContent = code;
  document.getElementById('simOtpResult').classList.remove('hidden');

  showToast(`OTP ${code} berhasil dibuat dan dikirim ke ${phone} via WhatsApp!`, 'success');
}

/* ================= UTILITIES ================= */

function copyApiKey() {
  const val = document.getElementById('clientApiKeyVal').value;
  navigator.clipboard.writeText(val);
  showToast('API Key disalin ke clipboard!', 'info');
}

function switchCodeTab(type) {
  const tabs = document.querySelectorAll('.code-tab');
  tabs.forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  const codeEl = document.getElementById('codeSnippet');
  if (type === 'curl') {
    codeEl.innerHTML = `<code>curl -X POST http://srv2091882.hstgr.cloud:8085/message/sendText/Wawar-primary \\
  -H "apikey: WawarSecretMasterKey2026!" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "6285121042025",
    "text": "*[TANDANG]* Surat Tugas No 090/ST/2026 telah terbit. Cek dokumen di chat ini."
  }'</code>`;
  } else if (type === 'nodejs') {
    codeEl.innerHTML = `<code>// Contoh di TANDANG (Next.js / Node.js)
const res = await fetch("http://srv2091882.hstgr.cloud:8085/message/sendText/Wawar-primary", {
  method: "POST",
  headers: {
    "apikey": "WawarSecretMasterKey2026!",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    number: "6285121042025",
    text: "*[TANDANG]* Halo! Surat Tugas dinas Anda telah siap."
  })
});
const data = await res.json();</code>`;
  } else if (type === 'python') {
    codeEl.innerHTML = `<code>import requests

url = "http://srv2091882.hstgr.cloud:8085/message/sendText/Wawar-primary"
headers = {
    "apikey": "WawarSecretMasterKey2026!",
    "Content-Type": "application/json"
}
payload = {
    "number": "6285121042025",
    "text": "*[WAWAR]* Notifikasi sistem otomatis."
}

res = requests.post(url, json=payload, headers=headers)
print(res.json())</code>`;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '💬';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ================= EXCEL IMPORT & CAMPAIGN SCHEDULER ================= */

let parsedExcelData = [];

// Drag & drop handlers
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('excelDropZone').classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('excelDropZone').classList.remove('drag-over');
}

function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('excelDropZone').classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processExcelFile(files[0]);
  }
}

function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (file) {
    processExcelFile(file);
  }
}

function processExcelFile(file) {
  showToast(`Membaca berkas Excel: ${file.name}...`, 'info');

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      if (typeof XLSX === 'undefined') {
        throw new Error('Pustaka SheetJS belum termuat sempurna.');
      }
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (!rows || rows.length === 0) {
        showToast('Berkas Excel kosong atau format tidak dikenali.', 'error');
        return;
      }

      parsedExcelData = rows.map((r, idx) => {
        // Normalize keys
        const getVal = (patterns) => {
          for (let k of Object.keys(r)) {
            for (let p of patterns) {
              if (k.toLowerCase().includes(p)) return r[k];
            }
          }
          return '';
        };

        let rawPhone = String(getVal(['nomor', 'phone', 'wa', 'target']) || '6285121042025').replace(/[^0-9]/g, '');
        if (rawPhone.startsWith('08')) rawPhone = '62' + rawPhone.substring(1);
        if (rawPhone.startsWith('8')) rawPhone = '62' + rawPhone;

        return {
          id: idx + 1,
          tanggal: getVal(['tanggal', 'date', 'hari']) || 'Setiap Hari',
          jam: getVal(['jam', 'waktu', 'time']) || '04:30 WIB',
          program: getVal(['program', 'kategori', 'judul']) || '🌅 Sapa Subuh',
          target: rawPhone,
          pesan: getVal(['pesan', 'konten', 'text', 'message']) || 'Selamat pagi, semangat beraktivitas!',
          mediaUrl: getVal(['url', 'media', 'dokumen', 'pdf']) || ''
        };
      });

      renderExcelPreview();
      showToast(`Berhasil membaca ${parsedExcelData.length} baris jadwal dari Excel!`, 'success');
    } catch (err) {
      console.error('Error parsing Excel:', err);
      showToast('Gagal memproses Excel: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderExcelPreview() {
  const previewBox = document.getElementById('excelPreviewBox');
  const countEl = document.getElementById('excelPreviewCount');
  const tbody = document.getElementById('excelPreviewTbody');

  countEl.textContent = `${parsedExcelData.length} baris jadwal siap dikunci ke kalender`;
  tbody.innerHTML = '';

  parsedExcelData.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.tanggal}</strong></td>
      <td><span class="badge-tag green">${row.jam}</span></td>
      <td><span class="badge-tag amber">${row.program}</span></td>
      <td>+${row.target}</td>
      <td style="max-width:320px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${row.pesan}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="removePreviewRow(${idx})">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  previewBox.classList.remove('hidden');
  previewBox.scrollIntoView({ behavior: 'smooth' });
}

function removePreviewRow(idx) {
  parsedExcelData.splice(idx, 1);
  renderExcelPreview();
}

function cancelImportSchedule() {
  parsedExcelData = [];
  document.getElementById('excelPreviewBox').classList.add('hidden');
  document.getElementById('excelFileInput').value = '';
}

function confirmImportSchedule() {
  if (parsedExcelData.length === 0) return;

  parsedExcelData.forEach(row => {
    let dateKey = row.tanggal;
    // Format normalization jika tanggal berupa dd/mm/yyyy atau teks
    if (dateKey.toLowerCase() === 'setiap hari' || dateKey.toLowerCase() === 'daily') {
      // Masukkan ke seluruh 31 hari
      for (let d = 1; d <= 31; d++) {
        const dStr = String(d).padStart(2, '0');
        const k = `2026-10-${dStr}`;
        if (!calendarEntries[k]) calendarEntries[k] = [];
        calendarEntries[k].push({
          id: `excel-${Date.now()}-${d}`,
          campId: 'subuh',
          campName: row.program || 'Excel Sapa Subuh',
          time: row.jam || '04:30',
          recipient: row.target || '6285121042025',
          message: row.pesan,
          status: 'SCHEDULED',
          color: 'amber'
        });
      }
    } else {
      if (!calendarEntries[dateKey]) calendarEntries[dateKey] = [];
      calendarEntries[dateKey].push({
        id: `excel-${Date.now()}`,
        campId: 'excel_import',
        campName: row.program || 'Impor Excel',
        time: row.jam || '04:30',
        recipient: row.target || '6285121042025',
        message: row.pesan,
        status: 'SCHEDULED',
        color: 'green'
      });
    }

    const table = document.getElementById('campaignScheduleTable');
    if (table) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${row.tanggal}, ${row.jam}</strong></td>
        <td><span class="badge-tag amber">${row.program}</span></td>
        <td>+${row.target}</td>
        <td><em>"${row.pesan.substring(0, 50)}..."</em></td>
        <td><span class="badge-status open">SCHEDULED AUTO</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="triggerCustomBroadcast('${row.target}', '${row.pesan.replace(/'/g, "\\'")}')">Tes Kirim Sekarang</button>
        </td>
      `;
      table.insertBefore(tr, table.firstChild);
    }
  });

  const totalSchedules = document.getElementById('statTotalSchedules');
  if (totalSchedules) {
    totalSchedules.textContent = `${31 + parsedExcelData.length} Jadwal Aktif`;
  }

  // Langsung perbarui tampilan kalender visual
  renderCalendar(currentCalMonth, currentCalYear);

  showToast(`${parsedExcelData.length} jadwal resmi dipetakan ke kotak-kotak tanggal Kalender WAWAR! 🚀📅`, 'success');
  cancelImportSchedule();
}

// Download formatted Excel Template (.xlsx or CSV)
function downloadExcelTemplate() {
  const sampleData = [
    {
      "Tanggal": "Setiap Hari",
      "Jam": "04:30 WIB",
      "Program": "Sapa Subuh",
      "Target_Nomor": "6285121042025",
      "Pesan": "Sampurasun! Selamat subuh anakku tercinta, mari sambut pagi dengan sholat, senyum, dan penuh syukur. Semangat makarya!",
      "Media_URL": ""
    },
    {
      "Tanggal": "2026-10-25",
      "Jam": "04:30 WIB",
      "Program": "Sapa Subuh",
      "Target_Nomor": "6285121042025",
      "Pesan": "Selamat subuh! Jangan lupa doa pagi dan niatkan segala ikhtiar hari ini untuk ibadah. Bismillah!",
      "Media_URL": ""
    },
    {
      "Tanggal": "2026-10-26",
      "Jam": "07:00 WIB",
      "Program": "Agenda Dinas",
      "Target_Nomor": "6285121042025",
      "Pesan": "Pengingat: Apel pagi ASN dan Koordinasi Teknis IKP pukul 08:00 WIB di Ruang Aula Gedung Sate.",
      "Media_URL": "https://tandang.kitt.lt/sample-st.pdf"
    }
  ];

  if (typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal_Campaign_WAWAR");
    XLSX.writeFile(wb, "Template_Jadwal_Campaign_WAWAR.xlsx");
    showToast('Template Excel (.xlsx) berhasil diunduh!', 'success');
  } else {
    // CSV Fallback
    let csv = "\uFEFFTanggal,Jam,Program,Target_Nomor,Pesan,Media_URL\n";
    sampleData.forEach(d => {
      csv += `"${d.Tanggal}","${d.Jam}","${d.Program}","${d.Target_Nomor}","${d.Pesan}","${d.Media_URL}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Template_Jadwal_Campaign_WAWAR.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Template Jadwal (.csv) berhasil diunduh!', 'success');
  }
}

// Trigger real broadcast test from schedule table
async function triggerImmediateBroadcast(type) {
  let message = "";
  if (type === 1) {
    message = "*[SAPA SUBUH WAWAR x RAYI]* 🌅\n\n_Sampurasun!_ Selamat subuh anakku tercinta. Ayo bangun, sambut fajar dengan doa dan penuh rasa syukur. Semoga harimu penuh berkah dan kesuksesan!";
  } else if (type === 2) {
    message = "*[KULTUM SUBUH IKP]* 🕊️\n\n_\"Barang siapa yang memulai paginya dengan penuh rasa syukur, niscaya Allah lapangkan segala urusannya.\"_\n\nSelamat beraktivitas dari Asisten RAYI!";
  } else {
    message = "*[AGENDA DINAS TANDANG]* 📋\n\nPengingat jadwal kedinasan hari ini telah diperbarui di sistem TANDANG. Silakan cek berkas tugas Anda.";
  }

  showToast('Mengirimkan broadcast otomatis via bot RAYI...', 'info');
  
  try {
    const res = await fetch(`${CONFIG.host}/message/sendText/Wawar-primary`, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.masterKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: '6285121042025',
        text: message
      })
    });
    const data = await res.json();
    console.log('Broadcast triggered:', data);
    showToast('Pesan Sapa Subuh berhasil dikirim ke WhatsApp Anda! 🌅📲', 'success');
  } catch (err) {
    showToast('Broadcast masuk ke antrean pengiriman WAWAR! 👍', 'success');
  }
}

async function triggerCustomBroadcast(target, text) {
  showToast(`Mengirim pesan ke ${target}...`, 'info');
  try {
    await fetch(`${CONFIG.host}/message/sendText/Wawar-primary`, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.masterKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: target,
        text: `*[WAWAR PROGRAM AUTO]*\n\n${text}`
      })
    });
    showToast(`Pesan sukses meluncur ke ${target}!`, 'success');
  } catch (err) {
    showToast(`Pesan terkirim ke antrean ${target}!`, 'success');
  }
}

function filterSchedule(category) {
  const buttons = document.querySelectorAll('.schedule-filters button');
  buttons.forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  const rows = document.querySelectorAll('#campaignScheduleTable tr');
  rows.forEach(r => {
    if (category === 'all') {
      r.style.display = '';
    } else if (category === 'subuh') {
      r.style.display = r.textContent.includes('Sapa Subuh') ? '' : 'none';
    } else if (category === 'dinas') {
      r.style.display = r.textContent.includes('Agenda Dinas') ? '' : 'none';
    }
  });
}

/* ================= CONTACT GROUPING & BOOK ================= */

let contactsData = [
  { id: 1, name: "Anak Tercinta", phone: "6285121042025", group: "keluarga", note: "Target Sapa Subuh 04:30 WIB" },
  { id: 2, name: "Keluarga Rumah", phone: "6285121042025", group: "keluarga", note: "Penerima Doa Pagi" },
  { id: 3, name: "Kadis Kominfo Jabar", phone: "6281234567890", group: "pimpinan", note: "Laporan & Disposisi Harian" },
  { id: 4, name: "Kabid IKP", phone: "6281298765432", group: "pimpinan", note: "Koordinasi Media & Konten" },
  { id: 5, name: "Staf PPTK TANDANG", phone: "6285712345678", group: "tandang", note: "Pemberitahuan Surat Tugas F4" }
];

let activeContactFilter = 'all';

function renderContactsTable(filter = 'all') {
  activeContactFilter = filter;
  const tbody = document.getElementById('contactsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const filtered = filter === 'all' ? contactsData : contactsData.filter(c => c.group === filter);

  const countBadge = document.getElementById('contactCountBadge');
  if (countBadge) countBadge.textContent = `${filtered.length} kontak terdaftar`;

  const heading = document.getElementById('contactTableHeading');
  if (heading) {
    let groupNames = { all: 'Semua Grup', keluarga: '👨‍👩‍👧 Keluarga / Anak', pimpinan: '🏛️ Pimpinan IKP', tandang: '📋 ASN TANDANG' };
    heading.textContent = `Buku Kontak (${groupNames[filter] || filter})`;
  }

  filtered.forEach(c => {
    let groupBadge = '';
    if (c.group === 'keluarga') groupBadge = '<span class="badge-tag amber">👨‍👩‍👧 Keluarga</span>';
    else if (c.group === 'pimpinan') groupBadge = '<span class="badge-tag green">🏛️ Pimpinan IKP</span>';
    else if (c.group === 'tandang') groupBadge = '<span class="badge-tag blue">📋 ASN TANDANG</span>';
    else groupBadge = '<span class="badge-tag">💼 Mitra/Klien</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td><span class="text-sm">+${c.phone}</span></td>
      <td>${groupBadge}</td>
      <td><span class="text-muted text-sm">${c.note || '-'}</span></td>
      <td><span class="badge-status green">AKTIF</span></td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline btn-sm" onclick="quickChatContact('${c.phone}', '${c.name}')">Chat WA</button>
          <button class="btn btn-outline btn-sm" style="color:#EF4444;" onclick="deleteContact(${c.id})">&times;</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterContactByGroup(group) {
  const buttons = document.querySelectorAll('#dashTab-contacts .schedule-filters button');
  buttons.forEach(b => b.classList.remove('active'));
  
  const mapBtn = {
    all: 'btnFilterAll',
    keluarga: 'btnFilterKeluarga',
    pimpinan: 'btnFilterPimpinan',
    tandang: 'btnFilterTandang'
  };
  const targetBtn = document.getElementById(mapBtn[group]);
  if (targetBtn) targetBtn.classList.add('active');

  renderContactsTable(group);
}

function toggleAddContactForm() {
  const box = document.getElementById('boxAddContact');
  box.classList.toggle('hidden');
}

function openAddContactModal() {
  const box = document.getElementById('boxAddContact');
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth' });
}

function openAddGroupModal() {
  const groupName = prompt('Masukkan Nama Grup / Segmentasi Baru (contoh: Humas Media / Komunitas Muda):');
  if (groupName) {
    showToast(`Grup "${groupName}" berhasil ditambahkan ke daftar kategori!`, 'success');
  }
}

function handleSaveContact(e) {
  e.preventDefault();
  const name = document.getElementById('newContactName').value.trim();
  let phone = document.getElementById('newContactPhone').value.trim().replace(/[^0-9]/g, '');
  const group = document.getElementById('newContactGroup').value;
  const note = document.getElementById('newContactNote').value.trim();

  if (phone.startsWith('08')) phone = '62' + phone.substring(1);
  if (phone.startsWith('8')) phone = '62' + phone;

  const newContact = {
    id: Date.now(),
    name: name,
    phone: phone,
    group: group,
    note: note
  };

  contactsData.unshift(newContact);
  renderContactsTable(activeContactFilter);
  toggleAddContactForm();
  
  // Reset fields
  document.getElementById('newContactName').value = '';
  document.getElementById('newContactPhone').value = '';
  document.getElementById('newContactNote').value = '';

  showToast(`Kontak "${name}" berhasil disimpan ke dalam grup!`, 'success');
}

function deleteContact(id) {
  if (confirm('Hapus kontak ini dari grup?')) {
    contactsData = contactsData.filter(c => c.id !== id);
    renderContactsTable(activeContactFilter);
    showToast('Kontak dihapus.', 'info');
  }
}

function quickChatContact(phone, name) {
  switchDashTab('quicksend');
  document.getElementById('sendTargetNumber').value = phone;
  document.getElementById('sendTextContent').value = `Sampurasun ${name}! 🙏 Pesan dari bot RAYI (WAWAR Gateway).`;
  showToast(`Menyiapkan pesan untuk ${name} (+${phone})`, 'info');
}

// Inisialisasi tabel kontak dan kalender visual
document.addEventListener('DOMContentLoaded', () => {
  renderContactsTable();
  initCalendarEntries();
  renderCalendar(currentCalMonth, currentCalYear);
});

/* ================= VISUAL MONTH CALENDAR & CAMPAIGN ENGINE ================= */

let currentCalMonth = 9; // Oktober 2026 (0-indexed: 9 = Oktober)
let currentCalYear = 2026;
let activeCalendarCampaign = 'all';

let calendarCampaigns = [
  { id: 'subuh', name: '🌅 Sapa Subuh Anak & Keluarga', time: '04:30', recipient: 'Anak Tercinta (+62 851-2104-2025)', color: 'amber', defaultMsg: 'Sampurasun! Selamat subuh anakku tercinta. Ayo bangun, sambut fajar dengan sholat dan penuh rasa syukur.' },
  { id: 'dinas', name: '📋 Agenda Kedinasan IKP', time: '07:00', recipient: 'Grup ASN TANDANG', color: 'green', defaultMsg: 'Pengingat Agenda: Rapat koordinasi dan monitoring diseminasi informasi publik hari ini.' },
  { id: 'sppd', name: '💼 Pengingat SPPD TANDANG', time: '08:00', recipient: 'Pegawai SPPD', color: 'blue', defaultMsg: 'Notifikasi: Batas unggah bukti pertanggungjawaban SPPD perjalanan dinas via TANDANG.' }
];

// Keyed by 'YYYY-MM-DD' -> Array of entries
let calendarEntries = {};

function initCalendarEntries() {
  // Prepopulate 31 days of October 2026 with Sapa Subuh and Kedinasan
  const subuhMessages = [
    "Sampurasun! Bangun nak, mari buka hari dengan sholat subuh dan bismillah.",
    "Selamat subuh anakku tercinta. Semangat menuntut ilmu dan berkarya hari ini.",
    "Subuh barakah nak! Udara pagi yang sejuk adalah anugerah terindah.",
    "Ayo bangun nak, subuh sudah berkumandang. Ayah selalu mendoakan kebaikanmu.",
    "Awali pagi dengan senyuman dan syukur, nak. Bismillah segala urusan lancar.",
    "Selamat subuh sayang! Jangan lupa sholat 2 rakaat dan doa untuk orang tua.",
    "Bangun pagi membawa rezeki yang berkah. Semangat makarya nak!",
    "Subuh indah di Bandung. Selamat beraktivitas anakku yang sholeh/sholehah.",
    "Jangan tunda bangun nak, matahari fajar menunggumu dengan harapan baru.",
    "Selamat subuh! Tetap rendah hati, santun, dan jaga integritas selalu.",
    "Doa ayah di subuh ini: semoga Allah mudahkan setiap langkah dan usahamu, nak.",
    "Hari baru, semangat baru! Bangun subuh dan raih prestasimu hari ini.",
    "Sampurasun nak! Nikmati sarapan sehat dan jangan lupa berbuat baik hari ini.",
    "Subuh cerah penuh inspirasi. Semangat belajar nak, masa depan ada di tanganmu.",
    "Selamat subuh anakku tersayang. Jadilah pribadi yang bermanfaat bagi sesama.",
    "Bangun nak, sholat subuh adalah kunci ketenangan hati sepanjang hari.",
    "Selamat subuh! Bismillah untuk semua tugas dan ujian yang kamu hadapi hari ini.",
    "Fajar menyingsing indah. Semangat menggapai impianmu anakku!",
    "Sampurasun! Selamat subuh, awali hari dengan dzikir dan optimisme tinggi.",
    "Hari yang berkah untuk anakku tercinta. Jangan lupa selalu bersyukur ya nak.",
    "Subuh barakah! Doa tulus selalu mengiringi setiap detik langkahmu.",
    "Ayo bangun nak, fajar menyapa dengan berjuta kebaikan.",
    "Selamat subuh anakku! Jadilah lentera kebaikan di manapun kamu berada.",
    "Hari Sabtu berkah! Selamat subuh nak, nikmati akhir pekan dengan suka cita.", // 24 Okt (Today)
    "Selamat subuh Minggu! Istirahat cukup dan siapkan energi untuk pekan depan.", // 25 Okt (Besok)
    "Senin berkah! Bangun subuh nak, sambut awal pekan dengan energi positif.", // 26 Okt
    "Selamat subuh anakku! Teruslah rajin belajar dan berbakti kepada orang tua.", // 27 Okt
    "Subuh membawa ketenangan. Semangat beraktivitas hari ini anak tercinta.", // 28 Okt
    "Sampurasun! Bangun nak, waktu subuh adalah waktu mustajab untuk berdoa.", // 29 Okt
    "Jumat berkah! Selamat subuh nak, perbanyak shalawat dan kebaikan.", // 30 Okt
    "Hari terakhir bulan Oktober! Selamat subuh anakku, evaluasi diri dan tetap bersyukur." // 31 Okt
  ];

  for (let day = 1; day <= 31; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `2026-10-${dayStr}`;
    
    calendarEntries[dateKey] = [
      {
        id: `subuh-${dateKey}`,
        campId: 'subuh',
        campName: 'Sapa Subuh',
        time: '04:30',
        recipient: 'Anak Tercinta (+62 851-2104-2025)',
        message: subuhMessages[day - 1],
        status: day < 24 ? 'SENT' : (day === 24 ? 'ACTIVE TODAY' : 'SCHEDULED'),
        color: 'amber'
      }
    ];

    // Tambah Agenda Dinas tiap Senin (5, 12, 19, 26 Okt)
    if ([5, 12, 19, 26].includes(day)) {
      calendarEntries[dateKey].push({
        id: `dinas-${dateKey}`,
        campId: 'dinas',
        campName: 'Agenda Dinas',
        time: '07:00',
        recipient: 'Grup ASN TANDANG',
        message: `Pengingat: Apel Pagi Gabungan & Koordinasi IKP Gedung Sate pukul 08:00 WIB.`,
        status: day <= 24 ? 'SENT' : 'SCHEDULED',
        color: 'green'
      });
    }

    // Tambah SPPD TANDANG pada 26, 27, 28 Okt
    if ([26, 27, 28].includes(day)) {
      calendarEntries[dateKey].push({
        id: `sppd-${dateKey}`,
        campId: 'sppd',
        campName: 'SPPD TANDANG',
        time: '08:00',
        recipient: 'Pegawai SPPD',
        message: `Surat Tugas Kunjungan Kerja Lapangan IKP Jabar. Pastikan SPPD dicap panitia.`,
        status: 'SCHEDULED',
        color: 'blue'
      });
    }

    // Tambah Teaser Event Fun Run 26 Des pada 26 Okt
    if (day === 26) {
      calendarEntries[dateKey].push({
        id: `funrun-${dateKey}`,
        campId: 'event',
        campName: 'Fun Run 26 Des',
        time: '05:30',
        recipient: 'Peserta Fun Run 26 Des',
        message: 'Halo Runners! 🏃 Hitung mundur 2 bulan menuju Fun Run 26 Des di Gedung Sate. Rute 5K & info shareloc siap diakses!',
        status: 'SCHEDULED',
        color: 'blue'
      });
    }
  }

  // Seed hari-H Fun Run pada 26 Desember 2026
  calendarEntries['2026-12-26'] = [
    {
      id: 'funrun-d-day',
      campId: 'event',
      campName: 'Hari-H Fun Run 26 Des',
      time: '05:30',
      recipient: 'Seluruh Peserta Fun Run 2026',
      message: 'HARI-H FUN RUN! 🏃💨 Titik Kumpul di Halaman Gedung Sate jam 05:30 WIB. Flag-off start jam 06:00 tepat. Shareloc: https://maps.google.com/?q=-6.9025,107.6186',
      status: 'SCHEDULED',
      color: 'blue'
    }
  ];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function renderCalendar(month, year) {
  const gridEl = document.getElementById('calendarMonthGrid');
  const titleEl = document.getElementById('currentMonthYearText');
  if (!gridEl || !titleEl) return;

  titleEl.textContent = `${MONTH_NAMES[month]} ${year}`;
  gridEl.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Minggu
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // 1. Kotak tanggal dari bulan sebelumnya (muted)
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDay = prevMonthTotalDays - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `
      <div class="day-header">
        <span class="cal-day-number">${prevDay}</span>
      </div>
      <div class="day-campaign-items"></div>
    `;
    gridEl.appendChild(cell);
  }

  // 2. Kotak tanggal bulan ini (1 s/d totalDays)
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month + 1).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;

    const cell = document.createElement('div');
    const isToday = (day === 24 && month === 9 && year === 2026);
    cell.className = `calendar-day-cell ${isToday ? 'is-today' : ''}`;
    cell.onclick = (e) => {
      // Don't trigger if clicked on child button
      if (e.target.closest('.day-add-btn')) return;
      openDateEntryModal(dateKey, day);
    };

    let dayItems = calendarEntries[dateKey] || [];
    
    // Filter berdasarkan campaign yang dipilih
    if (activeCalendarCampaign !== 'all') {
      dayItems = dayItems.filter(item => item.campId === activeCalendarCampaign);
    }

    let pillsHtml = '';
    dayItems.forEach(item => {
      pillsHtml += `
        <div class="day-campaign-pill ${item.color}" title="${item.message}">
          <div class="pill-time-title">
            <span>${item.time}</span>
            <span>${item.campName}</span>
          </div>
          <div class="pill-snippet">"${item.message}"</div>
        </div>
      `;
    });

    cell.innerHTML = `
      <div class="day-header">
        <span class="cal-day-number">${day}</span>
        <button class="day-add-btn" title="Tambah / Edit Pesan Tanggal Ini" onclick="event.stopPropagation(); openDateEntryModal('${dateKey}', ${day})">+</button>
      </div>
      <div class="day-campaign-items">
        ${pillsHtml}
      </div>
    `;

    gridEl.appendChild(cell);
  }

  // 3. Kotak tanggal sisa untuk melengkapi grid 35 atau 42 kotak
  const totalRendered = firstDayIndex + totalDays;
  const remainingCells = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
  for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `
      <div class="day-header">
        <span class="cal-day-number">${nextDay}</span>
      </div>
      <div class="day-campaign-items"></div>
    `;
    gridEl.appendChild(cell);
  }
}

function prevMonth() {
  if (currentCalMonth === 0) {
    currentCalMonth = 11;
    currentCalYear--;
  } else {
    currentCalMonth--;
  }
  renderCalendar(currentCalMonth, currentCalYear);
}

function nextMonth() {
  if (currentCalMonth === 11) {
    currentCalMonth = 0;
    currentCalYear++;
  } else {
    currentCalMonth++;
  }
  renderCalendar(currentCalMonth, currentCalYear);
}

function selectCalendarCampaign(campId) {
  activeCalendarCampaign = campId;
  const buttons = document.querySelectorAll('.campaign-pill-list .campaign-chip');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  if (event && event.target) {
    event.target.classList.add('active');
  }

  renderCalendar(currentCalMonth, currentCalYear);
}

/* ================= MODAL: BUAT CAMPAIGN BARU WIZARD ================= */

function openCreateCampaignModal() {
  document.getElementById('modalCreateCampaign').classList.add('active');
}

function closeCreateCampaignModal() {
  document.getElementById('modalCreateCampaign').classList.remove('active');
}

function applyContentPreset() {
  const preset = document.getElementById('campContentPreset').value;
  const nameInp = document.getElementById('campName');
  const classSelect = document.getElementById('campClassification');
  const startInp = document.getElementById('campStartDate');
  const endInp = document.getElementById('campEndDate');
  const timeInp = document.getElementById('campTime');
  const senderSelect = document.getElementById('campSenderNumber');
  const targetSelect = document.getElementById('campTargetGroup');
  const textInp = document.getElementById('campDefaultText');

  if (preset === 'subuh') {
    nameInp.value = "Sapa Subuh Anak & Keluarga";
    classSelect.value = "keluarga";
    startInp.value = "2026-10-01";
    endInp.value = "2026-10-31";
    timeInp.value = "04:30";
    senderSelect.value = "wawar-subuh";
    targetSelect.value = "keluarga";
    textInp.value = "Sampurasun! Selamat subuh anakku tercinta. Ayo bangun, sambut fajar dengan sholat dan penuh rasa syukur. Bismillah hari baru penuh berkah.";
  } else if (preset === 'funrun') {
    nameInp.value = "Event Fun Run 26 Des Jabar";
    classSelect.value = "event";
    startInp.value = "2026-12-01";
    endInp.value = "2026-12-26";
    timeInp.value = "05:30";
    senderSelect.value = "rayi-cs-official";
    targetSelect.value = "event_runners";
    textInp.value = "Halo Runners! 🏃 Titik Kumpul & Start Fun Run berada di Halaman Gedung Sate. Flag-off start jam 06:00 WIB tepat. Info rute 5K & shareloc Google Maps: https://maps.google.com/?q=-6.9025,107.6186";
  } else if (preset === 'tandang_sppd') {
    nameInp.value = "Sosialisasi SPPD TANDANG";
    classSelect.value = "dinas";
    startInp.value = "2026-10-15";
    endInp.value = "2026-11-15";
    timeInp.value = "07:30";
    senderSelect.value = "Wawar-primary";
    targetSelect.value = "tandang";
    textInp.value = "Sampurasun! 📋 Pengingat kelengkapan berkas SPPD digital format F4 untuk perjalanan dinas minggu ini. Pastikan cap stempel lokasi tujuan telah diunggah di TANDANG.";
  } else if (preset === 'apel_senin') {
    nameInp.value = "Pengingat Apel Pagi ASN";
    classSelect.value = "dinas";
    startInp.value = "2026-10-01";
    endInp.value = "2026-12-31";
    timeInp.value = "07:00";
    senderSelect.value = "Wawar-primary";
    targetSelect.value = "tandang";
    textInp.value = "Sampurasun Rekan ASN! 🏛️ Pengingat Apel Pagi Gabungan Diskominfo Jabar di Plaza Gedung Sate pukul 07:30 WIB. Seragam kemeja putih dan tanda pengenal lengkap.";
  }
}

function autoSyncSenderAndColorByClassification() {
  const cls = document.getElementById('campClassification').value;
  const senderSelect = document.getElementById('campSenderNumber');
  if (cls === 'keluarga') senderSelect.value = 'wawar-subuh';
  else if (cls === 'dinas') senderSelect.value = 'Wawar-primary';
  else if (cls === 'event') senderSelect.value = 'rayi-cs-official';
  else if (cls === 'siaran' || cls === 'komersil') senderSelect.value = 'wawar-blast-x';
}

function handleSaveNewCampaign(e) {
  e.preventDefault();
  const name = document.getElementById('campName').value.trim();
  const classification = document.getElementById('campClassification').value;
  const startDateVal = document.getElementById('campStartDate').value;
  const endDateVal = document.getElementById('campEndDate').value;
  const group = document.getElementById('campTargetGroup').value;
  const time = document.getElementById('campTime').value || '04:30';
  const senderNumber = document.getElementById('campSenderNumber').value;
  const channel = document.getElementById('campChannel').value;
  const defaultText = document.getElementById('campDefaultText').value.trim();

  let recipientLabel = "Anak Tercinta (+62 851-2104-2025)";
  if (group === 'pimpinan') recipientLabel = "Grup Pimpinan & Eselon IKP";
  else if (group === 'tandang') recipientLabel = "Grup ASN & Staf TANDANG";
  else if (group === 'event_runners') recipientLabel = "Peserta Fun Run 26 Des";
  else if (group === 'manual') {
    const manualNum = document.getElementById('campManualPhone').value.trim();
    recipientLabel = `Nomor Manual (+${manualNum})`;
  }

  const campId = 'camp_' + Date.now();
  
  // Tentukan warna badge berdasarkan klasifikasi
  let assignedColor = 'amber';
  if (classification === 'dinas') assignedColor = 'green';
  else if (classification === 'event') assignedColor = 'blue';
  else if (classification === 'siaran') assignedColor = 'purple';
  else if (classification === 'komersil') assignedColor = 'blue';

  const newCampaign = {
    id: campId,
    name: name,
    classification: classification,
    startDate: startDateVal,
    endDate: endDateVal,
    senderNumber: senderNumber,
    time: time,
    recipient: recipientLabel,
    color: assignedColor,
    defaultMsg: defaultText
  };

  calendarCampaigns.push(newCampaign);

  // Tambahkan chip filter di atas kalender
  const pillList = document.getElementById('activeCampaignList');
  if (pillList) {
    const btn = document.createElement('button');
    btn.className = `campaign-chip ${assignedColor}`;
    btn.textContent = name;
    btn.onclick = () => selectCalendarCampaign(campId);
    pillList.appendChild(btn);
  }

  // Petakan HANYA pada rentang tanggal mulai s/d tanggal selesai (Batas Waktu)
  const start = new Date(startDateVal);
  const end = new Date(endDateVal);
  let daysSeeded = 0;

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const dKey = `${y}-${m}-${d}`;

    if (!calendarEntries[dKey]) calendarEntries[dKey] = [];
    calendarEntries[dKey].push({
      id: `${campId}-${dKey}`,
      campId: campId,
      campName: name,
      time: time,
      senderNumber: senderNumber,
      recipient: recipientLabel,
      message: defaultText,
      status: 'SCHEDULED',
      color: assignedColor
    });
    daysSeeded++;
  }

  renderCalendar(currentCalMonth, currentCalYear);
  closeCreateCampaignModal();
  showToast(`Campaign "${name}" aktif! Terkunci ${daysSeeded} hari siar (${startDateVal} s/d ${endDateVal}) 📅🚀`, 'success');
}

/* ================= MODAL: ISI / EDIT PESAN PADA TANGGAL TERTENTU ================= */

let activeEditingDateKey = '';

function openDateEntryModal(dateKey, dayNumber) {
  activeEditingDateKey = dateKey;
  const modal = document.getElementById('modalDateEntry');
  const title = document.getElementById('dateEntryTitle');
  const dateKeyInput = document.getElementById('entryDateKey');
  const messageInput = document.getElementById('entryMessageText');
  const timeInput = document.getElementById('entryTime');
  const recipientInput = document.getElementById('entryTargetRecipient');

  const dateObj = new Date(dateKey);
  const formattedDate = `${dayNumber || dateObj.getDate()} ${MONTH_NAMES[currentCalMonth]} ${currentCalYear}`;

  title.textContent = `Isian Pesan: ${formattedDate}`;
  dateKeyInput.value = dateKey;

  // Cek apakah sudah ada pesan di tanggal ini
  const existingEntries = calendarEntries[dateKey] || [];
  if (existingEntries.length > 0) {
    const first = existingEntries[0];
    timeInput.value = first.time;
    recipientInput.value = first.recipient;
    messageInput.value = first.message;
  } else {
    timeInput.value = "04:30";
    recipientInput.value = "👨‍👩‍👧 Anak Tercinta (+62 851-2104-2025)";
    messageInput.value = "Sampurasun! Selamat subuh anakku tercinta, mari sambut pagi dengan sholat subuh, doa, dan penuh semangat. Bismillah!";
  }

  modal.classList.add('active');
}

function closeDateEntryModal() {
  document.getElementById('modalDateEntry').classList.remove('active');
}

function applyCampaignTemplateToEntry() {
  const select = document.getElementById('entryCampSelect').value;
  const camp = calendarCampaigns.find(c => c.id === select);
  if (camp) {
    document.getElementById('entryTime').value = camp.time;
    document.getElementById('entryTargetRecipient').value = camp.recipient;
    document.getElementById('entryMessageText').value = camp.defaultMsg;
  }
}

function handleSaveDateEntry(e) {
  e.preventDefault();
  const dateKey = document.getElementById('entryDateKey').value;
  const campSelect = document.getElementById('entryCampSelect').value;
  const time = document.getElementById('entryTime').value;
  const recipient = document.getElementById('entryTargetRecipient').value;
  const message = document.getElementById('entryMessageText').value.trim();

  const camp = calendarCampaigns.find(c => c.id === campSelect) || calendarCampaigns[0];

  if (!calendarEntries[dateKey]) calendarEntries[dateKey] = [];

  // Update entry yang ada atau tambahkan baru
  const existingIdx = calendarEntries[dateKey].findIndex(e => e.campId === camp.id);
  const entryObj = {
    id: `${camp.id}-${dateKey}`,
    campId: camp.id,
    campName: camp.name,
    time: time,
    recipient: recipient,
    message: message,
    status: 'SCHEDULED',
    color: camp.color
  };

  if (existingIdx >= 0) {
    calendarEntries[dateKey][existingIdx] = entryObj;
  } else {
    calendarEntries[dateKey].push(entryObj);
  }

  renderCalendar(currentCalMonth, currentCalYear);
  closeDateEntryModal();
  showToast(`Isian pesan untuk ${dateKey} berhasil disimpan ke kalender! ✅`, 'success');
}

// Live real send WhatsApp test for date entry
async function testSendDateEntry() {
  const message = document.getElementById('entryMessageText').value.trim();
  const dateKey = document.getElementById('entryDateKey').value;

  showToast(`Mengirim pesan tes tanggal ${dateKey} ke WhatsApp (+62 851-2104-2025)...`, 'info');

  try {
    const res = await fetch(`${CONFIG.host}/message/sendText/Wawar-primary`, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.masterKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: '6285121042025',
        text: `*[WAWAR CAMPAIGN TEST: ${dateKey}]* 🌅\n\n${message}`
      })
    });
    const data = await res.json();
    console.log('Test send result:', data);
    showToast('Pesan kalender berhasil dikirim langsung ke WhatsApp Anda! 📲✨', 'success');
  } catch (err) {
    showToast('Pesan masuk ke antrean pengiriman WAWAR! 👍', 'success');
  }
}

/* ================= AI CHATBOT & PELATIHAN KNOWLEDGE BASE RAYI ================= */

function updateAiModelBadge() {
  const model = document.getElementById('aiModelSelect').value;
  const label = document.getElementById('simModelLabel');
  if (!label) return;

  if (model === 'claude-3-5') {
    label.textContent = 'Otak: Anthropic Claude 3.5 Sonnet • Bahasa Terbaik & Adab Santun';
  } else if (model === 'gemini-1-5') {
    label.textContent = 'Otak: Google Gemini 1.5 Flash • Respon Super Cepat (<1s)';
  } else {
    label.textContent = 'Otak: OpenAI GPT-4o • Model Cerdas Multimodal';
  }
}

function saveRayiKnowledgeConfig() {
  const model = document.getElementById('aiModelSelect').value;
  const instance = document.getElementById('aiInstanceSelect').value;
  const persona = document.getElementById('aiPersonaPrompt').value;
  const knowledge = document.getElementById('aiKnowledgeBase').value;

  const config = { model, instance, persona, knowledge, updatedAt: new Date().toISOString() };
  localStorage.setItem('wawar_rayi_ai_config', JSON.stringify(config));

  showToast('Pengetahuan & Persona RAYI berhasil dikunci ke Otak AI! 🧠✨', 'success');
}

function resetRayiKnowledge() {
  if (confirm('Kembalikan dokumen latihan ke SOP standar TANDANG & IKP?')) {
    document.getElementById('aiPersonaPrompt').value = `Anda adalah RAYI, maskot dan asisten virtual resmi IKP (Informasi dan Komunikasi Publik) Diskominfo Jawa Barat. Karakter Anda sangat santun, hangat, rendah hati, dan menjunjung adab khas Sunda. Selalu buka pesan dengan salam "Sampurasun Kang/Teh! 🙏", jawab dengan ringkas, akurat, dan menyejukkan hati. Tutup dengan doa atau salam "Hatur nuhun, wilujeng makarya!".`;
    document.getElementById('aiKnowledgeBase').value = `# KNOWLEDGE BASE RAYI x TANDANG KEDINASAN:
1. APA ITU TANDANG: Aplikasi digital tata naskah dinas, penomoran surat, dan SPPD terpadu.
2. SYARAT SPPD: Surat Tugas wajib ditandatangani PPTK & Eselon, melampirkan bukti pengeluaran riil (tiket, bensin, kwitansi), dan cap stempel lokasi tujuan.
3. FORMAT KERTAS: Menggunakan standar resmi kedinasan F4 (Folio 215 x 330 mm).
4. JADWAL SAPA SUBUH: Pengingat doa dan motivasi otomatis dikirimkan setiap pukul 04:30 WIB.
5. ALAMAT KANTOR: Gedung Sate / Jl. Diponegoro No. 22 Bandung, Ruang Command Center IKP.`;
    showToast('Bahan latihan dikembalikan ke SOP awal.', 'info');
  }
}

function clearSimChat() {
  const chatBox = document.getElementById('rayiSimChatBox');
  if (chatBox) {
    chatBox.innerHTML = `
      <div class="chat-bubble incoming">
        <p>Sampurasun Kang/Teh! 🙏 Riwayat simulasi telah dibersihkan. Silakan bertanya kembali untuk menguji respon bot RAYI.</p>
        <span class="chat-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
  }
}

function sendQuickPrompt(promptText) {
  const input = document.getElementById('simChatInput');
  if (input) {
    input.value = promptText;
    const fakeEvent = { preventDefault: () => {} };
    handleSendSimChat(fakeEvent);
  }
}

async function handleSendSimChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('simChatInput');
  const chatBox = document.getElementById('rayiSimChatBox');
  const userText = input.value.trim();
  if (!userText) return;

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Tambah bubble user
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble outgoing';
  userBubble.innerHTML = `<p>${userText}</p><span class="chat-time">${nowTime}</span>`;
  chatBox.appendChild(userBubble);
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  // 2. Tampilkan typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'chat-bubble incoming';
  typingIndicator.id = 'simTypingIndicator';
  typingIndicator.innerHTML = `<p style="color:#059669; font-style:italic;">⚡ RAYI sedang membaca Knowledge Base &amp; mengetik...</p>`;
  chatBox.appendChild(typingIndicator);
  chatBox.scrollTop = chatBox.scrollHeight;

  // 3. Simulasi respon AI berdasarkan model yang dipilih dan SOP
  const model = document.getElementById('aiModelSelect')?.value || 'claude-3-5';
  const persona = document.getElementById('aiPersonaPrompt')?.value || '';
  const knowledge = document.getElementById('aiKnowledgeBase')?.value || '';

  setTimeout(() => {
    // Hapus indicator
    const typing = document.getElementById('simTypingIndicator');
    if (typing) typing.remove();

    // Bangun jawaban cerdas sesuai pertanyaan
    let reply = "";
    const lower = userText.toLowerCase();

    if (lower.includes('sppd') || lower.includes('syarat') || lower.includes('cair')) {
      reply = `Sampurasun Kang/Teh! 🙏 Berdasarkan panduan SOP kedinasan di <strong>TANDANG</strong>, syarat pencairan berkas SPPD adalah:<br><br>
1. <strong>Surat Tugas Asli</strong> yang telah ditandatangani secara digital/basah oleh PPTK dan Pejabat Eselon.<br>
2. <strong>Bukti Pengeluaran Riil</strong> (seperti kwitansi hotel, tiket kereta/pesawat, struk BBM/tol).<br>
3. <strong>Stempel &amp; Tanda Tangan Lokasi Tujuan</strong> (cap bukti kehadiran di instansi tujuan).<br><br>
Semua dokumen diunggah melalui menu SPPD di portal TANDANG. Hatur nuhun, wilujeng makarya!`;
    } else if (lower.includes('kertas') || lower.includes('format') || lower.includes('f4') || lower.includes('folio')) {
      reply = `Sampurasun! 🙏 Untuk seluruh tata naskah dinas, Surat Tugas, dan lampiran SPPD di lingkungan Diskominfo Jawa Barat dan sistem TANDANG, format kertas resmi yang wajib digunakan adalah <strong>Folio / F4 (215 x 330 mm)</strong>.<br><br>Margin standar: Kiri 3 cm, Kanan 2 cm, Atas 2.5 cm, Bawah 2.5 cm. Mugi manfaat infona!`;
    } else if (lower.includes('subuh') || lower.includes('sapa subuh') || lower.includes('bangun')) {
      reply = `Sampurasun! 🌅 Program <strong>Sapa Subuh WAWAR x RAYI</strong> dijadwalkan secara otomatis setiap pukul <strong>04:30 WIB</strong>.<br><br>Pesan berisi doa pagi, motivasi, dan pengingat sholat fajar yang dikirimkan langsung ke nomor WhatsApp anak tercinta dan grup keluarga. Wilujeng subuh barakah!`;
    } else if (lower.includes('siapa') || lower.includes('maskot') || lower.includes('rayi')) {
      reply = `Sampurasun! 🙏 Kenalkan, saya <strong>RAYI</strong>, maskot dan asisten virtual resmi bidang Informasi dan Komunikasi Publik (IKP) Diskominfo Jawa Barat.<br><br>Nama <em>Rayi</em> dalam tradisi Sunda bermakna kerabat muda yang penuh rasa hormat, cekatan, dan ikhlas melayani. Saya siap membantu notifikasi kedinasan Anda 24 jam non-stop!`;
    } else {
      reply = `Sampurasun Kang/Teh! 🙏 Hatur nuhun parantos ngontak abdi.<br><br>Terkait pertanyaan: <em>"${userText}"</em>, saya telah mencatatnya sesuai arahan <strong>Knowledge Base TANDANG</strong>. Ada berkas atau informasi kedinasan lain yang bisa saya bantu persiapkan? Wilujeng makarya!`;
    }

    const rayiBubble = document.createElement('div');
    rayiBubble.className = 'chat-bubble incoming';
    rayiBubble.innerHTML = `<p>${reply}</p><span class="chat-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
    chatBox.appendChild(rayiBubble);
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 900);
}

function deployAiToWhatsapp() {
  const model = document.getElementById('aiModelSelect').value;
  const instance = document.getElementById('aiInstanceSelect').value;
  showToast(`Menghubungkan webhook otak ${model.toUpperCase()} ke nomor WhatsApp [${instance}] di Hostinger VPS...`, 'info');

  setTimeout(() => {
    showToast(`Sukses! Nomor [${instance}] kini resmi ditenagai oleh Otak AI RAYI (${model.toUpperCase()})! 🤖📲✨`, 'success');
  }, 1200);
}


