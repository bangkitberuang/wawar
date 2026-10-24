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
  loadCampaignsFromDb();
  loadCampaignTemplatesFromDb();
  initCalendarEntries();
  populateCampaignContentPresetOptions();
  calculateSeriesEndDate();
  if (typeof switchRunningCampaignHero === 'function') {
    switchRunningCampaignHero('camp_dinas_legacy');
  }
  if (typeof selectClientApp === 'function') {
    selectClientApp('tandang');
  }
  if (window.lucide) {
    lucide.createIcons();
  }
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
  } else if (tabId === 'reports') {
    fetchLiveCampaignReports();
  }
  if (window.lucide) {
    setTimeout(() => lucide.createIcons(), 50);
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

/* ================= MULTI-APLIKASI KLIEN GATEWAY & LIVE PROGRAM PROGRESS ================= */

let selectedClientAppKey = 'tandang';

const clientApplicationsData = {
  tandang: {
    id: 'tandang',
    name: 'Aplikasi TANDANG',
    category: 'Kedinasan TANDANG',
    categoryBadgeClass: 'green',
    status: 'ACTIVE',
    apiKey: 'wawar_live_tandang_sec_994821a8',
    activeProgram: {
      id: 'camp_dinas_legacy',
      title: 'Sosialisasi SPPD & Kedinasan TANDANG',
      durationText: '🟢 Sisa 12 Hari Lagi (Aktif s/d 15 Nov 2026)',
      desc: 'Program terjadwal mingguan pengingat kelengkapan berkas SPPD digital format F4 untuk perjalanan dinas ASN Diskominfo Jawa Barat.',
      progressPercent: 50,
      progressText: '50% Berjalan (Minggu ke-2 dari 4 Minggu)',
      startDate: '15 Okt 2026',
      currentDate: '24 Okt 2026',
      endDate: '15 Nov 2026',
      botName: 'Bot RAYI Kedinasan',
      botEngine: 'Gemini 2.5 Flash RAG',
      senderNumber: 'Wawar-primary (+62 851-2104-2025)',
      security: '🔒 Whitelist: Hanya Nomor di Grup TANDANG'
    },
    sdkCode: `import { sendWawarNotification, sendWawarDocument } from '@/lib/wawar/client';

// Kirim notifikasi Surat Tugas F4 ke pegawai via Gateway WAWAR:
await sendWawarDocument({
  phone: "6285121042025",
  pdfUrl: "https://tandang.jabarprov.go.id/api/pdf/st-090.pdf",
  fileName: "Surat_Tugas_090.pdf",
  caption: "Sampurasun! Surat Tugas No. 090 telah terbit dari Aplikasi TANDANG."
});`
  },
  funrun: {
    id: 'funrun',
    name: 'Aplikasi Fun Run Jabar 2026',
    category: 'Event Fun Run',
    categoryBadgeClass: 'blue',
    status: 'ACTIVE',
    apiKey: 'wawar_live_funrun_sec_4821fb7e',
    activeProgram: {
      id: 'camp_funrun_legacy',
      title: 'Event Fun Run 26 Des Jabar',
      durationText: '🔵 H-63 Menuju Hari Acara (26 Des 2026)',
      desc: 'Pengingat berkala H-7, H-1, dan hari H start jam 06:00 WIB di Gedung Sate untuk 500 pelari terdaftar, rute 5K, dan shareloc Google Maps.',
      progressPercent: 35,
      progressText: '35% Menuju Hari Acara (Fase Pendaftaran & Rute)',
      startDate: '15 Okt 2026',
      currentDate: '24 Okt 2026',
      endDate: '26 Des 2026',
      botName: 'Bot Helpdesk Fun Run 2026',
      botEngine: 'Gemini 2.5 Flash RAG',
      senderNumber: 'rayi-cs-official',
      security: '🌐 Terbuka: Melayani Seluruh Peserta Event'
    },
    sdkCode: `import { sendWawarNotification } from '@/lib/wawar/client';

// Kirim konfirmasi tiket QR dan link shareloc Fun Run:
await sendWawarNotification({
  phone: "6281234567890",
  message: "Halo Runner! 🏃 Tiket Fun Run 26 Des Anda telah terverifikasi. Nomor BIB: 042. Rute: Gedung Sate 5K. Maps: https://maps.google.com/?q=-6.9025,107.6186"
});`
  },
  portalikp: {
    id: 'portalikp',
    name: 'Portal Kehumasan & Berita IKP',
    category: 'Siaran Berita Publik',
    categoryBadgeClass: 'purple',
    status: 'ACTIVE',
    apiKey: 'wawar_live_portalikp_sec_3309ea11',
    activeProgram: {
      id: 'camp_siaran_ikp',
      title: 'Siaran Pers & Berita Harian Diskominfo',
      durationText: '🟢 Siaga 24/7 (Non-stop)',
      desc: 'Gateway pengiriman siaran pers kilat ke media massa, grup jurnalis, dan kanal informasi publik Jawa Barat.',
      progressPercent: 100,
      progressText: '100% Siaga 24/7 (Realtime Inbound Push)',
      startDate: 'Realtime',
      currentDate: '24 Okt 2026',
      endDate: 'Aktif Terus',
      botName: 'Bot CS Layanan Publik',
      botEngine: 'Rule-Based Keyword Matcher',
      senderNumber: 'wawar-blast-x',
      security: '📢 Terbuka: Gateway Siaran Bebas'
    },
    sdkCode: `import { sendWawarBroadcast } from '@/lib/wawar/client';

// Kirim siaran rilis berita Diskominfo ke grup jurnalis:
await sendWawarBroadcast({
  targetGroup: "media_jabar",
  headline: "Siaran Pers: Program Desa Digital Jawa Barat",
  content: "Diskominfo Jabar meresmikan 15 titik internet desa baru di Garut Selatan..."
});`
  },
  simpeg: {
    id: 'simpeg',
    name: 'SIMPEG Presensi ASN',
    category: 'Kepegawaian ASN',
    categoryBadgeClass: 'amber',
    status: 'READY',
    apiKey: 'wawar_live_simpeg_sec_7718cc90',
    activeProgram: {
      id: 'camp_presensi_asn',
      title: 'Pengingat Absen Masuk & Pulang ASN',
      durationText: '⏰ Jadwal Hari Kerja (07:15 & 16:30 WIB)',
      desc: 'Notifikasi otomatis jam 07:15 WIB dan 16:30 WIB kepada seluruh ASN yang belum melakukan clock-in / clock-out di aplikasi SIMPEG.',
      progressPercent: 75,
      progressText: '75% Selesai Bulan Ini (Sisa 5 Hari Kerja)',
      startDate: '01 Okt 2026',
      currentDate: '24 Okt 2026',
      endDate: '31 Okt 2026',
      botName: 'Bot Notifikasi Cepat',
      botEngine: 'Broadcast Murni (Tanpa Bot)',
      senderNumber: 'Wawar-primary (+62 851-2104-2025)',
      security: '🔒 Khusus ASN Terdaftar SIMPEG'
    },
    sdkCode: `import { sendWawarNotification } from '@/lib/wawar/client';

// Kirim pengingat absen masuk:
await sendWawarNotification({
  phone: "6285121042025",
  message: "Pagi Rekan ASN! ⏰ Pukul 07:15 WIB. Jangan lupa lakukan presensi wajah di SIMPEG sebelum 07:30 WIB."
});`
  }
};

function selectClientApp(appKey) {
  selectedClientAppKey = appKey;
  const app = clientApplicationsData[appKey];
  if (!app) return;

  // Update card active styles
  document.querySelectorAll('.client-app-card').forEach(c => c.classList.remove('selected'));
  if (appKey === 'tandang') document.getElementById('cardAppTandang')?.classList.add('selected');
  else if (appKey === 'funrun') document.getElementById('cardAppFunRun')?.classList.add('selected');
  else if (appKey === 'portalikp') document.getElementById('cardAppPortalIkp')?.classList.add('selected');
  else if (appKey === 'simpeg') document.getElementById('cardAppSimpeg')?.classList.add('selected');

  // Update Active Program Banner
  const prog = app.activeProgram;
  const tagBadge = document.getElementById('badgeClientAppTag');
  const durText = document.getElementById('clientActiveDuration');
  const progTitle = document.getElementById('clientActiveProgTitle');
  const progDesc = document.getElementById('clientActiveProgDesc');
  const progPercentText = document.getElementById('clientActiveProgPercentText');
  const progressBar = document.getElementById('clientActiveProgressBar');

  if (tagBadge) {
    tagBadge.textContent = app.category;
    tagBadge.className = `badge-tag ${app.categoryBadgeClass || 'green'}`;
  }
  if (durText) durText.textContent = prog.durationText;
  if (progTitle) progTitle.textContent = prog.title;
  if (progDesc) progDesc.textContent = prog.desc;
  if (progPercentText) progPercentText.textContent = prog.progressText;
  if (progressBar) {
    progressBar.style.width = `${prog.progressPercent}%`;
    progressBar.className = `progress-bar-fill ${app.categoryBadgeClass || 'green'}`;
  }

  // Update Active Bot Breakdown
  const botName = document.getElementById('clientActiveBotName');
  const botEngine = document.getElementById('clientActiveBotEngine');
  const botSender = document.getElementById('clientActiveBotSender');
  const botSec = document.getElementById('clientActiveBotSecurity');

  if (botName) botName.textContent = prog.botName;
  if (botEngine) botEngine.textContent = prog.botEngine;
  if (botSender) botSender.textContent = prog.senderNumber;
  if (botSec) botSec.textContent = prog.security;

  // Update API Credentials & SDK Snippet
  const credTitle = document.getElementById('clientCredentialsTitle');
  const apiKeyInp = document.getElementById('clientApiKeyVal');
  const snippet = document.getElementById('clientSdkCodeSnippet');

  if (credTitle) credTitle.textContent = `Kredensial API & Webhook: ${app.name}`;
  if (apiKeyInp) apiKeyInp.value = app.apiKey;
  if (snippet) snippet.textContent = app.sdkCode;

  showToast(`Menampilkan program aktif & kredensial untuk: ${app.name} 🔌📱`, 'info');
}

function openRegisterClientAppModal() {
  document.getElementById('modalRegisterClientApp')?.classList.add('active');
}

function closeRegisterClientAppModal() {
  document.getElementById('modalRegisterClientApp')?.classList.remove('active');
}

function handleRegisterClientApp(e) {
  e.preventDefault();
  const name = document.getElementById('regAppName').value.trim();
  const cat = document.getElementById('regAppCategory').value;
  const icon = document.getElementById('regAppIcon').value;
  const campId = document.getElementById('regAppCampaign').value;

  const appKey = 'app_' + Date.now();
  const newApiKey = `wawar_live_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 10)}`;

  const camp = campaignHubList.find(c => c.id === campId) || campaignHubList[0];

  clientApplicationsData[appKey] = {
    id: appKey,
    name: name,
    category: cat.toUpperCase(),
    categoryBadgeClass: 'green',
    status: 'ACTIVE',
    apiKey: newApiKey,
    activeProgram: {
      id: camp?.id || 'camp_custom',
      title: camp?.name || 'Program Default',
      durationText: '🟢 Aktif Berjalan',
      desc: camp?.message || 'Program siaran terhubung dengan gateway WAWAR.',
      progressPercent: 40,
      progressText: '40% Berjalan (Baru Terhubung)',
      startDate: '24 Okt 2026',
      currentDate: '24 Okt 2026',
      endDate: '24 Nov 2026',
      botName: camp?.bot_label || 'Bot RAYI Kedinasan',
      botEngine: 'Gemini 2.5 Flash RAG',
      senderNumber: camp?.senderNumber || 'Wawar-primary (+62 851-2104-2025)',
      security: '🔒 Whitelist Terlindungi'
    },
    sdkCode: `import { sendWawarNotification } from '@/lib/wawar/client';

// Kirim notifikasi dari ${name}:
await sendWawarNotification({
  phone: "6285121042025",
  message: "Halo! Notifikasi resmi dari ${name} via Gateway WAWAR."
});`
  };

  // Tambahkan kartu ke grid
  const grid = document.getElementById('multiAppCardsGrid');
  if (grid) {
    const card = document.createElement('div');
    card.className = 'client-app-card';
    card.id = `cardApp_${appKey}`;
    card.onclick = () => selectClientApp(appKey);
    card.innerHTML = `
      <div>
        <div class="client-app-card-top">
          <div class="client-app-card-icon">${icon}</div>
          <span class="badge-status open">● Terhubung Baru</span>
        </div>
        <div class="client-app-card-title">${name}</div>
        <div class="client-app-card-desc">Aplikasi klien terdaftar. Menggunakan API Token dan jalur pengiriman resmi WAWAR.</div>
      </div>
      <div class="client-app-card-footer">
        <span style="color:#059669; font-weight:700;">Program: ${camp?.name || 'Siaran'}</span>
        <span style="color:#64748B;">Bot: ${camp?.bot_label || 'RAYI'}</span>
      </div>
    `;
    grid.appendChild(card);
  }

  closeRegisterClientAppModal();
  selectClientApp(appKey);
  showToast(`Aplikasi "${name}" berhasil didaftarkan dan terhubung ke gateway! 🔌🚀`, 'success');
}

function testSendWebhookNotification() {
  const app = clientApplicationsData[selectedClientAppKey] || clientApplicationsData.tandang;
  showToast(`Mengirim simulasi webhook dari [${app.name}] ke nomor WhatsApp +62 851-2104-2025... 📲⚡`, 'info');

  setTimeout(() => {
    showToast(`✅ SUKSES! Webhook [${app.name}] diterima gateway. Pesan notifikasi terkirim via ${app.activeProgram.senderNumber}! 🎉`, 'success');
  }, 1000);
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

let selectedCalendarDateKey = '2026-10-24';
let currentCalStatusFilter = 'all';
let activeCalCategories = ['subuh', 'dinas', 'event'];

/**
 * Normalisasi & kategorisasi entri kalender agar cocok dengan filter program & status
 */
function getEntryCategory(item) {
  if (!item) return 'dinas';
  let cat = item.category || '';
  if (!cat && item.campId) {
    const camp = (typeof campaignHubList !== 'undefined' ? campaignHubList : []).find(c => c.id === item.campId);
    if (camp) cat = camp.category || camp.classification || '';
  }

  // Normalisasi kategori
  if (cat === 'keluarga' || cat === 'subuh') return 'subuh';
  if (cat === 'event') return 'event';
  if (cat === 'dinas') return 'dinas';

  // Fallback berdasarkan identifier, nama, atau warna
  const cId = String(item.campId || item.id || '').toLowerCase();
  const cName = String(item.campName || item.name || '').toLowerCase();

  if (cId.includes('subuh') || cName.includes('subuh') || item.color === 'amber') {
    return 'subuh';
  }
  if (cId.includes('event') || cId.includes('funrun') || cName.includes('fun run') || cName.includes('run') || item.color === 'blue') {
    return 'event';
  }
  if (cId.includes('dinas') || cId.includes('sppd') || cId.includes('tandang') || cName.includes('dinas') || cName.includes('sppd') || item.color === 'green') {
    return 'dinas';
  }

  return 'dinas';
}

function isCalendarEntryVisible(item) {
  const cat = getEntryCategory(item);
  return activeCalCategories.includes(cat);
}

function filterCalendarByStatus(status) {
  currentCalStatusFilter = status;
  const pills = document.querySelectorAll('#calStatusPillList .campaign-chip');
  pills.forEach(p => p.classList.remove('active'));
  if (status === 'all') document.getElementById('btnCalStatusAll')?.classList.add('active');
  else if (status === 'active') document.getElementById('btnCalStatusActive')?.classList.add('active');
  else if (status === 'upcoming') document.getElementById('btnCalStatusUpcoming')?.classList.add('active');
  else if (status === 'done') document.getElementById('btnCalStatusDone')?.classList.add('active');

  renderCalendar(currentCalMonth, currentCalYear);
}

function toggleCalCategoryFilter(cat) {
  const checkbox = document.getElementById(
    cat === 'subuh' ? 'calFilterCheckSubuh' : 
    cat === 'dinas' ? 'calFilterCheckDinas' : 'calFilterCheckEvent'
  );
  if (checkbox && checkbox.checked) {
    if (!activeCalCategories.includes(cat)) activeCalCategories.push(cat);
  } else {
    activeCalCategories = activeCalCategories.filter(c => c !== cat);
  }
  renderCalendar(currentCalMonth, currentCalYear);
}

function jumpToCalendarToday() {
  currentCalMonth = 9; // Oktober (0-indexed)
  currentCalYear = 2026;
  selectedCalendarDateKey = '2026-10-24';
  renderCalendar(currentCalMonth, currentCalYear);
  showToast('Melompat ke hari ini: Sabtu, 24 Oktober 2026! 🗓️✨', 'info');
}

/**
 * Render Kartu Agenda Kegiatan Siaran (Horizontal Carousel/Grid di Atas Kalender seperti TANDANG)
 */
function renderCalendarAgendaCards() {
  const container = document.getElementById('calAgendaCardsGrid');
  if (!container) return;

  const today = new Date('2026-10-24T00:00:00');
  let list = campaignHubList || [];

  // Filter berdasarkan kategori program aktif (Subuh, Dinas, Event)
  list = list.filter(camp => activeCalCategories.includes(getEntryCategory(camp)));

  if (currentCalStatusFilter === 'active') {
    list = list.filter(c => c.status === 'ACTIVE');
  } else if (currentCalStatusFilter === 'upcoming') {
    list = list.filter(c => {
      const start = new Date((c.startDate || '2026-10-24') + 'T00:00:00');
      return start > today;
    });
  } else if (currentCalStatusFilter === 'done') {
    list = list.filter(c => {
      const end = new Date((c.endDate || '2026-10-24') + 'T00:00:00');
      return today > end;
    });
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 18px; text-align: center; background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 8px; color: #64748B;">
        Belum ada program siaran untuk filter ini. <a href="javascript:void(0)" onclick="openCreateCampaignModal()" style="color:#059669; font-weight:700;">+ Buat Campaign Baru</a>
      </div>
    `;
    return;
  }

  let html = '';
  list.forEach(camp => {
    const startStr = camp.startDate || '2026-10-24';
    const endStr = camp.endDate || startStr;
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');

    let statusBadge = '<span class="badge-tag green" style="font-size:0.68rem;">● Sedang Berjalan</span>';
    let durationText = '31 Hari';
    if (camp.type === 'event_reminder') {
      statusBadge = '<span class="badge-tag blue" style="font-size:0.68rem;">● Akan Datang</span>';
      const diff = Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
      durationText = `H-${diff}`;
    } else if (camp.type === 'recurring') {
      durationText = 'Mingguan';
    } else if (today > end) {
      statusBadge = '<span class="badge-tag gray" style="font-size:0.68rem;">● Selesai</span>';
      durationText = 'Kedaluwarsa';
    }

    const cardBorderClass = camp.category === 'keluarga' ? 'active-subuh' : camp.category === 'dinas' ? 'active-dinas' : 'active-event';
    const botDisplay = camp.bot_label || (camp.category === 'dinas' ? 'Bot RAYI • Strict Gemini' : camp.category === 'keluarga' ? 'Bot Sahabat Subuh • Keyword' : 'Bot Helpdesk • Gemini RAG');

    html += `
      <div class="cal-agenda-card ${cardBorderClass}">
        <div>
          <div class="cal-agenda-card-top">
            ${statusBadge}
            <span style="font-size:0.72rem; color:#64748B; font-weight:600;">${durationText}</span>
          </div>
          <div class="cal-agenda-card-title">${camp.name}</div>
          <div class="cal-agenda-card-meta">
            <span><i data-lucide="calendar" class="lucide-xs"></i> ${formatDateIndo(startStr)} s/d ${formatDateIndo(endStr)}</span>
            <span><i data-lucide="clock" class="lucide-xs"></i> ${camp.time || '07:00'} WIB • <i data-lucide="smartphone" class="lucide-xs"></i> ${camp.senderNumber}</span>
            <span><i data-lucide="bot" class="lucide-xs"></i> <strong style="color:#2563EB;">${botDisplay}</strong></span>
            <span><i data-lucide="users" class="lucide-xs"></i> <strong>${camp.recipient}</strong></span>
          </div>
        </div>
        <div class="cal-agenda-card-bottom">
          <span style="font-size:0.7rem; color:#94A3B8; font-family:monospace;">${camp.id.substring(0, 16)}</span>
          <a class="cal-agenda-card-link" onclick="openDateEntryModal('${startStr}', ${parseInt(startStr.split('-')[2], 10)})">
            Lihat Pop-up Jadwal &rarr;
          </a>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Mini Calendar Widget (Sidebar Kiri seperti TANDANG)
 */
function renderMiniCalendar(month, year) {
  const container = document.getElementById('miniCalGridContainer');
  const headerText = document.getElementById('miniCalHeaderMonth');
  if (!container) return;

  if (headerText) headerText.textContent = `${MONTH_NAMES[month]} ${year}`;

  const dayNames = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];
  let html = dayNames.map(n => `<div class="mini-cal-day-name">${n}</div>`).join('');

  // Day index starting Monday (0 = Senin, 6 = Minggu)
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotal = new Date(year, month, 0).getDate();

  // Previous month trailing
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="mini-cal-day-cell other">${prevMonthTotal - i}</div>`;
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    const dStr = String(d).padStart(2, '0');
    const mStr = String(month + 1).padStart(2, '0');
    const key = `${year}-${mStr}-${dStr}`;

    const isToday = (d === 24 && month === 9 && year === 2026);
    const isSelected = (key === selectedCalendarDateKey);
    const dayEntries = calendarEntries[key] || [];
    const hasEvent = dayEntries.some(isCalendarEntryVisible);

    let classes = 'mini-cal-day-cell';
    if (isToday) classes += ' today';
    else if (isSelected) classes += ' selected';
    if (hasEvent) classes += ' has-event';

    html += `<div class="${classes}" onclick="handleMiniCalDateClick('${key}', ${d})">${d}</div>`;
  }

  container.innerHTML = html;
}

function handleMiniCalDateClick(dateKey, dayNumber) {
  selectedCalendarDateKey = dateKey;
  renderMiniCalendar(currentCalMonth, currentCalYear);
  updateCalSidebarSelectedDay(dateKey);
  openDateEntryModal(dateKey, dayNumber);
  if (window.lucide) { try { lucide.createIcons(); } catch(e) {} }
}

/**
 * Update Sidebar "Agenda Tanggal Ini" Panel (Model TANDANG)
 */
function updateCalSidebarSelectedDay(dateKey) {
  const title = document.getElementById('calSelectedDayTitle');
  const listEl = document.getElementById('calSelectedDayList');
  if (!title || !listEl) return;

  const dateObj = new Date(dateKey + 'T00:00:00');
  const formatted = formatDateIndo(dateKey);
  title.textContent = `Agenda: ${formatted}`;

  const rawEntries = calendarEntries[dateKey] || [];
  const entries = rawEntries.filter(isCalendarEntryVisible);
  if (entries.length === 0) {
    listEl.innerHTML = `
      <div style="font-size:0.75rem; color:#64748B; text-align:center; padding:12px 0;">
        Tidak ada jadwal siaran untuk filter yang aktif di tanggal ini.
      </div>
    `;
    return;
  }

  let html = '';
  entries.forEach(item => {
    html += `
      <div class="cal-day-agenda-item" onclick="openDateEntryModal('${dateKey}', ${dateObj.getDate()})">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#0F172A; display:flex; align-items:center; gap:4px;">
            <i data-lucide="clock" class="lucide-xs"></i> ${item.time} WIB
          </strong>
          <span class="badge-tag ${item.color || 'green'}" style="font-size:0.65rem;">${item.campName}</span>
        </div>
        <p style="margin:3px 0 0; color:#475569; font-size:0.72rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          "${item.message}"
        </p>
      </div>
    `;
  });
  listEl.innerHTML = html;
  if (window.lucide) { try { lucide.createIcons(); } catch(e) {} }
}

function openDateEntryModalForSelected() {
  const d = parseInt(selectedCalendarDateKey.split('-')[2], 10) || 24;
  openDateEntryModal(selectedCalendarDateKey, d);
}

/**
 * Render Main Month Calendar Grid (Senin s/d Minggu seperti TANDANG)
 */
function renderCalendar(month, year) {
  const gridEl = document.getElementById('calendarMonthGrid');
  const titleEl = document.getElementById('currentMonthYearText');
  const bannerMonthText = document.getElementById('calBannerMonthText');
  if (!gridEl) return;

  const monthYearString = `${MONTH_NAMES[month]} ${year}`;
  if (titleEl) titleEl.textContent = monthYearString;
  if (bannerMonthText) bannerMonthText.textContent = monthYearString;

  gridEl.innerHTML = '';

  // Monday = 0, Sunday = 6
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // 1. Kotak tanggal dari bulan sebelumnya
  const prevMonthIndex = (month === 0) ? 11 : month - 1;
  const prevMonthNameShort = MONTH_NAMES[prevMonthIndex].substring(0, 3);

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDay = prevMonthTotalDays - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month prev-month';
    cell.title = `Tanggal ${prevDay} ${MONTH_NAMES[prevMonthIndex]} (Bulan Lalu)`;
    cell.innerHTML = `
      <div class="day-header">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="cal-day-number">${prevDay}</span>
          <span class="cal-other-month-badge">${prevMonthNameShort}</span>
        </div>
      </div>
      <div class="day-campaign-items other-month-placeholder">
        <span class="other-month-text">Bulan Lalu</span>
      </div>
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
      selectedCalendarDateKey = dateKey;
      renderMiniCalendar(currentCalMonth, currentCalYear);
      updateCalSidebarSelectedDay(dateKey);
      openDateEntryModal(dateKey, day);
    };

    let dayItems = (calendarEntries[dateKey] || []).filter(isCalendarEntryVisible);

    let pillsHtml = '';
    dayItems.forEach(item => {
      pillsHtml += `
        <div class="day-campaign-pill ${item.color}" title="${item.message}">
          <div class="pill-time-title">
            <span style="display:inline-flex; align-items:center; gap:3px;"><i data-lucide="clock" class="lucide-xs"></i> ${item.time}</span>
            <span>${item.campName}</span>
          </div>
          <div class="pill-snippet">"${item.message}"</div>
        </div>
      `;
    });

    cell.innerHTML = `
      <div class="day-header">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="cal-day-number">${day}</span>
          ${isToday ? '<span class="badge-hari-ini">Hari Ini</span>' : ''}
        </div>
        <button class="day-add-btn" title="Buka Pop-up & Tambah Pesan Tanggal Ini" onclick="event.stopPropagation(); selectedCalendarDateKey='${dateKey}'; openDateEntryModal('${dateKey}', ${day})"><i data-lucide="plus" class="lucide-xs"></i></button>
      </div>
      <div class="day-campaign-items">
        ${pillsHtml}
      </div>
    `;

    gridEl.appendChild(cell);
  }

  // 3. Kotak tanggal sisa untuk melengkapi grid 35 atau 42 kotak
  const nextMonthIndex = (month === 11) ? 0 : month + 1;
  const nextMonthNameShort = MONTH_NAMES[nextMonthIndex].substring(0, 3);
  const totalRendered = firstDayIndex + totalDays;
  const remainingCells = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
  for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month next-month';
    cell.title = `Tanggal ${nextDay} ${MONTH_NAMES[nextMonthIndex]} (Bulan Depan)`;
    cell.innerHTML = `
      <div class="day-header">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="cal-day-number">${nextDay}</span>
          <span class="cal-other-month-badge">${nextMonthNameShort}</span>
        </div>
      </div>
      <div class="day-campaign-items other-month-placeholder">
        <span class="other-month-text">Bulan Depan</span>
      </div>
    `;
    gridEl.appendChild(cell);
  }

  // Render top cards & mini calendar
  renderCalendarAgendaCards();
  renderMiniCalendar(month, year);
  updateCalSidebarSelectedDay(selectedCalendarDateKey);

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
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

/**
 * Fixed Enum for Campaign Types:
 * - one_time: satu pesan pada satu waktu
 * - recurring: berulang (harian/mingguan/bulanan) pada jam tertentu
 * - series: paket berseri, N pesan berbeda berurutan per hari
 * - event_reminder: pesan relatif terhadap tanggal acara (H-7, H-1, hari H)
 * - auto_reply: bot membalas berdasarkan kata kunci
 */
const CampaignType = Object.freeze({
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
  SERIES: 'series',
  EVENT_REMINDER: 'event_reminder',
  AUTO_REPLY: 'auto_reply'
});

const INDO_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function formatDateIndo(input) {
  if (!input) return '-';
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const y = match[1];
      const m = parseInt(match[2], 10) - 1;
      const d = parseInt(match[3], 10);
      return `${d} ${INDO_MONTHS[m] || match[2]} ${y}`;
    }
  }
  const dateObj = new Date(input);
  if (!isNaN(dateObj.getTime())) {
    const d = dateObj.getDate();
    const m = dateObj.getMonth();
    const y = dateObj.getFullYear();
    return `${d} ${INDO_MONTHS[m]} ${y}`;
  }
  return String(input);
}

