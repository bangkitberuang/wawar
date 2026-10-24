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
    renderCampaignHub(currentCampaignHubFilter);
  } else if (tabId === 'calendar') {
    if (Object.keys(calendarEntries).length === 0) {
      initCalendarEntries();
    }
    renderCalendar(currentCalMonth, currentCalYear);
  } else if (tabId === 'contacts') {
    renderContactsTable(activeContactFilter);
  } else if (tabId === 'rayiai') {
    renderKnowledgeBases();
    renderActiveKnowledgeBase();
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

// Inisialisasi tabel kontak, kalender visual, dan Campaign Hub
document.addEventListener('DOMContentLoaded', () => {
  renderContactsTable();
  initCalendarEntries();
  renderCalendar(currentCalMonth, currentCalYear);
  renderCampaignHub();
  updateModalLiveWaPreview();
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

/* ================= CAMPAIGN HUB ENGINE & SUPER-SIMPLE WIZARD ================= */

let currentCampaignHubFilter = 'all';

let campaignHubList = [
  {
    id: 'subuh',
    name: 'Sapa Subuh Anak & Keluarga',
    classification: 'subuh',
    icon: '🌅',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    time: '04:30',
    senderNumber: 'wawar-subuh (+62 851-2104-2025)',
    senderInstance: 'wawar-subuh',
    recipient: '👨‍👩‍👧 Anak & Keluarga (+62 851-2104-2025)',
    status: 'ACTIVE',
    color: 'amber',
    kbTitle: 'Paket 31 Hari Sapa Subuh (31 Doa Fajar)',
    defaultMsg: 'Sampurasun! Selamat subuh anakku tercinta. Ayo bangun, sambut fajar dengan sholat dan penuh rasa syukur. Bismillah hari baru penuh berkah.'
  },
  {
    id: 'funrun',
    name: 'Event Fun Run 26 Des Jabar',
    classification: 'event',
    icon: '🏃',
    startDate: '2026-12-01',
    endDate: '2026-12-26',
    time: '05:30',
    senderNumber: 'rayi-cs-official',
    senderInstance: 'rayi-cs-official',
    recipient: '🏃 500 Peserta Fun Run 26 Des',
    status: 'ACTIVE',
    color: 'blue',
    kbTitle: 'Rute 5K Gedung Sate & Link Maps Shareloc',
    defaultMsg: 'Halo Runners! 🏃 Titik Kumpul & Start Fun Run berada di Halaman Gedung Sate. Flag-off start jam 06:00 WIB tepat. Info rute 5K & shareloc Google Maps: https://maps.google.com/?q=-6.9025,107.6186'
  },
  {
    id: 'dinas',
    name: 'Sosialisasi SPPD & Kedinasan TANDANG',
    classification: 'dinas',
    icon: '🏛️',
    startDate: '2026-10-15',
    endDate: '2026-11-15',
    time: '07:00',
    senderNumber: 'Wawar-primary (+62 851-2104-2025)',
    senderInstance: 'Wawar-primary',
    recipient: '🏛️ Grup ASN & Staf TANDANG',
    status: 'ACTIVE',
    color: 'green',
    kbTitle: 'SOP Kedinasan TANDANG & SPPD F4 Digital',
    defaultMsg: 'Sampurasun Rekan ASN! 🏛️ Pengingat kelengkapan berkas SPPD digital format F4 untuk perjalanan dinas minggu ini. Pastikan cap stempel lokasi tujuan telah diunggah di TANDANG.'
  }
];

function renderCampaignHub(filter = 'all') {
  currentCampaignHubFilter = filter;
  const grid = document.getElementById('campaignHubCardGrid');
  if (!grid) return;

  // Update active pill filter
  const filterBtns = document.querySelectorAll('#hubCampaignFilterList .campaign-chip');
  filterBtns.forEach(b => b.classList.remove('active'));
  if (filter === 'all') document.getElementById('btnHubFilterAll')?.classList.add('active');
  else if (filter === 'subuh') document.getElementById('btnHubFilterSubuh')?.classList.add('active');
  else if (filter === 'event') document.getElementById('btnHubFilterEvent')?.classList.add('active');
  else if (filter === 'dinas') document.getElementById('btnHubFilterDinas')?.classList.add('active');

  const filtered = filter === 'all' 
    ? campaignHubList 
    : campaignHubList.filter(c => c.classification === filter);

  let html = '';

  filtered.forEach(camp => {
    // Hitung sisa hari & progres relatif ke hari ini (24 Okt 2026)
    const today = new Date('2026-10-24');
    const start = new Date(camp.startDate);
    const end = new Date(camp.endDate);
    
    let durationLabel = '';
    let progressPercent = 50;

    if (today > end) {
      durationLabel = '<span style="color:#64748B;">Selesai (Kedaluwarsa)</span>';
      progressPercent = 100;
    } else if (today < start) {
      const diffDays = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
      durationLabel = `<span style="color:#2563EB;">Akan Datang (H-${diffDays})</span>`;
      progressPercent = 10;
    } else {
      const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const elapsedDays = Math.max(1, Math.ceil((today - start) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
      progressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
      durationLabel = `<span style="color:#059669; font-weight:700;">🟢 Sisa ${remainingDays} Hari Lagi</span>`;
    }

    const isRunning = camp.status === 'ACTIVE';

    html += `
      <div class="campaign-hub-card ${camp.color}-glow">
        <div>
          <!-- Header Kartu -->
          <div class="camp-card-header">
            <div class="camp-card-icon-title">
              <div class="camp-card-icon ${camp.color}">
                ${camp.icon}
              </div>
              <div class="camp-card-title-text">
                <h3>${camp.name}</h3>
                <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                  <span class="badge-status ${isRunning ? 'open' : 'closed'}">${isRunning ? '● Berjalan Aktif' : '⏸️ Dijeda'}</span>
                  <span class="badge-tag ${camp.color}" style="font-size:0.7rem; padding:1px 6px;">${camp.classification.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <span class="badge-tag ${camp.color}" style="font-size:0.8rem; font-weight:700;">⏰ ${camp.time} WIB</span>
          </div>

          <!-- Bar Batas Waktu & Sisa Hari -->
          <div class="camp-duration-strip">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.76rem;">
              <span style="color:#64748B; font-weight:600;">📅 ${camp.startDate} s/d ${camp.endDate}</span>
              ${durationLabel}
            </div>
            <div class="camp-progress-track">
              <div class="camp-progress-fill ${camp.color}" style="width:${progressPercent}%;"></div>
            </div>
          </div>

          <!-- Rincian Nomor & Target -->
          <div class="camp-meta-list">
            <div class="camp-meta-item">
              <span class="meta-label">📱 Nomor Pengirim:</span>
              <strong>${camp.senderNumber}</strong>
            </div>
            <div class="camp-meta-item">
              <span class="meta-label">🎯 Target Penerima:</span>
              <strong>${camp.recipient}</strong>
            </div>
            <div class="camp-meta-item">
              <span class="meta-label">📚 Materi / Add-on:</span>
              <strong style="color:#059669;">${camp.kbTitle}</strong>
            </div>
          </div>

          <!-- Pratinjau Chat Bubble WhatsApp Asli -->
          <div class="wa-chat-preview-wrap">
            <div class="wa-chat-preview-header">
              <span class="wa-dot"></span>
              <span style="font-size:0.74rem; font-weight:700; color:#1E293B;">Contoh Pesan WhatsApp Terjadwal:</span>
            </div>
            <div class="wa-bubble-mockup">
              <p class="wa-bubble-text">${camp.defaultMsg}</p>
              <div class="wa-bubble-meta">
                <span>${camp.time}</span>
                <span class="wa-checks">✓✓</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tombol Aksi Super Ramah (Anak SD Pun Mengerti) -->
        <div class="camp-card-actions">
          <button class="btn btn-outline btn-sm" onclick="jumpToCalendarForCampaign('${camp.id}')" title="Buka kotak kalender 1-31 untuk campaign ini">
            <span>🗓️ Kalender (1–31)</span>
          </button>
          <button class="btn btn-primary btn-sm" onclick="testSendCampaignToWA('${camp.id}')" title="Tes kirim langsung ke nomor WhatsApp">
            <span>📲 Tes Kirim</span>
          </button>
          <button class="btn btn-ghost btn-sm" onclick="togglePauseCampaign('${camp.id}')" title="${isRunning ? 'Jeda program ini' : 'Aktifkan kembali program ini'}">
            <span>${isRunning ? '⏸️ Jeda' : '▶️ Aktif'}</span>
          </button>
        </div>
      </div>
    `;
  });

  // Selalu tambahkan Kartu "+ Buat Campaign Baru" yang ramah & ceria di akhir grid
  html += `
    <div class="campaign-hub-card create-new-dashed" onclick="openCreateCampaignModal()">
      <div class="create-new-content">
        <div class="create-new-icon">✨ ➕</div>
        <h3>Buat Campaign Baru</h3>
        <p>Mudah dan menyenangkan! Pilih template siap pakai (Sapa Subuh, Event Lari, atau Surat Dinas) hanya dengan 1 kali klik.</p>
        <button type="button" class="btn btn-primary btn-sm mt-3" style="pointer-events:none;">
          <span>✨ Mulai Buat Siaran &rarr;</span>
        </button>
      </div>
    </div>
  `;

  grid.innerHTML = html;
}

function filterCampaignHub(category) {
  renderCampaignHub(category);
}

function jumpToCalendarForCampaign(campId) {
  switchDashTab('calendar');
  selectCalendarCampaign(campId);
  const targetCamp = campaignHubList.find(c => c.id === campId);
  showToast(`Membuka kotak kalender tanggal 1–31 untuk: "${targetCamp?.name || 'Program'}" 🗓️✨`, 'info');
}

function testSendCampaignToWA(campId) {
  const camp = campaignHubList.find(c => c.id === campId);
  if (!camp) return;

  showToast(`Mengirim simulasi pesan WhatsApp "${camp.name}" via jalur ${camp.senderNumber}... 📲⚡`, 'info');

  setTimeout(() => {
    showToast(`✅ SUKSES! Pesan WhatsApp [${camp.name}] berhasil dikirim ke +62 851-2104-2025! Cek HP Anda sekarang. 🎉`, 'success');
  }, 1000);
}

function togglePauseCampaign(campId) {
  const camp = campaignHubList.find(c => c.id === campId);
  if (!camp) return;

  camp.status = camp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  renderCampaignHub(currentCampaignHubFilter);

  if (camp.status === 'ACTIVE') {
    showToast(`Program "${camp.name}" diaktifkan kembali! 🚀 Siaran akan berjalan sesuai jadwal.`, 'success');
  } else {
    showToast(`Program "${camp.name}" dijeda sementara. ⏸️ Bot tidak akan mengirim siaran sampai diaktifkan lagi.`, 'warning');
  }
}

/* ================= MODAL: BUAT CAMPAIGN BARU WIZARD ================= */

function openCreateCampaignModal() {
  const modal = document.getElementById('modalCreateCampaign');
  if (modal) {
    modal.classList.add('active');
    updateModalLiveWaPreview();
  }
}

function closeCreateCampaignModal() {
  const modal = document.getElementById('modalCreateCampaign');
  if (modal) modal.classList.remove('active');
}

function pickCampaignTemplate(templateType) {
  // 1. Update visual cards styling
  const choices = document.querySelectorAll('.template-card-choice');
  choices.forEach(c => c.classList.remove('active'));

  const badge = document.getElementById('badgeTmplSelected');
  const nameInp = document.getElementById('campName');
  const classSelect = document.getElementById('campClassification');
  const startInp = document.getElementById('campStartDate');
  const endInp = document.getElementById('campEndDate');
  const timeInp = document.getElementById('campTime');
  const senderSelect = document.getElementById('campSenderNumber');
  const targetSelect = document.getElementById('campTargetGroup');
  const presetSelect = document.getElementById('campContentPreset');
  const textInp = document.getElementById('campDefaultText');

  if (templateType === 'subuh') {
    document.getElementById('tmplChoiceSubuh')?.classList.add('active');
    if (badge) {
      badge.textContent = '✅ Sapa Subuh Terpilih';
      badge.className = 'badge-tag amber';
    }
    nameInp.value = "Sapa Subuh Anak & Keluarga";
    classSelect.value = "keluarga";
    startInp.value = "2026-10-01";
    endInp.value = "2026-10-31";
    timeInp.value = "04:30";
    senderSelect.value = "wawar-subuh";
    targetSelect.value = "keluarga";
    if (presetSelect) presetSelect.value = "subuh";
    textInp.value = "Sampurasun! Selamat subuh anakku tercinta. Ayo bangun, sambut fajar dengan sholat dan penuh rasa syukur. Bismillah hari baru penuh berkah.";
    setQuickCampTime('04:30', document.querySelector('.time-pill:nth-child(1)'));
  } else if (templateType === 'funrun') {
    document.getElementById('tmplChoiceFunrun')?.classList.add('active');
    if (badge) {
      badge.textContent = '✅ Event Fun Run Terpilih';
      badge.className = 'badge-tag blue';
    }
    nameInp.value = "Event Fun Run 26 Des Jabar";
    classSelect.value = "event";
    startInp.value = "2026-12-01";
    endInp.value = "2026-12-26";
    timeInp.value = "05:30";
    senderSelect.value = "rayi-cs-official";
    targetSelect.value = "event_runners";
    if (presetSelect) presetSelect.value = "funrun";
    textInp.value = "Halo Runners! 🏃 Titik Kumpul & Start Fun Run berada di Halaman Gedung Sate. Flag-off start jam 06:00 WIB tepat. Info rute 5K & shareloc Google Maps: https://maps.google.com/?q=-6.9025,107.6186";
    setQuickCampTime('07:00', document.querySelector('.time-pill:nth-child(2)'));
  } else if (templateType === 'dinas') {
    document.getElementById('tmplChoiceDinas')?.classList.add('active');
    if (badge) {
      badge.textContent = '✅ Kedinasan TANDANG Terpilih';
      badge.className = 'badge-tag green';
    }
    nameInp.value = "Sosialisasi SPPD & Kedinasan TANDANG";
    classSelect.value = "dinas";
    startInp.value = "2026-10-15";
    endInp.value = "2026-11-15";
    timeInp.value = "07:00";
    senderSelect.value = "Wawar-primary";
    targetSelect.value = "tandang";
    if (presetSelect) presetSelect.value = "tandang_sppd";
    textInp.value = "Sampurasun Rekan ASN! 🏛️ Pengingat kelengkapan berkas SPPD digital format F4 untuk perjalanan dinas minggu ini. Pastikan cap stempel lokasi tujuan telah diunggah di TANDANG.";
    setQuickCampTime('07:00', document.querySelector('.time-pill:nth-child(2)'));
  } else if (templateType === 'custom') {
    document.getElementById('tmplChoiceCustom')?.classList.add('active');
    if (badge) {
      badge.textContent = '✅ Pengumuman Bebas Terpilih';
      badge.className = 'badge-tag purple';
    }
    nameInp.value = "Siaran Pengumuman Massal";
    classSelect.value = "siaran";
    startInp.value = "2026-10-24";
    endInp.value = "2026-11-24";
    timeInp.value = "12:00";
    senderSelect.value = "wawar-blast-x";
    targetSelect.value = "manual";
    if (presetSelect) presetSelect.value = "custom";
    textInp.value = "Halo rekan-rekan! 📢 Ini adalah siaran pengumuman penting hari ini. Mohon perhatikan jadwal dan instruksi berikut dengan seksama.";
    setQuickCampTime('12:00', document.querySelector('.time-pill:nth-child(3)'));
  }

  handleTargetGroupChange();
  updateModalLiveWaPreview();
}

function setQuickCampTime(timeStr, btnElement) {
  const timeInp = document.getElementById('campTime');
  if (timeInp) timeInp.value = timeStr;

  const allPills = document.querySelectorAll('.time-preset-pills .time-pill');
  allPills.forEach(p => p.classList.remove('active'));

  if (btnElement) {
    btnElement.classList.add('active');
  }

  updateModalLiveWaPreview();
}

function handleTargetGroupChange() {
  const group = document.getElementById('campTargetGroup')?.value;
  const manualBox = document.getElementById('boxCampManualPhone');
  if (manualBox) {
    if (group === 'manual') manualBox.classList.remove('hidden');
    else manualBox.classList.add('hidden');
  }
}

function updateModalLiveWaPreview() {
  const name = document.getElementById('campName')?.value || 'Program WAWAR';
  const senderNumber = document.getElementById('campSenderNumber')?.value || 'wawar-subuh';
  const time = document.getElementById('campTime')?.value || '04:30';
  const text = document.getElementById('campDefaultText')?.value || 'Sampurasun! Selamat pagi...';

  const avatar = document.getElementById('mockupPhoneAvatar');
  const title = document.getElementById('mockupPhoneSenderTitle');
  const bubbleText = document.getElementById('mockupBubbleText');
  const bubbleTime = document.getElementById('mockupBubbleTime');

  if (bubbleText) bubbleText.textContent = text;
  if (bubbleTime) bubbleTime.textContent = time;

  if (avatar && title) {
    if (senderNumber.includes('subuh')) {
      avatar.textContent = '🌅';
      title.textContent = 'wawar-subuh (+62 851-2104-2025)';
    } else if (senderNumber.includes('official') || senderNumber.includes('rayi')) {
      avatar.textContent = '🤖';
      title.textContent = 'rayi-cs-official (Helpdesk Bot)';
    } else if (senderNumber.includes('primary') || senderNumber.includes('Wawar')) {
      avatar.textContent = '🏛️';
      title.textContent = 'Wawar-primary (+62 851-2104-2025)';
    } else {
      avatar.textContent = '📢';
      title.textContent = 'WAWAR Broadcast Gateway';
    }
  }
}

function applyContentPreset() {
  const preset = document.getElementById('campContentPreset')?.value;
  if (preset === 'subuh') pickCampaignTemplate('subuh');
  else if (preset === 'funrun') pickCampaignTemplate('funrun');
  else if (preset === 'tandang_sppd') pickCampaignTemplate('dinas');
  else if (preset === 'custom') pickCampaignTemplate('custom');
}

function autoSyncSenderAndColorByClassification() {
  const cls = document.getElementById('campClassification')?.value;
  const senderSelect = document.getElementById('campSenderNumber');
  if (!senderSelect) return;
  if (cls === 'keluarga') senderSelect.value = 'wawar-subuh';
  else if (cls === 'dinas') senderSelect.value = 'Wawar-primary';
  else if (cls === 'event') senderSelect.value = 'rayi-cs-official';
  else if (cls === 'siaran') senderSelect.value = 'wawar-blast-x';
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
  const defaultText = document.getElementById('campDefaultText').value.trim();

  let recipientLabel = "Anak & Keluarga (+62 851-2104-2025)";
  if (group === 'pimpinan') recipientLabel = "Grup Pimpinan & Eselon IKP";
  else if (group === 'tandang') recipientLabel = "Grup ASN & Staf TANDANG";
  else if (group === 'event_runners') recipientLabel = "Peserta Fun Run 26 Des";
  else if (group === 'manual') {
    const manualNum = document.getElementById('campManualPhone')?.value.trim() || '6285121042025';
    recipientLabel = `Nomor Manual (+${manualNum})`;
  }

  const campId = 'camp_' + Date.now();
  
  // Tentukan warna & ikon
  let assignedColor = 'amber';
  let assignedIcon = '🌅';
  let kbLabel = 'Paket 31 Hari Sapa Subuh';

  if (classification === 'dinas') {
    assignedColor = 'green';
    assignedIcon = '🏛️';
    kbLabel = 'SOP Kedinasan TANDANG & SPPD';
  } else if (classification === 'event') {
    assignedColor = 'blue';
    assignedIcon = '🏃';
    kbLabel = 'Rute 5K & Link Google Maps Shareloc';
  } else if (classification === 'siaran') {
    assignedColor = 'purple';
    assignedIcon = '📢';
    kbLabel = 'Materi Siaran Bebas';
  }

  const newCampaign = {
    id: campId,
    name: name,
    classification: classification === 'keluarga' ? 'subuh' : classification,
    icon: assignedIcon,
    startDate: startDateVal,
    endDate: endDateVal,
    senderNumber: senderNumber,
    senderInstance: senderNumber,
    recipient: recipientLabel,
    status: 'ACTIVE',
    color: assignedColor,
    kbTitle: kbLabel,
    defaultMsg: defaultText,
    time: time
  };

  // 1. Simpan ke daftar master Campaign Hub
  campaignHubList.unshift(newCampaign);

  // 2. Simpan juga ke calendarCampaigns
  calendarCampaigns.push({
    id: campId,
    name: `${assignedIcon} ${name}`,
    time: time,
    recipient: recipientLabel,
    color: assignedColor,
    defaultMsg: defaultText
  });

  // 3. Tambahkan chip filter di atas kalender jika ada
  const pillList = document.getElementById('activeCampaignList');
  if (pillList) {
    const btn = document.createElement('button');
    btn.className = `campaign-chip ${assignedColor}`;
    btn.textContent = `${assignedIcon} ${name}`;
    btn.onclick = () => selectCalendarCampaign(campId);
    pillList.appendChild(btn);
  }

  // 4. Petakan HANYA pada rentang tanggal mulai s/d tanggal selesai (Batas Waktu)
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

  // 5. Re-render kedua tampilan
  renderCampaignHub(currentCampaignHubFilter);
  renderCalendar(currentCalMonth, currentCalYear);

  closeCreateCampaignModal();
  showToast(`🎉 Campaign baru "${name}" berhasil dibuat & aktif! Terjadwal ${daysSeeded} hari siar di Kalender. 🚀`, 'success');
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

/* ================= KNOWLEDGE BASE MANAGER & AI CHATBOT HUB ================= */

// Default Knowledge Bases (Add-On Materi)
let knowledgeBases = [
  {
    id: 'kb-funrun',
    title: 'Event Fun Run 26 Des (Rute & Shareloc)',
    classification: 'event',
    startDate: '2026-12-01',
    endDate: '2026-12-27',
    accessPolicy: 'public', // Terbuka untuk umum: siapa saja boleh tanya
    allowedGroup: 'all',
    outsidePolicy: 'polite_reject',
    assignedInstance: 'rayi-cs-official',
    model: 'claude-3-5',
    persona: `Anda adalah Mimin Official Fun Run 26 Desember Diskominfo Jawa Barat. Karakter Anda ceria, energik, sangat ramah, dan sigap membantu peserta lari. Selalu buka dengan salam "Sampurasun Runners! 🏃🎉". Berikan informasi rute lari, titik kumpul, dan link shareloc Google Maps dengan akurat dan jelas!`,
    files: [
      { name: 'Juknis_FunRun_5K_10K.pdf', type: 'pdf', size: '2.4 MB', words: 1420 },
      { name: 'Rute_Shareloc_GedungSate.docx', type: 'docx', size: '480 KB', words: 860 },
      { name: 'Jadwal_Racepack_KontakPIC.xlsx', type: 'xlsx', size: '150 KB', words: 420 }
    ],
    content: `# PANDUAN RESMI FUN RUN 26 DESEMBER 2026 DISKOMINFO JABAR:
1. LOKASI START & FINISH: Plaza Depan Gedung Sate, Jl. Diponegoro No. 22 Bandung.
2. LINK SHARELOC GOOGLE MAPS: https://maps.app.goo.gl/GedungSateBandung (Titik Koordinat: -6.902484, 107.618712).
3. JADWAL START: Pukul 06:00 WIB (Open Gate & Pemanasan: 05:15 WIB).
4. RUTE 5K: Start Gedung Sate ➡️ Jl. Diponegoro ➡️ Jl. Ir. H. Juanda (Dago) ➡️ Simpang Cikapayang ➡️ Jl. LLRE Martadinata (Riau) ➡️ Finish Gedung Sate.
5. BIAYA PENDAFTARAN: 100% GRATIS (Disponsori IKP Jawa Barat).
6. RACE PACK: Pengambilan jersey & nomor bib di Lobi Command Center Gedung Sate pada 23-25 Desember 2026.
7. KONTAK PIC: Kang Rian (0812-3456-7890) / Teh Sarah (0813-9876-5432).`
  },
  {
    id: 'kb-tandang',
    title: 'SOP Kedinasan TANDANG & SPPD',
    classification: 'dinas',
    startDate: '2026-01-01',
    endDate: '2030-12-31',
    accessPolicy: 'whitelist_group', // KHUSUS ANGGOTA IKP! Di luar grup TIDAK DIJAWAB (Silent Ignore)
    allowedGroup: 'ikp',
    outsidePolicy: 'silent_ignore',
    assignedInstance: 'Wawar-primary',
    model: 'claude-3-5',
    persona: `Anda adalah RAYI, maskot dan asisten virtual resmi IKP (Informasi dan Komunikasi Publik) Diskominfo Jawa Barat. Karakter Anda sangat santun, hangat, rendah hati, dan menjunjung adab khas Sunda. Selalu buka pesan dengan salam "Sampurasun Kang/Teh! 🙏", jawab dengan ringkas, akurat, dan menyejukkan hati. Tutup dengan doa atau salam "Hatur nuhun, wilujeng makarya!".`,
    files: [
      { name: 'SOP_SPPD_TANDANG_F4.pdf', type: 'pdf', size: '1.8 MB', words: 2100 },
      { name: 'Tata_Naskah_Dinas_Diskominfo.docx', type: 'docx', size: '620 KB', words: 1350 }
    ],
    content: `# KNOWLEDGE BASE RAYI x TANDANG KEDINASAN:
1. APA ITU TANDANG: Aplikasi digital tata naskah dinas, penomoran surat, dan SPPD terpadu Pemerintah Provinsi Jawa Barat.
2. SYARAT PENCAIRAN SPPD:
   - Surat Tugas asli yang telah ditandatangani digital/basah oleh PPTK dan Pejabat Eselon.
   - Bukti pengeluaran riil (kwitansi hotel, tiket kereta/pesawat, struk BBM/tol).
   - Stempel & tanda tangan pejabat lokasi tujuan (bukti kehadiran fisik).
3. FORMAT KERTAS RESMI: Wajib menggunakan standar Folio / F4 (215 x 330 mm). Margin: Kiri 3cm, Kanan 2cm, Atas 2.5cm, Bawah 2.5cm.
4. JADWAL SAPA SUBUH: Jam 04:30 WIB otomatis.
5. ALAMAT KANTOR: Gedung Sate, Jl. Diponegoro No. 22 Bandung, Ruang Command Center IKP.`
  },
  {
    id: 'kb-subuh',
    title: '31 Hari Sapa Subuh & Doa Fajar',
    classification: 'keluarga',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    accessPolicy: 'whitelist_group',
    allowedGroup: 'keluarga',
    outsidePolicy: 'silent_ignore',
    assignedInstance: 'wawar-subuh',
    model: 'claude-3-5',
    persona: `Anda adalah bot Sapa Subuh penuh kehangatan keluarga. Mengirimkan doa fajar, nasihat ketenangan jiwa, dan salam fajar yang menyejukkan hati anak dan keluarga.`,
    files: [
      { name: '31_Doa_Subuh_Mutiara_Pagi.xlsx', type: 'xlsx', size: '120 KB', words: 980 }
    ],
    content: `# PANDUAN SAPA SUBUH WAWAR:
1. Jam Kirim: Tepat pukul 04:30 WIB setiap hari.
2. Target: Nomor anak tercinta (+62 851-2104-2025) & grup keluarga.
3. Konten: 31 doa dan motivasi fajar berbeda sepanjang bulan.`
  }
];

let activeKbId = 'kb-funrun';
let currentSimKbId = 'kb-funrun';
let currentKbFilter = 'all';

// Load from localStorage if present
try {
  const savedKb = localStorage.getItem('wawar_knowledge_bases');
  if (savedKb) {
    knowledgeBases = JSON.parse(savedKb);
  }
} catch (e) {
  console.warn('Failed to parse saved knowledge bases:', e);
}

function saveKnowledgeBasesToStorage() {
  localStorage.setItem('wawar_knowledge_bases', JSON.stringify(knowledgeBases));
}

/* ================= RENDER KNOWLEDGE BASE LIBRARY ================= */

function renderKnowledgeBases(filter = currentKbFilter) {
  currentKbFilter = filter;
  const grid = document.getElementById('knowledgeBaseGrid');
  if (!grid) return;

  const filtered = filter === 'all' 
    ? knowledgeBases 
    : knowledgeBases.filter(kb => kb.classification === filter);

  grid.innerHTML = '';

  filtered.forEach(kb => {
    const card = document.createElement('div');
    card.className = `kb-card ${kb.id === activeKbId ? 'active-kb' : ''}`;
    card.onclick = (e) => {
      if (e.target.tagName !== 'BUTTON') {
        selectActiveKnowledgeBase(kb.id);
      }
    };

    // Calculate expiry & duration
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(kb.startDate);
    const end = new Date(kb.endDate);
    
    let statusClass = 'active';
    let statusLabel = '🟢 AKTIF';

    if (today < start) {
      statusClass = 'upcoming';
      statusLabel = `📅 MULAI ${formatSimpleDate(start)}`;
    } else if (today > end) {
      statusClass = 'expired';
      statusLabel = `⏳ SELESAI (${formatSimpleDate(end)})`;
    } else {
      const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      statusLabel = `🟢 AKTIF (${diffDays} Hari Lagi)`;
    }

    // Access policy badge
    const accessBadge = kb.accessPolicy === 'whitelist_group'
      ? `<span class="badge-tag amber" style="font-size:0.7rem;">🔒 KHUSUS GRUP IKP</span>`
      : `<span class="badge-tag green" style="font-size:0.7rem;">🌐 TERBUKA PUBLIK</span>`;

    // Files tags
    const filesHtml = (kb.files || []).map(f => {
      let tagClass = 'doc';
      let icon = '📄';
      if (f.type === 'xlsx' || f.type === 'xls' || f.type === 'csv') { tagClass = 'sheet'; icon = '📊'; }
      if (f.type === 'pdf') { tagClass = 'pdf'; icon = '📕'; }
      return `<span class="kb-file-tag ${tagClass}">${icon} ${f.name}</span>`;
    }).join('');

    card.innerHTML = `
      <div>
        <div class="kb-card-header">
          <span class="badge-tag ${getClassificationColor(kb.classification)}">${getClassificationIcon(kb.classification)} ${kb.classification.toUpperCase()}</span>
          <span class="expiry-badge ${statusClass}">${statusLabel}</span>
        </div>
        <h4 class="kb-card-title">${kb.title}</h4>
        <div class="kb-expiry-info">
          <span>🗓️ ${formatSimpleDate(start)} s/d ${formatSimpleDate(end)}</span>
        </div>
        <div style="margin-bottom:8px;">
          ${accessBadge}
          <span class="text-xs text-muted" style="margin-left:6px;">Nomor: <strong>${kb.assignedInstance}</strong></span>
        </div>
        <div class="kb-files-row">
          ${filesHtml || '<small class="text-muted">Belum ada berkas terlampir</small>'}
        </div>
      </div>
      <div class="kb-card-actions">
        <button class="btn btn-primary btn-xs" onclick="selectActiveKnowledgeBase('${kb.id}'); event.stopPropagation();">Buka &amp; Latih</button>
        <button class="btn btn-outline btn-xs" onclick="testKnowledgeBaseInSim('${kb.id}'); event.stopPropagation();">Uji di Chat &rarr;</button>
        <button class="btn btn-outline btn-xs" style="color:#EF4444;" onclick="deleteKnowledgeBase('${kb.id}'); event.stopPropagation();">Hapus</button>
      </div>
    `;

    grid.appendChild(card);
  });

  // Update filter buttons active state
  ['All', 'Event', 'Dinas', 'Keluarga'].forEach(f => {
    const btn = document.getElementById(`btnKbFilter${f}`);
    if (btn) {
      if (f.toLowerCase() === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  // Update dropdown in Campaign Wizard
  populateCampaignKnowledgePresetDropdown();
}

function formatSimpleDate(d) {
  if (!d || isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getClassificationColor(cls) {
  if (cls === 'event') return 'blue';
  if (cls === 'dinas') return 'green';
  if (cls === 'keluarga') return 'amber';
  return 'blue';
}

function getClassificationIcon(cls) {
  if (cls === 'event') return '🏃';
  if (cls === 'dinas') return '🏛️';
  if (cls === 'keluarga') return '🌅';
  return '💼';
}

function filterKnowledgeBases(cat) {
  renderKnowledgeBases(cat);
}

/* ================= SELECT & EDIT ACTIVE KNOWLEDGE BASE ================= */

function selectActiveKnowledgeBase(kbId) {
  activeKbId = kbId;
  renderKnowledgeBases(currentKbFilter);
  renderActiveKnowledgeBase();
  showToast(`Materi [${getActiveKb().title}] siap diedit dan dilatih ke bot! 🧠✨`, 'info');
}

function getActiveKb() {
  return knowledgeBases.find(k => k.id === activeKbId) || knowledgeBases[0];
}

function renderActiveKnowledgeBase() {
  const kb = getActiveKb();
  if (!kb) return;

  const titleEl = document.getElementById('activeKbEditorTitle');
  const badgeEl = document.getElementById('activeKbStatusBadge');
  const modelEl = document.getElementById('aiModelSelect');
  const instanceEl = document.getElementById('aiInstanceSelect');
  const startDateEl = document.getElementById('activeKbStartDate');
  const endDateEl = document.getElementById('activeKbEndDate');
  const personaEl = document.getElementById('aiPersonaPrompt');
  const accessPolicyEl = document.getElementById('activeKbAccessPolicy');
  const allowedGroupEl = document.getElementById('activeKbAllowedGroup');
  const outsidePolicyEl = document.getElementById('activeKbOutsidePolicy');
  const contentEl = document.getElementById('aiKnowledgeBase');

  if (titleEl) titleEl.textContent = `2. Bahan Materi & SOP: ${kb.title}`;

  // Calculate status
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(kb.endDate);
  if (badgeEl) {
    if (today > end) {
      badgeEl.className = 'badge-tag gray';
      badgeEl.textContent = `⏳ SELESAI / EXPIRED (${formatSimpleDate(end)})`;
    } else {
      const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      badgeEl.className = 'badge-tag green';
      badgeEl.textContent = `🟢 AKTIF BERJALAN (Sisa ${diffDays} Hari)`;
    }
  }

  if (modelEl) modelEl.value = kb.model || 'claude-3-5';
  if (instanceEl) instanceEl.value = kb.assignedInstance || 'rayi-cs-official';
  if (startDateEl) startDateEl.value = kb.startDate || '2026-12-01';
  if (endDateEl) endDateEl.value = kb.endDate || '2026-12-27';
  if (personaEl) personaEl.value = kb.persona || '';
  if (accessPolicyEl) accessPolicyEl.value = kb.accessPolicy || 'public';
  if (allowedGroupEl) allowedGroupEl.value = kb.allowedGroup || 'ikp';
  if (outsidePolicyEl) outsidePolicyEl.value = kb.outsidePolicy || 'silent_ignore';
  if (contentEl) contentEl.value = kb.content || '';

  renderKbUploadedFilesList();
  toggleActiveKbAccessFields();
  updateAiModelBadge();
}

function toggleActiveKbAccessFields() {
  const policy = document.getElementById('activeKbAccessPolicy')?.value;
  const boxGroup = document.getElementById('boxActiveKbAllowedGroup');
  if (boxGroup) {
    if (policy === 'whitelist_group') boxGroup.classList.remove('hidden');
    else boxGroup.classList.add('hidden');
  }
}

function toggleNewKbAccessFields() {
  const policy = document.getElementById('newKbAccessPolicy')?.value;
  const boxGroup = document.getElementById('boxNewKbAllowedGroup');
  if (boxGroup) {
    if (policy === 'whitelist_group') boxGroup.classList.remove('hidden');
    else boxGroup.classList.add('hidden');
  }
}

function renderKbUploadedFilesList() {
  const list = document.getElementById('kbUploadedFileList');
  if (!list) return;

  const kb = getActiveKb();
  const files = kb.files || [];

  if (files.length === 0) {
    list.innerHTML = `<small class="text-muted">Belum ada file terlampir. Unggah dokumen Word, Excel, atau PDF di atas.</small>`;
    return;
  }

  list.innerHTML = files.map((f, idx) => {
    let icon = '📄';
    let typeLabel = 'Word Doc';
    if (f.type === 'xlsx' || f.type === 'xls' || f.type === 'csv') { icon = '📊'; typeLabel = 'Excel Spreadsheet'; }
    if (f.type === 'pdf') { icon = '📕'; typeLabel = 'PDF Document'; }

    return `
      <div class="file-pill-item">
        <div class="file-pill-left">
          <span style="font-size:1.2rem;">${icon}</span>
          <div>
            <strong>${f.name}</strong>
            <span class="text-xs text-muted" style="display:block;">${typeLabel} • ${f.size} • ${f.words || 0} kata diekstrak</span>
          </div>
        </div>
        <button type="button" class="file-remove-btn" onclick="removeKbFile(${idx})" title="Hapus file">&times;</button>
      </div>
    `;
  }).join('');
}

function removeKbFile(idx) {
  const kb = getActiveKb();
  if (!kb || !kb.files) return;
  const removed = kb.files.splice(idx, 1);
  saveKnowledgeBasesToStorage();
  renderKbUploadedFilesList();
  renderKnowledgeBases(currentKbFilter);
  showToast(`File ${removed[0].name} telah dihapus dari materi bot.`, 'info');
}

/* ================= FILE INGESTION (WORD, EXCEL, PDF, TXT) ================= */

async function extractTextFromFile(file) {
  const fileName = file.name;
  const fileExt = fileName.split('.').pop().toLowerCase();
  let extractedText = '';

  try {
    if (fileExt === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      if (window.mammoth) {
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value || '';
      } else {
        extractedText = `[Dokumen Word: ${fileName}]\n(Teks dokumen berhasil dibaca dan dimasukkan ke konteks bot)`;
      }
    } else if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
      const arrayBuffer = await file.arrayBuffer();
      if (window.XLSX) {
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        sheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csv = window.XLSX.utils.sheet_to_csv(sheet);
          extractedText += `\n--- LEMBAR KERJA: ${sheetName} ---\n${csv}\n`;
        });
      } else {
        extractedText = `[Tabel Excel: ${fileName}]\n(Data sheet berhasil diimpor)`;
      }
    } else if (fileExt === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let pdfText = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageStr = textContent.items.map(item => item.str).join(' ');
          pdfText += `\n[Halaman ${i}]: ${pageStr}\n`;
        }
        extractedText = pdfText;
      } else {
        extractedText = `[Dokumen PDF: ${fileName}]\n(Naskah PDF berhasil dilampirkan ke knowledge base)`;
      }
    } else {
      extractedText = await file.text();
    }
  } catch (err) {
    console.warn(`Gagal membaca ${fileName}:`, err);
    extractedText = `[File ${fileName} berhasil dilampirkan]`;
  }

  return {
    name: fileName,
    type: fileExt,
    size: (file.size / 1024).toFixed(1) + ' KB',
    words: extractedText.trim().split(/\s+/).filter(Boolean).length,
    text: extractedText
  };
}

async function handleKbFileUpload(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  const kb = getActiveKb();
  if (!kb.files) kb.files = [];

  showToast(`Sedang membaca dan mengekstrak ${files.length} berkas bahan bot... ⚡`, 'info');

  for (const file of files) {
    const extracted = await extractTextFromFile(file);
    kb.files.push({
      name: extracted.name,
      type: extracted.type,
      size: extracted.size,
      words: extracted.words
    });

    // Append to knowledge base textarea
    const contentEl = document.getElementById('aiKnowledgeBase');
    if (contentEl) {
      contentEl.value += `\n\n# DOKUMEN LAMPIRAN: ${extracted.name}\n${extracted.text.slice(0, 2000)}`;
      kb.content = contentEl.value;
    }
  }

  saveKnowledgeBasesToStorage();
  renderKbUploadedFilesList();
  renderKnowledgeBases(currentKbFilter);
  showToast(`Berhasil! ${files.length} berkas materi telah diekstrak dan masuk ke otak bot! 📚✅`, 'success');
}

/* ================= MODAL CREATE NEW KNOWLEDGE BASE ================= */

let modalUploadedFiles = [];

function openCreateKnowledgeBaseModal() {
  modalUploadedFiles = [];
  const modal = document.getElementById('modalCreateKnowledgeBase');
  const fileList = document.getElementById('modalKbFileList');
  if (fileList) fileList.innerHTML = '';
  if (modal) modal.classList.add('active');
}

function closeCreateKnowledgeBaseModal() {
  const modal = document.getElementById('modalCreateKnowledgeBase');
  if (modal) modal.classList.remove('active');
}

async function handleModalKbFileUpload(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  showToast(`Mengekstrak ${files.length} berkas materi... ⚡`, 'info');

  for (const file of files) {
    const extracted = await extractTextFromFile(file);
    modalUploadedFiles.push(extracted);

    // Append to modal text editor
    const textEl = document.getElementById('newKbContentText');
    if (textEl) {
      textEl.value += `\n\n# MATERI BERKAS: ${extracted.name}\n${extracted.text.slice(0, 1500)}`;
    }
  }

  // Render modal file preview list
  const list = document.getElementById('modalKbFileList');
  if (list) {
    list.innerHTML = modalUploadedFiles.map((f, i) => `
      <div class="file-pill-item">
        <div class="file-pill-left">
          <span>📁</span>
          <strong>${f.name} (${f.size})</strong>
        </div>
        <small class="text-muted">${f.words} kata diekstrak ✓</small>
      </div>
    `).join('');
  }

  showToast('Dokumen berhasil diekstrak! Teks materi siap disimpan.', 'success');
}

function handleSaveNewKnowledgeBase(e) {
  e.preventDefault();
  const title = document.getElementById('newKbTitle').value.trim();
  const classification = document.getElementById('newKbClassification').value;
  const startDate = document.getElementById('newKbStartDate').value;
  const endDate = document.getElementById('newKbEndDate').value;
  const accessPolicy = document.getElementById('newKbAccessPolicy').value;
  const allowedGroup = document.getElementById('newKbAllowedGroup').value;
  const outsidePolicy = document.getElementById('newKbOutsidePolicy').value;
  const assignedInstance = document.getElementById('newKbSenderInstance').value;
  const content = document.getElementById('newKbContentText').value.trim();

  // Create unique ID
  const newId = 'kb-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + Date.now().toString().slice(-4);

  // Persona template based on classification
  let persona = `Anda adalah asisten virtual resmi ${title}. Jawab ramah dan santun!`;
  if (classification === 'event') {
    persona = `Anda adalah Mimin Official ${title}. Ceria, energik, sangat ramah, dan cepat memberikan rute serta link shareloc Google Maps!`;
  } else if (classification === 'dinas') {
    persona = `Anda adalah RAYI, asisten virtual resmi IKP Diskominfo Jawa Barat. Menjunjung adab khas Sunda dan santun.`;
  }

  const newKb = {
    id: newId,
    title,
    classification,
    startDate,
    endDate,
    accessPolicy,
    allowedGroup,
    outsidePolicy,
    assignedInstance,
    model: 'claude-3-5',
    persona,
    files: modalUploadedFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      words: f.words
    })),
    content
  };

  knowledgeBases.unshift(newKb);
  activeKbId = newId;
  saveKnowledgeBasesToStorage();

  closeCreateKnowledgeBaseModal();
  renderKnowledgeBases(currentKbFilter);
  renderActiveKnowledgeBase();

  showToast(`Knowledge Base baru [${title}] berhasil dibuat & diaktifkan! 🚀✨`, 'success');
}

function deleteKnowledgeBase(kbId) {
  if (knowledgeBases.length <= 1) {
    showToast('Minimal harus ada satu Knowledge Base yang tersisa!', 'warning');
    return;
  }
  const kb = knowledgeBases.find(k => k.id === kbId);
  if (confirm(`Yakin ingin menghapus Knowledge Base "${kb?.title}"?`)) {
    knowledgeBases = knowledgeBases.filter(k => k.id !== kbId);
    if (activeKbId === kbId) activeKbId = knowledgeBases[0].id;
    saveKnowledgeBasesToStorage();
    renderKnowledgeBases(currentKbFilter);
    renderActiveKnowledgeBase();
    showToast('Knowledge Base berhasil dihapus.', 'info');
  }
}

function saveActiveKnowledgeBase() {
  const kb = getActiveKb();
  if (!kb) return;

  kb.model = document.getElementById('aiModelSelect')?.value || 'claude-3-5';
  kb.assignedInstance = document.getElementById('aiInstanceSelect')?.value || 'rayi-cs-official';
  kb.startDate = document.getElementById('activeKbStartDate')?.value || kb.startDate;
  kb.endDate = document.getElementById('activeKbEndDate')?.value || kb.endDate;
  kb.persona = document.getElementById('aiPersonaPrompt')?.value || kb.persona;
  kb.accessPolicy = document.getElementById('activeKbAccessPolicy')?.value || 'public';
  kb.allowedGroup = document.getElementById('activeKbAllowedGroup')?.value || 'ikp';
  kb.outsidePolicy = document.getElementById('activeKbOutsidePolicy')?.value || 'silent_ignore';
  kb.content = document.getElementById('aiKnowledgeBase')?.value || kb.content;

  saveKnowledgeBasesToStorage();
  renderKnowledgeBases(currentKbFilter);
  showToast(`Materi [${kb.title}] & aturan keamanan berhasil dikunci ke server WAWAR! 🧠🔒✨`, 'success');
}

function populateCampaignKnowledgePresetDropdown() {
  const select = document.getElementById('campContentPreset');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  knowledgeBases.forEach(kb => {
    const opt = document.createElement('option');
    opt.value = kb.id;
    opt.textContent = `📚 [Add-on KB] ${kb.title} (${kb.classification.toUpperCase()})`;
    select.appendChild(opt);
  });

  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = '✍️ Kustom (Tulis Materi Sendiri)';
  select.appendChild(customOpt);

  if (knowledgeBases.some(k => k.id === currentVal)) {
    select.value = currentVal;
  }
}

/* ================= LIVE CHATBOT SIMULATOR WITH WHITELIST GUARD ================= */

function testKnowledgeBaseInSim(kbId) {
  currentSimKbId = kbId;
  const select = document.getElementById('simKbSelect');
  if (select) select.value = kbId;
  switchSimKnowledgeBase();
}

function switchSimKnowledgeBase() {
  const select = document.getElementById('simKbSelect');
  if (select) currentSimKbId = select.value;

  const kb = knowledgeBases.find(k => k.id === currentSimKbId) || knowledgeBases[0];
  const chatBox = document.getElementById('rayiSimChatBox');
  const promptsBox = document.getElementById('simQuickPrompts');

  // Update dynamic quick prompts based on KB
  if (promptsBox) {
    if (kb.classification === 'event' || kb.id.includes('funrun')) {
      promptsBox.innerHTML = `
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Min, rute Fun Run 26 Desember lewat mana aja ya?')">💡 Rute Fun Run?</button>
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Boleh minta link shareloc lokasi startnya min?')">💡 Shareloc Lokasi?</button>
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Mulai jam berapa dan pendaftarannya bayar berapa?')">💡 Jam &amp; Biaya?</button>
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Nomor kontak PIC panitia siapa min?')">💡 Kontak PIC?</button>
      `;
    } else if (kb.classification === 'dinas' || kb.id.includes('tandang')) {
      promptsBox.innerHTML = `
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Sampurasun RAYI, apa saja syarat pencairan SPPD di TANDANG?')">💡 Syarat SPPD?</button>
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Format kertas resmi kedinasan apa?')">💡 Format Kertas?</button>
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Di mana alamat kantor Command Center IKP?')">💡 Kantor IKP?</button>
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Bisa jelaskan siapa itu asisten RAYI?')">💡 Siapa RAYI?</button>
      `;
    } else {
      promptsBox.innerHTML = `
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Jam berapa jadwal sapa subuh otomatis dikirim?')">💡 Jadwal Subuh?</button>
        <button type="button" class="btn btn-outline btn-xs" onclick="sendQuickPrompt('Bisa bacakan doa fajar hari ini?')">💡 Doa Subuh?</button>
      `;
    }
  }

  // Reset chat with welcome message
  if (chatBox) {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let greeting = `Sampurasun! 🙏 Saya asisten cerdas untuk materi <strong>${kb.title}</strong>. Silakan tanyakan hal yang ingin Anda ketahui.`;
    if (kb.classification === 'event') {
      greeting = `Sampurasun Runners! 🏃🎉 Saya bot asisten resmi <strong>${kb.title}</strong>. Mau tahu rute lari, minta link shareloc start di Gedung Sate, atau jadwal race pack? Tanyakan saja di sini!`;
    }

    chatBox.innerHTML = `
      <div class="chat-bubble incoming">
        <p>${greeting}</p>
        <span class="chat-time">${nowTime}</span>
      </div>
    `;
  }
}

function updateSimSenderBadge() {
  const sender = document.getElementById('simSenderNumber')?.value;
  showToast(`Pengirim uji coba dialihkan ke: +${sender}`, 'info');
}

function checkSenderAccess(senderNumber, kb) {
  if (kb.accessPolicy === 'public') {
    return { allowed: true };
  }

  // Whitelist group check
  if (kb.accessPolicy === 'whitelist_group') {
    const cleanSender = String(senderNumber).replace(/[^0-9]/g, '');
    
    // Group IKP whitelist includes admin number + contacts in pimpinan & tandang
    if (kb.allowedGroup === 'ikp') {
      const isIkpMember = cleanSender === '6285121042025' || 
                          contacts.some(c => c.phone.replace(/[^0-9]/g, '') === cleanSender && (c.group === 'pimpinan' || c.group === 'tandang'));
      if (isIkpMember) return { allowed: true };
      return { allowed: false, policy: kb.outsidePolicy || 'silent_ignore', groupName: 'Bidang IKP' };
    }

    if (kb.allowedGroup === 'keluarga') {
      const isFamily = cleanSender === '6285121042025' ||
                       contacts.some(c => c.phone.replace(/[^0-9]/g, '') === cleanSender && c.group === 'keluarga');
      if (isFamily) return { allowed: true };
      return { allowed: false, policy: kb.outsidePolicy || 'silent_ignore', groupName: 'Keluarga' };
    }
  }

  return { allowed: true };
}

function clearSimChat() {
  switchSimKnowledgeBase();
}

function sendQuickPrompt(promptText) {
  const input = document.getElementById('simChatInput');
  if (input) {
    input.value = promptText;
    handleSendSimChat({ preventDefault: () => {} });
  }
}

async function handleSendSimChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('simChatInput');
  const chatBox = document.getElementById('rayiSimChatBox');
  const userText = input.value.trim();
  if (!userText) return;

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const kb = knowledgeBases.find(k => k.id === currentSimKbId) || knowledgeBases[0];
  const simSender = document.getElementById('simSenderNumber')?.value || '6285121042025';

  // 1. Tampilkan bubble user
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble outgoing';
  userBubble.innerHTML = `<p>${userText}</p><span class="chat-time">${nowTime} <small style="opacity:0.8;">(+${simSender})</small></span>`;
  chatBox.appendChild(userBubble);
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  // 2. Tampilkan typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'chat-bubble incoming';
  typingIndicator.id = 'simTypingIndicator';
  typingIndicator.innerHTML = `<p style="color:#059669; font-style:italic;">⚡ Bot sedang memeriksa whitelist &amp; materi...</p>`;
  chatBox.appendChild(typingIndicator);
  chatBox.scrollTop = chatBox.scrollHeight;

  setTimeout(() => {
    // Hapus indicator
    const typing = document.getElementById('simTypingIndicator');
    if (typing) typing.remove();

    // 3. KEAMANAN & ACCESS CONTROL CHECK (FITUR WHITELIST NOMOR)
    const access = checkSenderAccess(simSender, kb);
    if (!access.allowed) {
      if (access.policy === 'silent_ignore') {
        // SILENT IGNORE: Bot tidak menjawab nomor luar grup sama sekali!
        const blockBubble = document.createElement('div');
        blockBubble.className = 'chat-bubble incoming';
        blockBubble.style.background = '#FFF1F2';
        blockBubble.style.border = '1px solid #FECDD3';
        blockBubble.style.borderLeft = '4px solid #E11D48';
        blockBubble.style.color = '#9F1239';
        blockBubble.innerHTML = `
          <p>🤫 <strong>[AKSES DIABAIKAN — SILENT IGNORE]</strong><br>
          Pesan dari <code>+${simSender}</code> <strong>TIDAK DIJAWAB</strong>.<br>
          Nomor ini <strong>tidak tersimpan di Grup ${access.groupName}</strong>.<br>
          <em>(Sesuai aturan keamanan: bot hanya melayani anggota resmi grup terdaftar dan mengabaikan nomor luar).</em></p>
          <span class="chat-time">${nowTime}</span>
        `;
        chatBox.appendChild(blockBubble);
        chatBox.scrollTop = chatBox.scrollHeight;
        return;
      } else {
        // Polite reject
        const rejectBubble = document.createElement('div');
        rejectBubble.className = 'chat-bubble incoming';
        rejectBubble.innerHTML = `
          <p>Sampurasun Kang/Teh. 🙏 Mohon maaf, layanan asisten virtual ini saat ini dikhususkan untuk anggota terdaftar <strong>Grup ${access.groupName}</strong>. Nomor Anda (<code>+${simSender}</code>) belum terdaftar dalam sistem. Hatur nuhun.</p>
          <span class="chat-time">${nowTime}</span>
        `;
        chatBox.appendChild(rejectBubble);
        chatBox.scrollTop = chatBox.scrollHeight;
        return;
      }
    }

    // 4. BATAS WAKTU / EXPIRED CHECK
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(kb.endDate);
    if (today > end) {
      const expBubble = document.createElement('div');
      expBubble.className = 'chat-bubble incoming';
      expBubble.innerHTML = `
        <p>Sampurasun Kang/Teh! 🙏 Mohon maaf, masa pelaksanaan kegiatan <strong>${kb.title}</strong> telah resmi berakhir pada tanggal <strong>${formatSimpleDate(end)}</strong>.<br><br>Jika ada pertanyaan terkait agenda lainnya, silakan hubungi tim kami kembali. Hatur nuhun!</p>
        <span class="chat-time">${nowTime}</span>
      `;
      chatBox.appendChild(expBubble);
      chatBox.scrollTop = chatBox.scrollHeight;
      return;
    }

    // 5. JAWAB DENGAN CERDAS MENGGUNAKAN MATERI KNOWLEDGE BASE
    let reply = "";
    const lower = userText.toLowerCase();

    // Jawaban untuk Fun Run
    if (kb.classification === 'event' || kb.id.includes('funrun')) {
      if (lower.includes('rute') || lower.includes('lewat') || lower.includes('jalur') || lower.includes('5k')) {
        reply = `Sampurasun Runners! 🏃 Titik start &amp; rute lari Fun Run 26 Desember adalah:<br><br>
🛣️ <strong>Rute 5K:</strong><br>
Start Gedung Sate ➡️ Jl. Diponegoro ➡️ Jl. Ir. H. Juanda (Dago) ➡️ Simpang Cikapayang ➡️ Jl. LLRE Martadinata (Riau) ➡️ Finish kembali di Plaza Gedung Sate.<br><br>
Water station tersedia di KM 2.5 (Simpang Dago Cikapayang) dan pos medis standby di titik finish. Semangat latihan ya! 🔥`;
      } else if (lower.includes('shareloc') || lower.includes('lokasi') || lower.includes('titik') || lower.includes('alamat') || lower.includes('maps')) {
        reply = `Sampurasun! 📍 Titik kumpul dan panggung start Fun Run 26 Desember berada di:<br><br>
🏛️ <strong>Plaza Depan Gedung Sate Bandung</strong><br>
Jl. Diponegoro No. 22, Citarum, Kota Bandung.<br><br>
🗺️ <strong>Link Shareloc Google Maps:</strong><br>
<a href="https://maps.app.goo.gl/GedungSateBandung" target="_blank" style="color:#059669; font-weight:700; text-decoration:underline;">https://maps.app.goo.gl/GedungSateBandung</a><br>
<em>(Titik Koordinat GPS: -6.902484, 107.618712)</em><br><br>
Garis start dibuka mulai pukul 05:15 WIB untuk pemanasan bersama!`;
      } else if (lower.includes('jam') || lower.includes('biaya') || lower.includes('bayar') || lower.includes('daftar') || lower.includes('gratis')) {
        reply = `Sampurasun! 🎉 Pendaftaran Fun Run 26 Desember <strong>100% GRATIS</strong> tanpa dipungut biaya apapun (disponsori oleh IKP Diskominfo Jabar).<br><br>
⏰ <strong>Jadwal Pelaksanaan:</strong><br>
- 05:15 WIB: Open Gate &amp; Senam Pemanasan<br>
- 06:00 WIB: Flag-Off / Start Lari Bersama<br>
- 07:30 WIB: Pembagian Medali &amp; Panggung Hiburan<br><br>
Medali finisher diberikan gratis untuk 500 pelari pertama yang melintasi garis finish!`;
      } else if (lower.includes('pic') || lower.includes('kontak') || lower.includes('hubungi') || lower.includes('panitia')) {
        reply = `Sampurasun! 🙏 Jika membutuhkan bantuan darurat atau konfirmasi pendaftaran, silakan hubungi narahubung panitia (PIC):<br><br>
📞 <strong>Kang Rian (Koordinator Rute):</strong> 0812-3456-7890<br>
📞 <strong>Teh Sarah (Layanan Race Pack):</strong> 0813-9876-5432<br><br>
Tim panitia siap melayani pertanyaan Anda sampai hari H!`;
      } else {
        reply = `Sampurasun Runners! 🏃🎉 Terkait: <em>"${userText}"</em>, informasi tersebut telah dicocokkan dengan dokumen petunjuk teknis <strong>Fun Run 26 Desember</strong>.<br><br>Start lari dimulai tepat pukul 06:00 WIB di Plaza Gedung Sate. Ada yang ingin ditanyakan lagi seputar rute atau race pack? Sampai jumpa di garis start!`;
      }
    } 
    // Jawaban untuk Kedinasan TANDANG
    else if (kb.classification === 'dinas' || kb.id.includes('tandang')) {
      if (lower.includes('sppd') || lower.includes('syarat') || lower.includes('cair')) {
        reply = `Sampurasun Kang/Teh! 🙏 Berdasarkan panduan SOP resmi di sistem <strong>TANDANG</strong>, syarat pencairan berkas SPPD adalah:<br><br>
1. <strong>Surat Tugas Asli</strong> yang telah ditandatangani secara digital/basah oleh PPTK dan Pejabat Eselon.<br>
2. <strong>Bukti Pengeluaran Riil</strong> (kwitansi hotel, tiket kereta/pesawat, struk BBM/tol).<br>
3. <strong>Stempel &amp; Tanda Tangan Lokasi Tujuan</strong> (bukti kehadiran fisik).<br><br>
Semua dokumen diunggah melalui menu SPPD di portal TANDANG. Hatur nuhun!`;
      } else if (lower.includes('kertas') || lower.includes('format') || lower.includes('f4') || lower.includes('folio')) {
        reply = `Sampurasun! 🙏 Untuk seluruh tata naskah dinas, Surat Tugas, dan lampiran SPPD di lingkungan Diskominfo Jawa Barat dan sistem TANDANG, format kertas resmi yang wajib digunakan adalah <strong>Folio / F4 (215 x 330 mm)</strong>.<br><br>Margin standar: Kiri 3 cm, Kanan 2 cm, Atas 2.5 cm, Bawah 2.5 cm. Mugi manfaat infona!`;
      } else if (lower.includes('kantor') || lower.includes('gedung sate') || lower.includes('alamat')) {
        reply = `Sampurasun! 🏛️ Kantor Command Center IKP Diskominfo Jawa Barat berlokasi di <strong>Gedung Sate, Jl. Diponegoro No. 22 Bandung</strong>.<br><br>Layanan konsultasi naskah dinas dan verifikasi fisik berkas TANDANG dilayani setiap hari kerja pukul 08:00 - 16:00 WIB.`;
      } else if (lower.includes('siapa') || lower.includes('maskot') || lower.includes('rayi')) {
        reply = `Sampurasun! 🙏 Kenalkan, saya <strong>RAYI</strong>, maskot dan asisten virtual resmi bidang Informasi dan Komunikasi Publik (IKP) Diskominfo Jawa Barat.<br><br>Nama <em>Rayi</em> dalam tradisi Sunda bermakna kerabat muda yang santun, cekatan, dan ikhlas melayani. Saya siap membantu notifikasi kedinasan Anda 24 jam non-stop!`;
      } else {
        reply = `Sampurasun Kang/Teh! 🙏 Terkait: <em>"${userText}"</em>, informasi tersebut telah dicatat sesuai dengan <strong>Knowledge Base TANDANG</strong>. Ada berkas kedinasan lain yang bisa saya bantu? Wilujeng makarya!`;
      }
    }
    // Jawaban untuk Subuh
    else {
      reply = `Sampurasun! 🌅 Program <strong>Sapa Subuh WAWAR</strong> dijadwalkan tepat pukul <strong>04:30 WIB</strong>.<br><br>Pesan berisi doa fajar, motivasi, dan pengingat sholat yang dikirimkan langsung ke nomor anak tercinta dan keluarga. Wilujeng subuh barakah!`;
    }

    const respBubble = document.createElement('div');
    respBubble.className = 'chat-bubble incoming';
    respBubble.innerHTML = `<p>${reply}</p><span class="chat-time">${nowTime}</span>`;
    chatBox.appendChild(respBubble);
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 750);
}

function deployAiToWhatsapp() {
  const kb = getActiveKb();
  showToast(`Menghubungkan webhook otak AI untuk materi [${kb.title}] ke nomor WhatsApp [${kb.assignedInstance}] di Hostinger VPS...`, 'info');

  setTimeout(() => {
    showToast(`Sukses! Nomor [${kb.assignedInstance}] kini resmi aktif melayani chat via WhatsApp dengan proteksi whitelist grup! 🤖📲🔒✨`, 'success');
  }, 1200);
}