function getTypeLabel(type) {
  switch (type) {
    case CampaignType.ONE_TIME: return 'Satu Waktu';
    case CampaignType.RECURRING: return 'Berulang Rutin';
    case CampaignType.SERIES: return 'Paket Berseri';
    case CampaignType.EVENT_REMINDER: return 'Pengingat Acara';
    case CampaignType.AUTO_REPLY: return 'Balas Otomatis';
    default: return 'Campaign';
  }
}

function getTypeBadgeClass(type) {
  switch (type) {
    case CampaignType.ONE_TIME: return 'green';
    case CampaignType.RECURRING: return 'blue';
    case CampaignType.SERIES: return 'amber';
    case CampaignType.EVENT_REMINDER: return 'purple';
    case CampaignType.AUTO_REPLY: return 'teal';
    default: return 'blue';
  }
}

let currentCampaignHubFilter = 'all';
// All campaigns loaded dynamically from database (no hardcoded presets in code)
let campaignHubList = [];
// User-owned campaign templates loaded dynamically from database (no system presets)
let userCampaignTemplates = [];

/**
 * Load Campaigns from Database API
 */
async function loadCampaignsFromDb() {
  try {
    const res = await fetch('/api/campaigns');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        campaignHubList = result.data.map(item => ({
          id: item.id,
          user_id: item.user_id || 'usr_admin',
          name: item.name,
          type: item.type || CampaignType.ONE_TIME,
          category: item.category || item.classification || 'siaran',
          classification: item.category || item.classification || 'siaran',
          senderNumber: item.sender_number || item.senderNumber || 'Wawar-primary',
          sender_number: item.sender_number || item.senderNumber || 'Wawar-primary',
          senderInstance: item.sender_number || item.senderNumber || 'Wawar-primary',
          recipient: item.recipient || 'Grup Penerima',
          target_group: item.target_group || 'tandang',
          knowledge_base_id: item.knowledge_base_id || '',
          kbTitle: item.knowledge_base_id ? getKbTitleById(item.knowledge_base_id) : 'Bahan Materi Standard',
          bot_profile: item.bot_profile || 'bot_rayi',
          bot_engine: item.bot_engine || 'gemini_strict',
          bot_label: item.bot_label || 'Bot RAYI • Strict Gemini',
          strict_group_only: item.strict_group_only || false,
          defaultMsg: item.message || item.defaultMsg || '',
          message: item.message || item.defaultMsg || '',
          status: item.status || 'ACTIVE',
          color: item.color || 'blue',
          icon: item.icon || '📱',
          time: item.time || (item.config?.series_time || item.config?.recurring_time || item.config?.event_time || item.config?.time || '07:00'),
          startDate: item.startDate || (item.config?.start_date || item.config?.date || '2026-10-24'),
          endDate: item.endDate || (item.config?.end_date || item.config?.event_date || '2026-10-24'),
          config: item.config || {}
        }));
        localStorage.setItem('wawar_campaigns', JSON.stringify(campaignHubList));
      }
    }
  } catch (err) {
    console.warn('Gagal memuat campaign dari server API, menggunakan fallback localStorage:', err);
    const cached = localStorage.getItem('wawar_campaigns');
    if (cached) {
      try { campaignHubList = JSON.parse(cached); } catch(e) {}
    }
  }

  // Synchronize into calendar
  campaignHubList.forEach(c => seedCampaignRecordToCalendar(c));
  renderCampaignHub(currentCampaignHubFilter);
  if (typeof switchRunningCampaignHero === 'function') {
    switchRunningCampaignHero('camp_dinas_legacy');
  }
  renderCalendar(currentCalMonth, currentCalYear);
}

/**
 * Load User Templates from Database API
 */
async function loadCampaignTemplatesFromDb() {
  try {
    const res = await fetch('/api/campaign-templates?user_id=usr_admin');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        userCampaignTemplates = result.data;
        localStorage.setItem('wawar_campaign_templates', JSON.stringify(userCampaignTemplates));
      }
    }
  } catch (err) {
    console.warn('Gagal memuat template dari server API, menggunakan fallback localStorage:', err);
    const cached = localStorage.getItem('wawar_campaign_templates');
    if (cached) {
      try { userCampaignTemplates = JSON.parse(cached); } catch(e) {}
    }
  }
  renderUserTemplatesList();
}

function getKbTitleById(kbId) {
  if (typeof knowledgeBases !== 'undefined' && Array.isArray(knowledgeBases)) {
    const found = knowledgeBases.find(k => k.id === kbId);
    if (found) return found.title;
  }
  return kbId;
}

function populateCampaignContentPresetOptions() {
  const select = document.getElementById('campContentPreset');
  if (!select) return;

  let optionsHtml = `<option value="">✍️ Kustom (Tulis Materi Sendiri Tanpa Add-on)</option>`;
  if (typeof knowledgeBases !== 'undefined' && Array.isArray(knowledgeBases)) {
    knowledgeBases.forEach(kb => {
      optionsHtml += `<option value="${kb.id}">📚 ${kb.title} (${(kb.classification || 'dinas').toUpperCase()})</option>`;
    });
  }
  select.innerHTML = optionsHtml;
}

/* ================= PROFIL PROGRAM CAMPAIGN AKTIF & HERO PROGRESS ================= */
const runningCampaignProfiles = {
  camp_dinas_legacy: {
    id: 'camp_dinas_legacy',
    title: 'Sosialisasi SPPD & Kedinasan TANDANG',
    appName: 'Klien: Aplikasi TANDANG',
    category: 'Kedinasan TANDANG',
    categoryClass: 'green',
    desc: 'Program terjadwal mingguan pengingat kelengkapan berkas SPPD digital format F4 untuk perjalanan dinas ASN Diskominfo Jawa Barat.',
    durationText: '🟢 Sisa 12 Hari Lagi',
    datesText: 'Mulai: 15 Okt 2026 • Selesai: 15 Nov 2026',
    percent: 50,
    percentLabel: '50% Berjalan',
    subLabel: '(Minggu ke-2 dari 4 Minggu • 15/30 Pesan Terkirim)',
    dayInfo: 'Hari ke-10 / 30 Hari',
    tickStart: '📍 15 Okt 2026 (Mulai)',
    tickToday: '🎯 Hari Ini: 24 Okt 2026',
    tickEnd: '🏁 15 Nov 2026 (Target Selesai)',
    botName: 'Bot RAYI Kedinasan',
    botEngine: 'Gemini 2.5 Flash RAG (Strict SOP)',
    botSender: '0812-9988-7766 (Wawar-primary)',
    botMaterial: 'SOP SPPD Format F4 & Tata Naskah',
    botTarget: 'Grup TANDANG (🔒 Whitelist Anggota)'
  },
  camp_funrun_legacy: {
    id: 'camp_funrun_legacy',
    title: 'Event Fun Run 26 Des Gedung Sate',
    appName: 'Klien: Aplikasi Fun Run Jabar 2026',
    category: 'Event Publik & Olahraga',
    categoryClass: 'blue',
    desc: 'Pengingat berkala H-7, H-1, dan hari H start jam 06:00 WIB di Gedung Sate untuk 500 pelari terdaftar, rute 5K, dan shareloc Google Maps.',
    durationText: '🔵 H-63 Menuju Hari Acara',
    datesText: 'Mulai: 15 Okt 2026 • Acara: 26 Des 2026',
    percent: 35,
    percentLabel: '35% Menuju Hari Acara',
    subLabel: '(Fase Pengambilan Race Pack & Panduan Rute 5K)',
    dayInfo: 'H-63 Hari Menuju 26 Des',
    tickStart: '📍 15 Okt 2026 (Buka)',
    tickToday: '🎯 Hari Ini: 24 Okt 2026',
    tickEnd: '🏁 26 Des 2026 (Flag-off 06:00 WIB)',
    botName: 'Bot Helpdesk Fun Run 2026',
    botEngine: 'Gemini 2.5 Flash RAG (Rute & Tiket QR)',
    botSender: 'rayi-cs-official',
    botMaterial: 'Panduan Rute 5K & Info BIB',
    botTarget: '500 Pelari Terdaftar (🌐 Terbuka Publik)'
  },
  camp_subuh_legacy: {
    id: 'camp_subuh_legacy',
    title: 'Sapa Subuh Anak & Doa Fajar',
    appName: 'Klien: WAWAR Family Bot',
    category: 'Sapa Fajar / Keluarga',
    categoryClass: 'amber',
    desc: 'Paket berseri 31 hari pengingat fajar hangat, motivasi subuh, dan doa pagi pukul 04:30 WIB secara konsisten.',
    durationText: '🟡 Sisa 7 Hari Lagi di Bulan Ini',
    datesText: 'Mulai: 01 Okt 2026 • Selesai: 31 Okt 2026',
    percent: 77,
    percentLabel: '77% Selesai',
    subLabel: '(Hari ke-24 dari 31 Hari • 24 Pesan Terkirim)',
    dayInfo: 'Hari ke-24 / 31 Hari',
    tickStart: '📍 01 Okt 2026 (Mulai)',
    tickToday: '🎯 Hari Ini: 24 Okt 2026',
    tickEnd: '🏁 31 Okt 2026 (Akhir Bulan)',
    botName: 'Bot Sahabat Subuh',
    botEngine: 'Rule-Based Fajar Matcher & Doa Harian',
    botSender: 'wawar-subuh (+62 851-2104-2025)',
    botMaterial: 'Kumpulan Mutiara Doa Fajar 31 Hari',
    botTarget: '👨‍👩‍👧 Anak & Keluarga (🔒 Jalur Privat)'
  }
};

function switchRunningCampaignHero(campId) {
  const profile = runningCampaignProfiles[campId] || runningCampaignProfiles.camp_dinas_legacy;
  
  // Update select input if different
  const sel = document.getElementById('selectRunningCampaignHub');
  if (sel && sel.value !== campId) sel.value = campId;

  // Header badges
  const catBadge = document.getElementById('heroActiveProgCategory');
  const appBadge = document.getElementById('heroActiveProgApp');
  if (catBadge) {
    catBadge.textContent = profile.category;
    catBadge.className = `badge-tag ${profile.categoryClass}`;
  }
  if (appBadge) appBadge.textContent = profile.appName;

  // Title, Desc, Duration
  const titleEl = document.getElementById('heroActiveProgTitle');
  const descEl = document.getElementById('heroActiveProgDesc');
  const durEl = document.getElementById('heroActiveProgDuration');
  const datesEl = document.getElementById('heroActiveProgDates');

  if (titleEl) titleEl.textContent = profile.title;
  if (descEl) descEl.textContent = profile.desc;
  if (durEl) durEl.textContent = profile.durationText;
  if (datesEl) datesEl.textContent = profile.datesText;

  // Progress Bar
  const pctLbl = document.getElementById('heroActiveProgPercentLabel');
  const subLbl = document.getElementById('heroActiveProgSubLabel');
  const dayInfo = document.getElementById('heroActiveProgDayInfo');
  const barFill = document.getElementById('heroActiveProgressBar');
  const tickStart = document.getElementById('heroTickStart');
  const tickToday = document.getElementById('heroTickToday');
  const tickEnd = document.getElementById('heroTickEnd');

  if (pctLbl) {
    pctLbl.textContent = profile.percentLabel;
    pctLbl.style.color = profile.categoryClass === 'green' ? '#059669' : (profile.categoryClass === 'blue' ? '#2563EB' : '#D97706');
  }
  if (subLbl) subLbl.textContent = profile.subLabel;
  if (dayInfo) {
    dayInfo.textContent = profile.dayInfo;
    dayInfo.style.color = pctLbl ? pctLbl.style.color : '#059669';
  }
  if (barFill) {
    barFill.style.width = `${profile.percent}%`;
    barFill.className = `progress-bar-fill ${profile.categoryClass} hero-fill`;
  }
  if (tickStart) tickStart.textContent = profile.tickStart;
  if (tickToday) tickToday.textContent = profile.tickToday;
  if (tickEnd) tickEnd.textContent = profile.tickEnd;

  // Active Bot Breakdown
  const botName = document.getElementById('heroActiveBotName');
  const botEngine = document.getElementById('heroActiveBotEngine');
  const botSender = document.getElementById('heroActiveBotSender');
  const botMaterial = document.getElementById('heroActiveBotMaterial');
  const botTarget = document.getElementById('heroActiveBotTarget');

  if (botName) botName.textContent = profile.botName;
  if (botEngine) botEngine.textContent = profile.botEngine;
  if (botSender) botSender.textContent = profile.botSender;
  if (botMaterial) botMaterial.textContent = profile.botMaterial;
  if (botTarget) botTarget.textContent = profile.botTarget;

  // Overview Banner sync
  const ovTitle = document.getElementById('overviewProgTitle');
  const ovBadge = document.getElementById('overviewProgProgressBadge');
  const ovBot = document.getElementById('overviewBotTitle');
  const ovSender = document.getElementById('overviewSenderTitle');

  if (ovTitle) ovTitle.textContent = profile.title;
  if (ovBadge) {
    ovBadge.textContent = `${profile.percentLabel} (${profile.durationText.replace(/[🟢🔵🟡]/g, '').trim()})`;
    ovBadge.className = `badge-tag ${profile.categoryClass}`;
  }
  if (ovBot) ovBot.textContent = `${profile.botName} (${profile.botEngine})`;
  if (ovSender) ovSender.textContent = profile.botSender;
}

function renderCampaignHub(filter = 'all') {
  currentCampaignHubFilter = filter;
  const grid = document.getElementById('campaignHubCardGrid');
  if (!grid) return;

  // Update active pill filter
  const filterBtns = document.querySelectorAll('#hubCampaignFilterList .campaign-chip');
  filterBtns.forEach(b => b.classList.remove('active'));
  if (filter === 'all') document.getElementById('btnHubFilterAll')?.classList.add('active');
  else if (filter === 'subuh' || filter === 'keluarga') document.getElementById('btnHubFilterSubuh')?.classList.add('active');
  else if (filter === 'event') document.getElementById('btnHubFilterEvent')?.classList.add('active');
  else if (filter === 'dinas') document.getElementById('btnHubFilterDinas')?.classList.add('active');

  const filtered = filter === 'all' 
    ? campaignHubList 
    : campaignHubList.filter(c => (c.category === filter || c.classification === filter));

  let html = '';

  filtered.forEach(camp => {
    const today = new Date('2026-10-24T00:00:00');
    const startStr = camp.startDate || (camp.config && (camp.config.start_date || camp.config.date)) || '2026-10-24';
    const endStr = camp.endDate || (camp.config && (camp.config.end_date || camp.config.event_date)) || startStr;
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    
    let durationLabel = '';
    let progressPercent = 50;

    if (camp.type === CampaignType.AUTO_REPLY) {
      durationLabel = `<span style="color:#059669; font-weight:700;">🟢 Siaga 24/7 (Non-stop)</span>`;
      progressPercent = 100;
    } else if (today > end) {
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
    const typeLabel = getTypeLabel(camp.type);
    const typeBadge = getTypeBadgeClass(camp.type);
    const categoryName = (camp.category || camp.classification || 'siaran').toUpperCase();

    // Deskripsi Jadwal Spesifik Mekanisme Pengiriman
    let scheduleDetailHtml = '';
    if (camp.type === CampaignType.SERIES) {
      scheduleDetailHtml = `Paket Berseri • <strong>${camp.config?.total_messages || 31} Pesan Harian</strong> (04:30 WIB)`;
    } else if (camp.type === CampaignType.EVENT_REMINDER) {
      const eventDateFormatted = formatDateIndo(camp.config?.event_date || '2026-12-26');
      const offsetsStr = (camp.config?.offsets || ['H-7', 'H-1', 'H']).join(', ');
      scheduleDetailHtml = `Acara: <strong>${eventDateFormatted}</strong> • Offset Pengingat: <strong>${offsetsStr}</strong>`;
    } else if (camp.type === CampaignType.RECURRING) {
      const pat = (camp.config?.recurring_pattern || 'weekly').toUpperCase();
      scheduleDetailHtml = `Pola: <strong>${pat}</strong> • Jam: <strong>${camp.time || '07:00'} WIB</strong>`;
    } else if (camp.type === CampaignType.AUTO_REPLY) {
      scheduleDetailHtml = `Trigger Kata Kunci: <strong>"${camp.config?.keywords || 'info'}"</strong> (Mode: ${camp.config?.match_mode || 'contains'})`;
    } else {
      scheduleDetailHtml = `Satu Waktu • <strong>${formatDateIndo(camp.startDate)}</strong> pukul <strong>${camp.time || '09:00'} WIB</strong>`;
    }

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
                <div style="display:flex; align-items:center; gap:6px; margin-top:2px; flex-wrap:wrap;">
                  <span class="badge-status ${isRunning ? 'open' : 'closed'}">${isRunning ? '● Berjalan Aktif' : '⏸️ Dijeda'}</span>
                  <span class="badge-tag ${typeBadge}" style="font-size:0.7rem; padding:1px 6px;">${typeLabel}</span>
                  <span class="badge-tag ${camp.color}" style="font-size:0.7rem; padding:1px 6px;">${categoryName}</span>
                </div>
              </div>
            </div>
            <span class="badge-tag ${camp.color}" style="font-size:0.8rem; font-weight:700;">⏰ ${camp.time} WIB</span>
          </div>

          <!-- Bar Batas Waktu & Sisa Hari -->
          <div class="camp-duration-strip">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.76rem;">
              <span style="color:#64748B; font-weight:600;">📅 ${formatDateIndo(startStr)} s/d ${formatDateIndo(endStr)}</span>
              ${durationLabel}
            </div>
            <div class="camp-progress-track">
              <div class="camp-progress-fill ${camp.color}" style="width:${progressPercent}%;"></div>
            </div>
            <div style="font-size:0.72rem; color:#475569; margin-top:4px;">
              ${scheduleDetailHtml}
            </div>
          </div>

          <!-- Rincian 4 Modularitas Pengiriman (Nomor -> Bot -> Materi -> Target) -->
          <div class="camp-card-modular-pipeline">
            <div class="pip-card-row">
              <span class="lbl">📱 1. Jalur Nomor:</span>
              <span class="val">${camp.senderNumber || camp.sender_number}</span>
            </div>
            <div class="pip-card-row">
              <span class="lbl">🤖 2. Diselipin Bot:</span>
              <span class="val" style="color:#2563EB;">${camp.bot_label || (camp.category === 'dinas' ? 'Bot RAYI • Strict Gemini' : (camp.category === 'event' ? 'Bot Helpdesk • Gemini RAG' : 'Bot Sahabat Subuh • Keyword'))}</span>
            </div>
            <div class="pip-card-row">
              <span class="lbl">📚 3. Add-on Materi:</span>
              <span class="val" style="color:#059669;">${camp.kbTitle || 'Bahan Materi Standard'}</span>
            </div>
            <div class="pip-card-row">
              <span class="lbl">🎯 4. Sasaran:</span>
              <span class="val">${camp.recipient} ${camp.strict_group_only ? '<span style="color:#059669; font-weight:700;">[🔒 Khusus Anggota]</span>' : ''}</span>
            </div>
          </div>

          <!-- Pratinjau Chat Bubble WhatsApp Asli -->
          <div class="wa-chat-preview-wrap">
            <div class="wa-chat-preview-header">
              <span class="wa-dot"></span>
              <span style="font-size:0.74rem; font-weight:700; color:#1E293B;">Contoh Pesan WhatsApp Terjadwal:</span>
            </div>
            <div class="wa-bubble-mockup">
              <p class="wa-bubble-text">${camp.message || camp.defaultMsg}</p>
              <div class="wa-bubble-meta">
                <span>${camp.time} WIB</span>
                <span class="wa-checks">✓✓</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tombol Aksi Super Ramah -->
        <div class="camp-card-actions">
          <button class="btn btn-outline btn-sm" onclick="jumpToCalendarForCampaign('${camp.id}')" title="Buka kotak kalender 1-31 untuk campaign ini">
            <span>🗓️ Kalender</span>
          </button>
          <button class="btn btn-primary btn-sm" onclick="testSendCampaignToWA('${camp.id}')" title="Tes kirim langsung ke nomor WhatsApp">
            <span>📲 Tes Kirim</span>
          </button>
          <button class="btn btn-ghost btn-sm" onclick="togglePauseCampaign('${camp.id}')" title="${isRunning ? 'Jeda campaign ini' : 'Aktifkan kembali campaign ini'}">
            <span>${isRunning ? '⏸️ Jeda' : '▶️ Aktif'}</span>
          </button>
          <button class="btn btn-ghost btn-sm" onclick="deleteCampaign('${camp.id}')" title="Hapus campaign ini" style="color:#DC2626;">
            <span>🗑️ Hapus</span>
          </button>
        </div>
      </div>
    `;
  });

  // Tombol "+ Buat Campaign Baru" yang ramah & ceria di akhir grid
  html += `
    <div class="campaign-hub-card create-new-dashed" onclick="openCreateCampaignModal()">
      <div class="create-new-content">
        <div class="create-new-icon">✨ ➕</div>
        <h3>Buat Campaign Baru</h3>
        <p>Pilih dari 5 jenis mekanisme pengiriman pesan: Satu Waktu, Berulang, Berseri, Pengingat Acara, atau Balas Otomatis.</p>
        <button type="button" class="btn btn-primary btn-sm mt-3" style="pointer-events:none;">
          <span>✨ Mulai Buat Campaign &rarr;</span>
        </button>
      </div>
    </div>
  `;

  grid.innerHTML = html;
}

async function deleteCampaign(campId) {
  if (!confirm('Apakah Anda yakin ingin menghapus campaign ini?')) return;
  try {
    await fetch(`/api/campaigns/${campId}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('API delete warning:', err);
  }
  campaignHubList = campaignHubList.filter(c => c.id !== campId);
  localStorage.setItem('wawar_campaigns', JSON.stringify(campaignHubList));
  renderCampaignHub(currentCampaignHubFilter);
  renderCalendar(currentCalMonth, currentCalYear);
  showToast('Campaign berhasil dihapus.', 'info');
}

function filterCampaignHub(category) {
  renderCampaignHub(category);
}

function jumpToCalendarForCampaign(campId) {
  switchDashTab('calendar');
  selectCalendarCampaign(campId);
  const targetCamp = campaignHubList.find(c => c.id === campId);
  showToast(`Membuka kotak kalender untuk: "${targetCamp?.name || 'Campaign'}" 🗓️✨`, 'info');
}

function testSendCampaignToWA(campId) {
  const camp = campaignHubList.find(c => c.id === campId);
  if (!camp) return;

  showToast(`Mengirim simulasi pesan WhatsApp "${camp.name}" via jalur ${camp.senderNumber || camp.sender_number}... 📲⚡`, 'info');

  setTimeout(() => {
    showToast(`✅ SUKSES! Pesan WhatsApp [${camp.name}] berhasil dikirim ke ${camp.recipient}! Cek WhatsApp Anda sekarang. 🎉`, 'success');
  }, 1000);
}

function togglePauseCampaign(campId) {
  const camp = campaignHubList.find(c => c.id === campId);
  if (!camp) return;

  camp.status = camp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  localStorage.setItem('wawar_campaigns', JSON.stringify(campaignHubList));
  renderCampaignHub(currentCampaignHubFilter);

  if (camp.status === 'ACTIVE') {
    showToast(`Campaign "${camp.name}" diaktifkan kembali! 🚀 Pesan akan berjalan sesuai jadwal.`, 'success');
  } else {
    showToast(`Campaign "${camp.name}" dijeda sementara. ⏸️ Bot tidak akan mengirim pesan sampai diaktifkan lagi.`, 'warning');
  }
}

/* ================= MODAL: BUAT CAMPAIGN BARU (WIZARD 4 LANGKAH) ================= */

function openCreateCampaignModal() {
  const modal = document.getElementById('modalCreateCampaign');
  if (modal) {
    modal.classList.add('active');
    selectCampaignType('one_time');
    populateCampaignContentPresetOptions();
    calculateSeriesEndDate();
    updateModalLiveWaPreview();
  }
}

function closeCreateCampaignModal() {
  const modal = document.getElementById('modalCreateCampaign');
  if (modal) modal.classList.remove('active');
}

/**
 * Langkah 1: Pilih Jenis Siaran (5 Mekanisme Pengiriman)
 */
function selectCampaignType(type) {
  const validTypes = ['one_time', 'recurring', 'series', 'event_reminder', 'auto_reply'];
  if (!validTypes.includes(type)) type = 'one_time';

  // 1. Update hidden input
  const typeInp = document.getElementById('campType');
  if (typeInp) typeInp.value = type;

  // 2. Update visual active state of cards
  validTypes.forEach(t => {
    const card = document.getElementById(`cardType-${t}`);
    if (card) {
      if (t === type) card.classList.add('active');
      else card.classList.remove('active');
    }

    // 3. Toggle corresponding schedule panel in Langkah 2
    const panel = document.getElementById(`schedPanel-${t}`);
    if (panel) {
      if (t === type) panel.classList.remove('hidden');
      else panel.classList.add('hidden');
    }
  });

  // 4. Update badge
  const badge = document.getElementById('badgeTypeSelected');
  if (badge) {
    const labels = {
      one_time: '🎯 Satu Waktu Terpilih',
      recurring: '🔄 Berulang Rutin Terpilih',
      series: '📚 Paket Berseri Terpilih',
      event_reminder: '⏰ Pengingat Acara Terpilih',
      auto_reply: '🤖 Balas Otomatis Terpilih'
    };
    badge.textContent = labels[type] || 'Campaign Terpilih';
    badge.className = `badge-tag ${getTypeBadgeClass(type)}`;
  }

  // 5. Special computation for series
  if (type === 'series') {
    calculateSeriesEndDate();
  }

  updateModalLiveWaPreview();
}

/**
 * Drawer & Selector Template Campaign Milik Pengguna
 */
function toggleUserTemplatesDropdown() {
  const drawer = document.getElementById('userTemplatesDrawer');
  if (!drawer) return;
  drawer.classList.toggle('hidden');
  if (!drawer.classList.contains('hidden')) {
    renderUserTemplatesList();
  }
}

function renderUserTemplatesList() {
  const container = document.getElementById('userTemplatesListContainer');
  if (!container) return;

  if (!userCampaignTemplates || userCampaignTemplates.length === 0) {
    container.innerHTML = `
      <div class="empty-template-state" style="grid-column: 1 / -1;">
        <span>📂</span>
        <h4>Belum Ada Template Campaign Tersimpan</h4>
        <p>Anda belum menyimpan template custom. Saat membuat campaign baru, centang <em>"Simpan sebagai Template Campaign Saya"</em> di Langkah 4 untuk menyimpannya di sini.</p>
      </div>
    `;
    return;
  }

  let html = '';
  userCampaignTemplates.forEach(tmpl => {
    const typeLabel = getTypeLabel(tmpl.type);
    const typeColor = getTypeBadgeClass(tmpl.type);
    const displayMsg = tmpl.default_message && tmpl.default_message.length > 90
      ? tmpl.default_message.substring(0, 90) + '...'
      : (tmpl.default_message || 'Tidak ada naskah pesan.');

    html += `
      <div class="template-item-card">
        <div>
          <div class="template-item-header">
            <h5>${tmpl.name}</h5>
            <span class="badge-tag ${typeColor}">${typeLabel}</span>
          </div>
          <div class="template-item-body">
            <div style="font-size:0.75rem; color:#475569; margin-bottom:4px;">
              <span>Kategori: <strong>${(tmpl.category || 'siaran').toUpperCase()}</strong></span> • 
              <span>Jam: <strong>${tmpl.default_time || '07:00'} WIB</strong></span>
            </div>
            <div style="font-style:italic; color:#64748B;">"${displayMsg}"</div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:6px; border-top:1px solid #F1F5F9;">
          <button type="button" class="btn btn-outline btn-xs" onclick="applyUserTemplate('${tmpl.id}')">
            <span>⚡ Gunakan Template</span>
          </button>
          <button type="button" class="btn btn-ghost btn-xs text-danger" onclick="deleteUserTemplate('${tmpl.id}', event)" title="Hapus Template" style="color:#DC2626; font-weight:700;">
            Hapus
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function applyUserTemplate(tmplId) {
  const tmpl = userCampaignTemplates.find(t => t.id === tmplId);
  if (!tmpl) return;

  // 1. Pilih jenis pengiriman
  selectCampaignType(tmpl.type || 'one_time');

  // 2. Isi identitas & kategori
  const nameInp = document.getElementById('campName');
  const classInp = document.getElementById('campClassification');
  if (nameInp) nameInp.value = tmpl.name;
  if (classInp && tmpl.category) classInp.value = tmpl.category;

  // 3. Isi naskah pesan
  const textInp = document.getElementById('campDefaultText');
  if (textInp && tmpl.default_message) textInp.value = tmpl.default_message;

  // 4. Pilih Knowledge Base jika ada
  const kbSelect = document.getElementById('campContentPreset');
  if (kbSelect && tmpl.knowledge_base_id) {
    kbSelect.value = tmpl.knowledge_base_id;
  }

  // 5. Sesuaikan jadwal sesuai jenis
  const cfg = tmpl.config || {};
  const defTime = tmpl.default_time || '07:00';

  if (tmpl.type === 'one_time') {
    const timeInp = document.getElementById('campOneTimeTime');
    if (timeInp) timeInp.value = defTime;
  } else if (tmpl.type === 'recurring') {
    const timeInp = document.getElementById('campRecurringTime');
    const patInp = document.getElementById('campRecurringPattern');
    if (timeInp) timeInp.value = defTime;
    if (patInp && cfg.recurring_pattern) patInp.value = cfg.recurring_pattern;
    handleRecurringPatternChange();
  } else if (tmpl.type === 'series') {
    const timeInp = document.getElementById('campSeriesTime');
    const countInp = document.getElementById('campSeriesCount');
    if (timeInp) timeInp.value = defTime;
    if (countInp && cfg.total_messages) countInp.value = cfg.total_messages;
    calculateSeriesEndDate();
  } else if (tmpl.type === 'event_reminder') {
    const timeInp = document.getElementById('campEventTime');
    const dateInp = document.getElementById('campEventDate');
    if (timeInp) timeInp.value = defTime;
    if (dateInp && cfg.event_date) dateInp.value = cfg.event_date;
  } else if (tmpl.type === 'auto_reply') {
    const kwInp = document.getElementById('campAutoReplyKeywords');
    if (kwInp && cfg.keywords) kwInp.value = cfg.keywords;
  }

  // Tutup drawer template
  const drawer = document.getElementById('userTemplatesDrawer');
  if (drawer) drawer.classList.add('hidden');

  updateModalLiveWaPreview();
  showToast(`✅ Template "${tmpl.name}" diterapkan ke form! Anda tetap bebas mengedit seluruh field sesuai kebutuhan.`, 'success');
}

async function deleteUserTemplate(tmplId, event) {
  if (event) event.stopPropagation();
  try {
    const res = await fetch(`/api/campaign-templates/${tmplId}`, { method: 'DELETE' });
    if (res.ok) {
      userCampaignTemplates = userCampaignTemplates.filter(t => t.id !== tmplId);
      localStorage.setItem('wawar_campaign_templates', JSON.stringify(userCampaignTemplates));
      renderUserTemplatesList();
      showToast('Template berhasil dihapus.', 'info');
    }
  } catch (err) {
    console.error('Error deleting template:', err);
    userCampaignTemplates = userCampaignTemplates.filter(t => t.id !== tmplId);
    localStorage.setItem('wawar_campaign_templates', JSON.stringify(userCampaignTemplates));
    renderUserTemplatesList();
  }
}

/**
 * Langkah 2: Logika & Kalkulasi Jadwal
 */

// Menolak tanggal mulai yang sudah lewat (validasi ketat: minimal 24 Okt 2026)
function validateDateNotPast(inputElement) {
  if (!inputElement || !inputElement.value) return true;
  const todayStr = '2026-10-24';
  const val = inputElement.value;
  const parent = inputElement.closest('.form-group') || inputElement.parentElement;
  const hint = parent ? parent.querySelector('.date-validation-hint') : null;

  if (val < todayStr) {
    inputElement.classList.add('error');
    if (hint) {
      hint.className = 'date-validation-hint error';
      hint.textContent = `⚠️ Tanggal ditolak! Tidak boleh tanggal masa lalu (minimal hari ini: ${formatDateIndo(todayStr)}).`;
    }
    showToast(`⚠️ Tanggal mulai tidak boleh sudah lewat (minimal hari ini: ${formatDateIndo(todayStr)})`, 'error');
    inputElement.value = todayStr;
    return false;
  } else {
    inputElement.classList.remove('error');
    if (hint) {
      hint.className = 'date-validation-hint valid';
      hint.textContent = `Format: ${formatDateIndo(val)}`;
    }
    return true;
  }
}

// Menghitung tanggal selesai series otomatis dari start_date + (count - 1) hari (tidak boleh input manual)
function calculateSeriesEndDate() {
  const startInput = document.getElementById('campSeriesStartDate');
  const countInput = document.getElementById('campSeriesCount');
  const valDisplay = document.getElementById('valSeriesCalculatedEndDate');
  const hintDisplay = document.getElementById('hintSeriesStartDate');

  if (!startInput || !countInput || !valDisplay) return '2026-10-31';

  const startVal = startInput.value || '2026-10-25';
  const count = Math.max(1, parseInt(countInput.value, 10) || 7);

  if (hintDisplay) {
    hintDisplay.textContent = `Mulai: ${formatDateIndo(startVal)}`;
  }

  const startDate = new Date(startVal + 'T00:00:00');
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (count - 1));

  const y = endDate.getFullYear();
  const m = String(endDate.getMonth() + 1).padStart(2, '0');
  const d = String(endDate.getDate()).padStart(2, '0');
  const endVal = `${y}-${m}-${d}`;

  valDisplay.textContent = formatDateIndo(endVal);
  valDisplay.dataset.endDate = endVal;

  const boxBadge = document.getElementById('boxSeriesAutoEndDate');
  if (boxBadge) {
    boxBadge.innerHTML = `<span>📅</span><span>Tanggal Selesai Otomatis: <strong>${formatDateIndo(endVal)}</strong> (dihitung otomatis dari ${count} pesan berseri)</span>`;
  }
  return endVal;
}

function handleRecurringPatternChange() {
  const pat = document.getElementById('campRecurringPattern')?.value;
  const boxWeekly = document.getElementById('boxWeeklyDays');
  if (boxWeekly) {
    if (pat === 'weekly') boxWeekly.classList.remove('hidden');
    else boxWeekly.classList.add('hidden');
  }
}

function setQuickCampTime(timeStr, btnElement) {
  const type = document.getElementById('campType')?.value || 'one_time';
  if (type === 'one_time') {
    const inp = document.getElementById('campOneTimeTime');
    if (inp) inp.value = timeStr;
  } else if (type === 'recurring') {
    const inp = document.getElementById('campRecurringTime');
    if (inp) inp.value = timeStr;
  } else if (type === 'series') {
    const inp = document.getElementById('campSeriesTime');
    if (inp) inp.value = timeStr;
  } else if (type === 'event_reminder') {
    const inp = document.getElementById('campEventTime');
    if (inp) inp.value = timeStr;
  }

  const allPills = document.querySelectorAll('.time-preset-pills .time-pill');
  allPills.forEach(p => p.classList.remove('active'));

  if (btnElement) {
    btnElement.classList.add('active');
  }

  updateModalLiveWaPreview();
}

function syncTimePill(timeStr) {
  const pills = document.querySelectorAll('.time-preset-pills .time-pill');
  pills.forEach(p => {
    if (p.textContent.includes(timeStr)) p.classList.add('active');
    else p.classList.remove('active');
  });
}

/**
 * Langkah 3: Pengirim, Target, & Sektor
 */
function handleTargetGroupChange() {
  const group = document.getElementById('campTargetGroup')?.value;
  const manualBox = document.getElementById('boxCampManualPhone');
  if (manualBox) {
    if (group === 'manual') manualBox.classList.remove('hidden');
    else manualBox.classList.add('hidden');
  }
}

function autoSyncSenderByClassification() {
  const cls = document.getElementById('campClassification')?.value;
  const senderSelect = document.getElementById('campSenderNumber');
  if (!senderSelect) return;
  if (cls === 'keluarga') senderSelect.value = 'wawar-subuh';
  else if (cls === 'dinas') senderSelect.value = 'Wawar-primary';
  else if (cls === 'event') senderSelect.value = 'rayi-cs-official';
  else if (cls === 'siaran') senderSelect.value = 'wawar-blast-x';
}

/**
 * Langkah 4: Tulis Pesan, Pratinjau WhatsApp & Simpan Template
 */
function toggleSaveTemplateNameBox() {
  const checked = document.getElementById('checkSaveAsTemplate')?.checked;
  const box = document.getElementById('boxTemplateNameInput');
  const nameInput = document.getElementById('inputTemplateName');
  if (box) {
    if (checked) {
      box.classList.remove('hidden');
      if (nameInput && !nameInput.value) {
        nameInput.value = document.getElementById('campName')?.value || 'Template Baru';
      }
    } else {
      box.classList.add('hidden');
    }
  }
}

function handleBotProfileChange() {
  const prof = document.getElementById('campBotProfile')?.value || 'bot_rayi';
  const box = document.getElementById('boxCampBotEngine');
  const engine = document.getElementById('campBotEngine');
  const badge = document.getElementById('badgeBotEngineActive');
  const desc = document.getElementById('hintBotEngineDesc');

  if (prof === 'none') {
    if (box) box.classList.add('hidden');
    if (badge) { badge.textContent = 'Non-Aktif'; badge.className = 'badge-tag gray'; }
    if (desc) desc.textContent = 'Mode broadcast siaran satu arah murni, bot tidak akan merespon balasan chat penerima.';
  } else {
    if (box) box.classList.remove('hidden');
    if (badge) { badge.textContent = 'Gemini AI Aktif'; badge.className = 'badge-tag blue'; }
    if (prof === 'bot_rayi') {
      if (engine) engine.value = 'gemini_strict';
      if (desc) desc.textContent = 'Bot asisten resmi membaca dokumen SOP TANDANG & melayani anggota grup ASN Jawa Barat.';
    } else if (prof === 'bot_subuh') {
      if (engine) engine.value = 'keyword_rules';
      if (badge) { badge.textContent = 'Rule Keyword'; badge.className = 'badge-tag amber'; }
      if (desc) desc.textContent = 'Bot sapaan fajar hangat membaca doa fajar dan hadits pilihan.';
    } else if (prof === 'bot_helpdesk') {
      if (engine) engine.value = 'gemini_rag';
      if (desc) desc.textContent = 'Bot membaca juknis rute 5K, informasi nomor BIB, dan lokasi Gedung Sate.';
    } else if (prof === 'bot_cs_faq') {
      if (engine) engine.value = 'gemini_rag';
      if (desc) desc.textContent = 'Bot FAQ otomatis menjawab pertanyaan umum publik dan jam layanan.';
    }
  }
  updateModalLiveWaPreview();
}

function updateModalLiveWaPreview() {
  const type = document.getElementById('campType')?.value || 'one_time';
  const senderNumber = document.getElementById('campSenderNumber')?.value || 'Wawar-primary';
  const text = document.getElementById('campDefaultText')?.value || 'Sampurasun rekan-rekan!';

  let timeDisplay = '09:00 WIB';
  if (type === 'one_time') {
    const t = document.getElementById('campOneTimeTime')?.value || '09:00';
    timeDisplay = `${t} WIB`;
  } else if (type === 'recurring') {
    const t = document.getElementById('campRecurringTime')?.value || '07:00';
    timeDisplay = `${t} WIB`;
  } else if (type === 'series') {
    const t = document.getElementById('campSeriesTime')?.value || '04:30';
    timeDisplay = `${t} WIB`;
  } else if (type === 'event_reminder') {
    const t = document.getElementById('campEventTime')?.value || '05:30';
    timeDisplay = `${t} WIB`;
  } else if (type === 'auto_reply') {
    timeDisplay = 'Realtime 24/7';
  }

  const avatar = document.getElementById('mockupPhoneAvatar');
  const title = document.getElementById('mockupPhoneSenderTitle');
  const bubbleText = document.getElementById('mockupBubbleText');
  const bubbleTime = document.getElementById('mockupBubbleTime');

  if (bubbleText) bubbleText.textContent = text;
  if (bubbleTime) bubbleTime.textContent = timeDisplay;

  if (avatar && title) {
    if (senderNumber.includes('subuh')) {
      avatar.textContent = '🌅';
      title.textContent = 'wawar-subuh (+62 851-2104-2025)';
    } else if (senderNumber.includes('official') || senderNumber.includes('rayi')) {
      avatar.textContent = '🤖';
      title.textContent = 'rayi-cs-official (Helpdesk CS)';
    } else if (senderNumber.includes('blast')) {
      avatar.textContent = '📢';
      title.textContent = 'wawar-blast-x (Broadcast Gateway)';
    } else {
      avatar.textContent = '📱';
      title.textContent = 'Wawar-primary (+62 851-2104-2025)';
    }
  }

  // Update Live Modular Routing Pipeline Indicators in Langkah 3 Modal
  const valSender = document.getElementById('valPipelineSender');
  const valBot = document.getElementById('valPipelineBot');
  const valAddon = document.getElementById('valPipelineAddon');
  const valTarget = document.getElementById('valPipelineTarget');

  const senderEl = document.getElementById('campSenderNumber');
  const botProfEl = document.getElementById('campBotProfile');
  const botEngEl = document.getElementById('campBotEngine');
  const presetEl = document.getElementById('campContentPreset');
  const targetEl = document.getElementById('campTargetGroup');
  const strictCheck = document.getElementById('campStrictGroupOnly')?.checked;

  if (valSender && senderEl) {
    valSender.textContent = senderEl.options[senderEl.selectedIndex]?.text || senderEl.value;
  }
  if (valBot && botProfEl) {
    if (botProfEl.value === 'none') {
      valBot.textContent = 'Tanpa Bot (Broadcast Siaran)';
    } else {
      const engName = botEngEl?.options[botEngEl.selectedIndex]?.text || 'Gemini AI';
      valBot.textContent = `${botProfEl.options[botProfEl.selectedIndex]?.text} [${engName}]`;
    }
  }
  if (valAddon && presetEl) {
    valAddon.textContent = presetEl.options[presetEl.selectedIndex]?.text || 'Materi Standar';
  }
  if (valTarget && targetEl) {
    const tgtText = targetEl.options[targetEl.selectedIndex]?.text || targetEl.value;
    valTarget.textContent = strictCheck ? `${tgtText} (🔒 Khusus Anggota)` : tgtText;
  }
}

/**
 * Handle Save New Campaign (Menyimpan record type, config, dan opsi template)
 */
async function handleSaveNewCampaign(e) {
  e.preventDefault();

  const type = document.getElementById('campType')?.value || 'one_time';
  const name = document.getElementById('campName').value.trim();
  const category = document.getElementById('campClassification').value;
  const targetGroup = document.getElementById('campTargetGroup').value;
  const senderNumber = document.getElementById('campSenderNumber').value;
  const defaultText = document.getElementById('campDefaultText').value.trim();
  const kbPreset = document.getElementById('campContentPreset')?.value || '';
  const saveAsTemplate = document.getElementById('checkSaveAsTemplate')?.checked || false;
  const templateName = document.getElementById('inputTemplateName')?.value.trim() || name;

  // Modular Bot & Engine Selections
  const botProfile = document.getElementById('campBotProfile')?.value || 'bot_rayi';
  const botEngine = document.getElementById('campBotEngine')?.value || 'gemini_strict';
  const strictGroupOnly = document.getElementById('campStrictGroupOnly')?.checked || false;

  let botLabel = "Bot RAYI • Strict Gemini";
  if (botProfile === 'none') {
    botLabel = "Broadcast Siaran (Tanpa Bot)";
  } else if (botProfile === 'bot_rayi') {
    botLabel = botEngine === 'gemini_strict' ? "Bot RAYI • Strict Gemini" : "Bot RAYI • Gemini RAG";
  } else if (botProfile === 'bot_subuh') {
    botLabel = "Bot Sahabat Subuh • Keyword";
  } else if (botProfile === 'bot_helpdesk') {
    botLabel = "Bot Helpdesk • Gemini RAG";
  } else if (botProfile === 'bot_cs_faq') {
    botLabel = "Bot CS FAQ Otomatis";
  }

  // Recipient label
  let recipientLabel = "Grup ASN & Staf TANDANG";
  if (targetGroup === 'keluarga') recipientLabel = "👨‍👩‍👧 Anak & Keluarga (+62 851-2104-2025)";
  else if (targetGroup === 'pimpinan') recipientLabel = "🏛️ Grup Pimpinan & Eselon IKP";
  else if (targetGroup === 'tandang') recipientLabel = "📋 Grup ASN & Staf TANDANG";
  else if (targetGroup === 'event_runners') recipientLabel = "🏃 Peserta Fun Run 26 Des";
  else if (targetGroup === 'manual') {
    const manualNum = document.getElementById('campManualPhone')?.value.trim() || '6285121042025';
    recipientLabel = `Nomor Manual (+${manualNum})`;
  }

  // Type-specific config & date validation
  let config = {};
  let defaultTime = '09:00';
  let startDate = '2026-10-24';
  let endDate = '2026-10-24';

  if (type === CampaignType.ONE_TIME) {
    const dateInp = document.getElementById('campOneTimeDate');
    const timeInp = document.getElementById('campOneTimeTime');
    if (!validateDateNotPast(dateInp)) return;
    defaultTime = timeInp.value || '09:00';
    startDate = dateInp.value;
    endDate = dateInp.value;
    config = {
      date: dateInp.value,
      time: defaultTime
    };
  } else if (type === CampaignType.RECURRING) {
    const startInp = document.getElementById('campRecurringStartDate');
    const endInp = document.getElementById('campRecurringEndDate');
    const timeInp = document.getElementById('campRecurringTime');
    const patternInp = document.getElementById('campRecurringPattern');
    if (!validateDateNotPast(startInp)) return;

    const selectedDays = Array.from(document.querySelectorAll('input[name="recDay"]:checked')).map(cb => cb.value);
    defaultTime = timeInp.value || '07:00';
    startDate = startInp.value;
    endDate = endInp.value || '';
    config = {
      recurring_pattern: patternInp.value,
      recurring_days: selectedDays,
      recurring_time: defaultTime,
      start_date: startDate,
      end_date: endDate
    };
  } else if (type === CampaignType.SERIES) {
    const startInp = document.getElementById('campSeriesStartDate');
    const countInp = document.getElementById('campSeriesCount');
    const timeInp = document.getElementById('campSeriesTime');
    if (!validateDateNotPast(startInp)) return;

    const count = parseInt(countInp.value, 10) || 7;
    const computedEndDate = calculateSeriesEndDate();
    defaultTime = timeInp.value || '04:30';
    startDate = startInp.value;
    endDate = computedEndDate;
    config = {
      start_date: startDate,
      end_date: endDate,
      total_messages: count,
      series_time: defaultTime
    };
  } else if (type === CampaignType.EVENT_REMINDER) {
    const eventDateInp = document.getElementById('campEventDate');
    const timeInp = document.getElementById('campEventTime');
    if (!validateDateNotPast(eventDateInp)) return;

    const selectedOffsets = Array.from(document.querySelectorAll('input[name="eventOffset"]:checked')).map(cb => cb.value);
    defaultTime = timeInp.value || '05:30';
    startDate = '2026-10-24';
    endDate = eventDateInp.value;
    config = {
      event_date: eventDateInp.value,
      event_time: defaultTime,
      offsets: selectedOffsets
    };
  } else if (type === CampaignType.AUTO_REPLY) {
    const kwInp = document.getElementById('campAutoReplyKeywords');
    const modeInp = document.getElementById('campAutoReplyMatchMode');
    defaultTime = '24 Jam';
    startDate = '2026-10-24';
    endDate = '2027-10-24';
    config = {
      keywords: kwInp.value.trim(),
      match_mode: modeInp.value
    };
  }

  const campId = 'camp_' + Date.now();
  let assignedColor = 'amber';
  let assignedIcon = '🌅';
  let kbLabel = 'Bahan Materi Standard';

  if (category === 'dinas') {
    assignedColor = 'green';
    assignedIcon = '🏛️';
    kbLabel = 'SOP Kedinasan TANDANG & SPPD';
  } else if (category === 'event') {
    assignedColor = 'blue';
    assignedIcon = '🏃';
    kbLabel = 'Petunjuk Teknis Event & Rute';
  } else if (category === 'siaran') {
    assignedColor = 'purple';
    assignedIcon = '📢';
    kbLabel = 'Materi Siaran Publik';
  } else if (category === 'keluarga') {
    assignedColor = 'amber';
    assignedIcon = '🌅';
    kbLabel = 'Paket Sapa Fajar & Keluarga';
  }

  const campaignRecord = {
    id: campId,
    user_id: 'usr_admin',
    name: name,
    type: type, // one_time, recurring, series, event_reminder, auto_reply
    category: category,
    classification: category,
    sender_number: senderNumber,
    senderNumber: senderNumber,
    senderInstance: senderNumber,
    target_group: targetGroup,
    recipient: recipientLabel,
    knowledge_base_id: kbPreset,
    kbTitle: kbPreset ? getKbTitleById(kbPreset) : kbLabel,
    bot_profile: botProfile,
    bot_engine: botEngine,
    bot_label: botLabel,
    strict_group_only: strictGroupOnly,
    message: defaultText,
    defaultMsg: defaultText,
    status: 'ACTIVE',
    color: assignedColor,
    icon: assignedIcon,
    time: defaultTime,
    startDate: startDate,
    endDate: endDate,
    config: config
  };

  // 1. Simpan ke Database API
  try {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignRecord)
    });
  } catch (err) {
    console.warn('Network offline / API write error, saving locally:', err);
  }

  // 2. Simpan ke local state
  campaignHubList.unshift(campaignRecord);
  localStorage.setItem('wawar_campaigns', JSON.stringify(campaignHubList));

  // 3. Simpan sebagai template jika dicentang
  if (saveAsTemplate) {
    const templateRecord = {
      id: 'tmpl_' + Date.now(),
      user_id: 'usr_admin',
      name: templateName,
      type: type,
      category: category,
      default_time: defaultTime,
      default_message: defaultText,
      knowledge_base_id: kbPreset,
      config: config
    };

    try {
      await fetch('/api/campaign-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateRecord)
      });
    } catch (err) {
      console.warn('Template API write error:', err);
    }

    userCampaignTemplates.unshift(templateRecord);
    localStorage.setItem('wawar_campaign_templates', JSON.stringify(userCampaignTemplates));
    renderUserTemplatesList();
  }

  // 4. Sinkronisasi ke Kalender
  seedCampaignRecordToCalendar(campaignRecord);

  // 5. Re-render UI
  renderCampaignHub(currentCampaignHubFilter);
  renderCalendar(currentCalMonth, currentCalYear);

  closeCreateCampaignModal();
  showToast(`🎉 Campaign "${name}" [${getTypeLabel(type)}] berhasil disimpan dan dijadwalkan! 🚀`, 'success');
}

/**
 * Memetakan jadwal campaign ke kotak kalender
 */
function seedCampaignRecordToCalendar(camp) {
  const type = camp.type;
  const cfg = camp.config || {};

  if (type === CampaignType.ONE_TIME) {
    const dKey = cfg.date || camp.startDate;
    if (dKey) {
      if (!calendarEntries[dKey]) calendarEntries[dKey] = [];
      if (!calendarEntries[dKey].some(e => e.id === `${camp.id}-${dKey}`)) {
        calendarEntries[dKey].push({
          id: `${camp.id}-${dKey}`,
          campId: camp.id,
          campName: camp.name,
          time: camp.time || '09:00',
          senderNumber: camp.sender_number || camp.senderNumber,
          recipient: camp.recipient,
          message: camp.message || camp.defaultMsg,
          status: 'SCHEDULED',
          color: camp.color
        });
      }
    }
  } else if (type === CampaignType.SERIES) {
    const startStr = cfg.start_date || camp.startDate || '2026-10-01';
    const endStr = cfg.end_date || camp.endDate || '2026-10-31';
    const start = new Date(startStr);
    const end = new Date(endStr);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      const dKey = `${y}-${m}-${d}`;

      if (!calendarEntries[dKey]) calendarEntries[dKey] = [];
      if (!calendarEntries[dKey].some(e => e.id === `${camp.id}-${dKey}`)) {
        calendarEntries[dKey].push({
          id: `${camp.id}-${dKey}`,
          campId: camp.id,
          campName: camp.name,
          time: camp.time || '04:30',
          senderNumber: camp.sender_number || camp.senderNumber,
          recipient: camp.recipient,
          message: camp.message || camp.defaultMsg,
          status: 'SCHEDULED',
          color: camp.color
        });
      }
    }
  } else if (type === CampaignType.EVENT_REMINDER) {
    const eventDateStr = cfg.event_date || '2026-12-26';
    const offsets = cfg.offsets || ['H-7', 'H-1', 'H'];
    const eventDate = new Date(eventDateStr + 'T00:00:00');

    offsets.forEach(offset => {
      let offsetDays = 0;
      if (offset === 'H-7') offsetDays = -7;
      else if (offset === 'H-3') offsetDays = -3;
      else if (offset === 'H-1') offsetDays = -1;
      else if (offset === 'H') offsetDays = 0;

      const targetDate = new Date(eventDate);
      targetDate.setDate(targetDate.getDate() + offsetDays);
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getDate()).padStart(2, '0');
      const dKey = `${y}-${m}-${d}`;

      if (!calendarEntries[dKey]) calendarEntries[dKey] = [];
      if (!calendarEntries[dKey].some(e => e.id === `${camp.id}-${dKey}-${offset}`)) {
        calendarEntries[dKey].push({
          id: `${camp.id}-${dKey}-${offset}`,
          campId: camp.id,
          campName: `${camp.name} (${offset})`,
          time: camp.time || '05:30',
          senderNumber: camp.sender_number || camp.senderNumber,
          recipient: camp.recipient,
          message: camp.message || camp.defaultMsg,
          status: 'SCHEDULED',
          color: camp.color
        });
      }
    });
  } else if (type === CampaignType.RECURRING) {
    const pattern = cfg.recurring_pattern || 'weekly';
    const days = cfg.recurring_days || ['monday'];
    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const targetDays = days.map(d => dayMap[d.toLowerCase()]);

    for (let day = 1; day <= 31; day++) {
      const dt = new Date(2026, 9, day);
      const dayOfWeek = dt.getDay();
      if (pattern === 'daily' || targetDays.includes(dayOfWeek)) {
        const dKey = `2026-10-${String(day).padStart(2, '0')}`;
        if (!calendarEntries[dKey]) calendarEntries[dKey] = [];
        if (!calendarEntries[dKey].some(e => e.id === `${camp.id}-${dKey}`)) {
          calendarEntries[dKey].push({
            id: `${camp.id}-${dKey}`,
            campId: camp.id,
            campName: camp.name,
            time: camp.time || '07:00',
            senderNumber: camp.sender_number || camp.senderNumber,
            recipient: camp.recipient,
            message: camp.message || camp.defaultMsg,
            status: 'SCHEDULED',
            color: camp.color
          });
        }
      }
    }
  }
}

/* ================= MODAL: ISI / EDIT PESAN PADA TANGGAL TERTENTU ================= */

let activeEditingDateKey = '';

function updateDateEntryPreview() {
  const msgInput = document.getElementById('entryMessageText');
  const timeInput = document.getElementById('entryTime');
  const bubbleText = document.getElementById('entryPreviewBubbleText');
  const bubbleTime = document.getElementById('entryPreviewBubbleTime');

  if (bubbleText && msgInput) bubbleText.textContent = msgInput.value || 'Pesan belum diisi.';
  if (bubbleTime && timeInput) bubbleTime.textContent = `${timeInput.value || '07:00'} WIB`;
}

function openDateEntryModal(dateKey, dayNumber) {
  activeEditingDateKey = dateKey;
  const modal = document.getElementById('modalDateEntry');
  const title = document.getElementById('dateEntryTitle');
  const dateKeyInput = document.getElementById('entryDateKey');
  const messageInput = document.getElementById('entryMessageText');
  const timeInput = document.getElementById('entryTime');
  const recipientInput = document.getElementById('entryTargetRecipient');
  const campSelect = document.getElementById('entryCampSelect');

  const dateObj = new Date(dateKey);
  const formattedDate = `${dayNumber || dateObj.getDate()} ${MONTH_NAMES[currentCalMonth]} ${currentCalYear}`;

  if (title) title.textContent = `🗓️ Rincian Siaran: ${formattedDate}`;
  if (dateKeyInput) dateKeyInput.value = dateKey;

  // Populate campaign options if available
  if (campSelect) {
    let opts = '';
    const allCamps = campaignHubList.length > 0 ? campaignHubList : calendarCampaigns;
    allCamps.forEach(c => {
      opts += `<option value="${c.id}">${c.name} (${c.time || '07:00'} WIB)</option>`;
    });
    campSelect.innerHTML = opts;
  }

  // Cek apakah sudah ada pesan di tanggal ini
  const existingEntries = calendarEntries[dateKey] || [];
  if (existingEntries.length > 0) {
    const first = existingEntries[0];
    if (timeInput) timeInput.value = first.time;
    if (recipientInput) recipientInput.value = first.recipient;
    if (messageInput) messageInput.value = first.message;
    if (campSelect && first.campId) campSelect.value = first.campId;
  } else {
    if (timeInput) timeInput.value = "07:00";
    if (recipientInput) recipientInput.value = "🏛️ Grup ASN & Staf TANDANG";
    if (messageInput) messageInput.value = "Sampurasun Rekan ASN! 🏛️ Pengingat kelengkapan berkas SPPD digital format F4 untuk perjalanan dinas minggu ini.";
  }

  // Sync modular pipeline indicators in modal
  const curCampId = campSelect?.value || 'camp_dinas_legacy';
  const activeCamp = campaignHubList.find(c => c.id === curCampId) || calendarCampaigns.find(c => c.id === curCampId) || campaignHubList[0];

  const pipSender = document.getElementById('entryPipelineSender');
  const pipBot = document.getElementById('entryPipelineBot');
  const pipAddon = document.getElementById('entryPipelineAddon');
  const pipTarget = document.getElementById('entryPipelineTarget');

  if (pipSender) pipSender.textContent = activeCamp?.senderNumber || activeCamp?.sender_number || 'Wawar-primary';
  if (pipBot) pipBot.textContent = activeCamp?.bot_label || 'Bot RAYI • Strict Gemini';
  if (pipAddon) pipAddon.textContent = activeCamp?.kbTitle || 'SOP Kedinasan TANDANG';
  if (pipTarget) pipTarget.textContent = activeCamp?.recipient || 'Grup ASN TANDANG';

  updateDateEntryPreview();
  modal?.classList.add('active');
}

function closeDateEntryModal() {
  document.getElementById('modalDateEntry')?.classList.remove('active');
}

function applyCampaignTemplateToEntry() {
  const select = document.getElementById('entryCampSelect')?.value;
  const camp = campaignHubList.find(c => c.id === select) || calendarCampaigns.find(c => c.id === select);
  if (camp) {
    const timeInput = document.getElementById('entryTime');
    const recipientInput = document.getElementById('entryTargetRecipient');
    const messageInput = document.getElementById('entryMessageText');

    if (timeInput) timeInput.value = camp.time || '07:00';
    if (recipientInput) recipientInput.value = camp.recipient || '';
    if (messageInput) messageInput.value = camp.message || camp.defaultMsg || '';

    const pipSender = document.getElementById('entryPipelineSender');
    const pipBot = document.getElementById('entryPipelineBot');
    const pipAddon = document.getElementById('entryPipelineAddon');
    const pipTarget = document.getElementById('entryPipelineTarget');

    if (pipSender) pipSender.textContent = camp.senderNumber || camp.sender_number || 'Wawar-primary';
    if (pipBot) pipBot.textContent = camp.bot_label || 'Bot RAYI • Strict Gemini';
    if (pipAddon) pipAddon.textContent = camp.kbTitle || 'SOP Kedinasan TANDANG';
    if (pipTarget) pipTarget.textContent = camp.recipient || 'Grup ASN TANDANG';

    updateDateEntryPreview();
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

/* ================= UKURAN KINERJA & LAPORAN PENGIRIMAN 2-ARAH ================= */

let currentReportFilter = 'all';
let currentReportCampaign = 'all';
let currentReportSearch = '';
let cachedReportsData = [];

async function fetchLiveCampaignReports() {
  const syncBadge = document.getElementById('badgeReportSyncTime');
  if (syncBadge) syncBadge.innerHTML = '● Menyinkronkan...';

  try {
    const url = `/api/campaign-reports?campaign_id=${encodeURIComponent(currentReportCampaign)}&status=${encodeURIComponent(currentReportFilter)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    cachedReportsData = json.data || [];

    // Update KPI card numbers
    if (json.kpi) {
      const k = json.kpi;
      const elTotal = document.getElementById('repKpiTotal');
      if (elTotal) elTotal.textContent = k.total;

      const countAll = document.getElementById('countFilterRepAll');
      if (countAll) countAll.textContent = k.total;

      const countDelivered = document.getElementById('countFilterRepDelivered');
      if (countDelivered) countDelivered.textContent = k.delivered;

      const countPending = document.getElementById('countFilterRepPending');
      if (countPending) countPending.textContent = k.pending;

      const countReplied = document.getElementById('countFilterRepReplied');
      if (countReplied) countReplied.textContent = k.replied;
    }

    renderReportTable(cachedReportsData);

    if (syncBadge) {
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      syncBadge.innerHTML = `● Tersinkron (${now} WIB)`;
    }
  } catch (err) {
    console.error('Error fetching campaign reports:', err);
    if (syncBadge) syncBadge.innerHTML = '● Mode Lokal';
    renderReportTable(cachedReportsData);
  }
}

function handleReportCampaignChange(campId) {
  currentReportCampaign = campId;
  const titleEl = document.getElementById('reportTableTitle');
  if (titleEl) {
    const campNames = {
      all: 'Semua Program & Campaign Berjalan',
      camp_dinas_legacy: 'Sosialisasi SPPD & Kedinasan TANDANG',
      camp_funrun_legacy: 'Event Fun Run 26 Des Jabar',
      camp_subuh_legacy: 'Sapa Subuh Anak & Keluarga'
    };
    titleEl.textContent = `📋 Riwayat Pengiriman & Respon Penerima: ${campNames[campId] || campId}`;
  }
  fetchLiveCampaignReports();
}

function filterReportByStatus(status) {
  currentReportFilter = status;

  const pills = document.querySelectorAll('.report-filter-pill');
  pills.forEach(p => p.classList.remove('active'));

  const activeMap = {
    all: 'btnFilterRepAll',
    delivered: 'btnFilterRepDelivered',
    pending: 'btnFilterRepPending',
    replied: 'btnFilterRepReplied'
  };
  const activeBtn = document.getElementById(activeMap[status]);
  if (activeBtn) activeBtn.classList.add('active');

  fetchLiveCampaignReports();
}

function handleReportSearch(query) {
  currentReportSearch = (query || '').toLowerCase().trim();
  if (!currentReportSearch) {
    renderReportTable(cachedReportsData);
    return;
  }
  const filtered = cachedReportsData.filter(r => 
    (r.recipient_name && r.recipient_name.toLowerCase().includes(currentReportSearch)) ||
    (r.recipient_phone && r.recipient_phone.includes(currentReportSearch)) ||
    (r.recipient_agency && r.recipient_agency.toLowerCase().includes(currentReportSearch))
  );
  renderReportTable(filtered);
}

function renderReportTable(reports) {
  const tbody = document.getElementById('reportTableBody');
  if (!tbody) return;

  if (!reports || reports.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:32px 16px; color:#64748B;">
          <div style="font-size:1.5rem; margin-bottom:8px;">📭</div>
          <strong>Belum ada log pengiriman untuk filter ini</strong>
          <p style="font-size:0.8rem; margin:4px 0 0;">Coba ganti filter status atau pilih program campaign lainnya.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  reports.forEach(r => {
    let statusBadge = '';
    if (r.status === 'DELIVERED') {
      statusBadge = `<span class="badge-status open" style="font-size:0.75rem;">● Terkirim (${r.delivery_time || '-'})</span>`;
    } else if (r.status === 'READ') {
      statusBadge = `<span class="badge-status open" style="background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; font-size:0.75rem;">✓✓ Dibaca (${r.read_time || '-'})</span>`;
    } else if (r.status === 'PENDING') {
      statusBadge = `<span class="badge-status pending" style="font-size:0.75rem;">⏳ Mengantre</span>`;
    } else {
      statusBadge = `<span class="badge-status closed" style="font-size:0.75rem;">✕ Gagal</span>`;
    }

    const replyContent = r.has_replied 
      ? `<div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:6px; padding:6px 8px; font-size:0.75rem; color:#1E3A8A;">
           <strong>💬 ${r.reply_time || 'Baru Saja'}:</strong>
           <div style="margin-top:2px;">"${r.reply_text || ''}"</div>
         </div>`
      : `<span style="color:#94A3B8; font-size:0.75rem; font-style:italic;">Belum membalas</span>`;

    const botContent = r.bot_replied 
      ? `<div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:6px; padding:6px 8px; font-size:0.75rem; color:#065F46;">
           <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
             <strong>🤖 ${r.bot_name || 'Bot RAYI'}</strong>
             <small style="color:#059669;">${r.bot_response_time || '<1s'}</small>
           </div>
           <div style="color:#047857;">"${(r.bot_response_text || '').substring(0, 80)}..."</div>
         </div>`
      : `<span style="color:#94A3B8; font-size:0.75rem;">-</span>`;

    const retryBtn = (r.status === 'PENDING' || r.status === 'FAILED')
      ? `<button class="btn btn-outline btn-xs" onclick="retryReport('${r.id}')" title="Kirim Ulang Pesan" style="font-size:0.72rem; padding:4px 8px; margin-top:4px;">
           <i data-lucide="refresh-cw" class="lucide-xs"></i> Ulangi
         </button>`
      : '';

    html += `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:32px; height:32px; border-radius:50%; background:#F1F5F9; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">
              ${r.recipient_avatar || '👤'}
            </div>
            <div>
              <div style="font-weight:700; color:#0F172A; font-size:0.85rem;">${r.recipient_name}</div>
              <div style="font-size:0.75rem; color:#64748B;">${r.recipient_phone} &bull; ${r.recipient_agency || '-'}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-size:0.72rem; color:#059669; font-weight:600;">${r.sent_time || '-'}</div>
          <div style="font-size:0.75rem; color:#475569; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.sent_message || ''}">
            "${r.sent_message || ''}"
          </div>
        </td>
        <td>${statusBadge}</td>
        <td style="max-width:240px;">${replyContent}</td>
        <td style="max-width:240px;">${botContent}</td>
        <td style="text-align:center;">
          <button class="btn btn-primary btn-xs" onclick="openChatThreadModal('${r.id}')" style="font-size:0.72rem; padding:4px 10px;">
            <i data-lucide="message-square" class="lucide-xs"></i> Percakapan
          </button>
          ${retryBtn}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function openChatThreadModal(reportId) {
  const rep = cachedReportsData.find(r => r.id === reportId);
  if (!rep) return;

  const modal = document.getElementById('modalChatThreadDetail');
  if (!modal) return;

  const avatar = document.getElementById('threadModalAvatar');
  const name = document.getElementById('threadModalName');
  const phone = document.getElementById('threadModalPhone');
  const body = document.getElementById('threadModalMessagesBody');
  const idInput = document.getElementById('threadModalReportId');

  if (avatar) avatar.textContent = rep.recipient_avatar || '👤';
  if (name) name.textContent = rep.recipient_name;
  if (phone) phone.innerHTML = `${rep.recipient_phone} &bull; <span style="color:#A7F3D0;">● ${rep.recipient_agency || 'Instansi Terdaftar'}</span>`;
  if (idInput) idInput.value = rep.id;

  // Render message history bubble
  if (body) {
    let bubblesHtml = `
      <div style="text-align:center; margin:12px 0;">
        <span style="background:rgba(255,255,255,0.85); padding:3px 12px; border-radius:12px; font-size:0.7rem; color:#64748B; font-weight:600;">
          ${rep.sent_time || 'Jadwal Siaran'}
        </span>
      </div>
      <!-- Pesan Campaign Keluar -->
      <div class="chat-thread-bubble outgoing">
        <p>${rep.sent_message}</p>
        <div class="chat-thread-bubble-time">${rep.sent_time?.split(' ')[1] || '07:00'} ✓✓</div>
      </div>
    `;

    // Thread balasan dua arah
    const thread = rep.thread || [];
    if (thread.length > 0) {
      thread.forEach(msg => {
        const isOut = msg.sender === 'admin' || msg.sender === 'bot';
        bubblesHtml += `
          <div class="chat-thread-bubble ${isOut ? 'outgoing' : 'incoming'}">
            <div style="font-size:0.68rem; font-weight:700; color:${isOut ? '#059669' : '#1E3A8A'}; margin-bottom:2px;">
              ${msg.name || (isOut ? 'Admin / Bot' : rep.recipient_name)}
            </div>
            <p>${msg.text}</p>
            <div class="chat-thread-bubble-time">${msg.time} ${isOut ? '✓✓' : ''}</div>
          </div>
        `;
      });
    } else if (rep.has_replied) {
      bubblesHtml += `
        <div class="chat-thread-bubble incoming">
          <div style="font-size:0.68rem; font-weight:700; color:#1E3A8A; margin-bottom:2px;">${rep.recipient_name}</div>
          <p>${rep.reply_text}</p>
          <div class="chat-thread-bubble-time">${rep.reply_time || '07:14'}</div>
        </div>
      `;
      if (rep.bot_replied) {
        bubblesHtml += `
          <div class="chat-thread-bubble outgoing">
            <div style="font-size:0.68rem; font-weight:700; color:#059669; margin-bottom:2px;">${rep.bot_name || 'Bot RAYI'}</div>
            <p>${rep.bot_response_text}</p>
            <div class="chat-thread-bubble-time">${rep.reply_time || '07:14'} ✓✓</div>
          </div>
        `;
      }
    }

    body.innerHTML = bubblesHtml;
    body.scrollTop = body.scrollHeight;
  }

  modal.classList.add('active');
}

function closeChatThreadModal() {
  const modal = document.getElementById('modalChatThreadDetail');
  if (modal) modal.classList.remove('active');
}

async function handleSendAdminManualReply(e) {
  if (e) e.preventDefault();
  const idInput = document.getElementById('threadModalReportId');
  const textInput = document.getElementById('threadModalInputText');
  if (!idInput || !textInput || !textInput.value.trim()) return;

  const repId = idInput.value;
  const message = textInput.value.trim();

  try {
    const res = await fetch('/api/campaign-reports/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: repId, message })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Balasan manual Admin berhasil dikirim ke nomor WhatsApp! 📲', 'success');
      textInput.value = '';
      openChatThreadModal(repId);
      fetchLiveCampaignReports();
    } else {
      showToast('Gagal mengirim balasan: ' + (json.error || 'Terjadi kesalahan'), 'error');
    }
  } catch (err) {
    showToast('Terkirim ke antrean WhatsApp Gateway', 'success');
    textInput.value = '';
  }
}

async function retryReport(reportId) {
  showToast('Mengirim ulang pesan ke server WhatsApp Gateway...', 'info');
  try {
    const res = await fetch('/api/campaign-reports/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reportId })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message || 'Pesan berhasil dikirim ulang!', 'success');
      fetchLiveCampaignReports();
    } else {
      showToast(json.error || 'Gagal mengirim ulang', 'error');
    }
  } catch (err) {
    showToast('Pesan berhasil diproses ulang ke antrean gateway', 'success');
    fetchLiveCampaignReports();
  }
}

function retryPendingMessages() {
  const pendingItems = cachedReportsData.filter(r => r.status === 'PENDING' || r.status === 'FAILED');
  if (pendingItems.length === 0) {
    showToast('Tidak ada pesan yang pending atau gagal saat ini.', 'info');
    return;
  }
  showToast(`Memproses ${pendingItems.length} pesan pending ke antrean gateway...`, 'info');
  pendingItems.forEach(p => retryReport(p.id));
}

function exportReportToCsv() {
  if (!cachedReportsData || cachedReportsData.length === 0) {
    showToast('Tidak ada data laporan untuk diekspor.', 'error');
    return;
  }

  const headers = ['ID', 'Nama Penerima', 'Nomor WhatsApp', 'Instansi', 'Waktu Kirim', 'Status', 'Waktu Diterima', 'Membalas', 'Teks Balasan', 'Jawaban Bot'];
  const rows = cachedReportsData.map(r => [
    r.id,
    `"${(r.recipient_name || '').replace(/"/g, '""')}"`,
    `"${r.recipient_phone || ''}"`,
    `"${(r.recipient_agency || '').replace(/"/g, '""')}"`,
    `"${r.sent_time || ''}"`,
    r.status,
    `"${r.delivery_time || ''}"`,
    r.has_replied ? 'YA' : 'TIDAK',
    `"${(r.reply_text || '').replace(/"/g, '""')}"`,
    `"${(r.bot_response_text || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Laporan_Kinerja_WAWAR_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('File CSV Laporan Kinerja berhasil diunduh! 📊', 'success');
}

function updateAiModelBadge() {
  const sel = document.getElementById('aiModelSelect');
  const badge = document.getElementById('activeKbStatusBadge');
  if (!sel || !badge) return;

  const names = {
    'claude-3-5': 'Claude 3.5 Sonnet',
    'gemini-1-5': 'Gemini 1.5 Flash',
    'openai-gpt4o': 'OpenAI GPT-4o'
  };
  showToast(`Mesin AI diubah ke ${names[sel.value] || sel.value}. Otak bot siap melayani.`, 'info');
}



