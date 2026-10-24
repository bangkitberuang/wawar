# WAWAR — WhatsApp Gateway, Omnichannel & Bot RAYI

![WAWAR Banner](assets/banner-gedung-sate.jpg)

<p align="center">
  <img src="assets/logo-wawar.jpg" alt="WAWAR Logo" width="120" style="border-radius: 20px;" />
</p>

<p align="center">
  <strong>Gerbang Pesan &amp; Notifikasi Terpadu untuk Aplikasi Modern</strong><br>
  <em>WhatsApp • Telegram • Email &amp; OTP Engine • Maskot IKP: RAYI</em>
</p>

---

## 🏛️ Filosofi & Identitas

* **WAWAR (*Wawaran*)**: Berakar dari bahasa daerah yang bermakna mengumumkan, menyiarkan warta, atau menyebarkan kabar penting kedinasan dan publik. Bertindak sebagai infrastruktur mesin pengirim pesan (*Gateway Engine*) 24/7.
* **RAYI (Maskot Resmi IKP)**: Personifikasi asisten virtual dari bidang **Informasi dan Komunikasi Publik (IKP)**. Berkarakter santun, ramah, sigap, dan cekatan melayani kebutuhan administrasi perjalanan dinas (seperti Surat Tugas & SPPD) serta menjawab pertanyaan masyarakat dan pegawai.
* **Identitas Visual**: Menampilkan keanggunan arsitektur legendaris **Gedung Sate Bandung** dengan lanskap terasering pegunungan Jawa Barat, memadukan tradisi keluhuran budi dengan teknologi cloud modern.

---

## 🚀 Fitur Utama

1. **WhatsApp Gateway Enterprise (Evolution API v2 & Baileys)**:
   * Nyala 24/7 di VPS Hostinger Cloud (Kuala Lumpur).
   * Multi-Device, Multi-Instance (Bisa ganti / *switch* nomor kapan saja tanpa merombak sistem).
   * Pengiriman dokumen fisik **PDF (Format F4/A4)** resmi Surat Tugas & SPPD langsung ke chat pegawai.
   * Database PostgreSQL permanen (anti-logout saat server restart) & Redis caching queue.
2. **Telegram Bot Gateway**:
   * Pengiriman kilat tanpa batas kuota via Official Telegram Bot API.
   * Cadangan otomatis (*failover*) jika WhatsApp sedang offline.
   * Kirim berkas berukuran besar (hingga 50MB).
3. **Email Resmi & Mesin Verifikasi OTP**:
   * Pengiriman email ber-kop resmi domain `kitt.lt` (`noreply@kitt.lt`).
   * Generator kode OTP 6-digit dengan masa berlaku (TTL) 5 menit.
   * Verifikasi keamanan akun dan autentikasi instan.
4. **Klien Konsumen Pertama: APLIKASI TANDANG**:
   * Terintegrasi langsung dengan modul Tata Naskah & Administrasi Perjalanan Dinas TANDANG.

---

## 🛠️ Arsitektur Sistem

```text
┌─────────────────────────────────────────────────────────────┐
│                 APLIKASI KLIEN (KONSUMEN)                   │
│                                                             │
│   [ App 1: TANDANG ]     [ App 2: Internal ]   [ Komersial ]│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST API (Bearer Token)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      WAWAR HUB (VPS)                        │
│                                                             │
│   - Auth & API Rate Limiter                                 │
│   - Asisten Chatbot RAYI (Persona IKP)                      │
│   - Redis Queue & PostgreSQL Persistent Store               │
└──────────────┬────────────────┬────────────────┬────────────┘
               │                │                │
               ▼                ▼                ▼
       ┌───────────────┐┌───────────────┐┌───────────────┐
       │   WHATSAPP    ││   TELEGRAM    ││  EMAIL & OTP  │
       │ (Wawar-primary││  (Official    ││  (SMTP Resmi  │
       │  Baileys 24/7)││   Bot API)    ││   @kitt.lt)   │
       └───────────────┘└───────────────┘└───────────────┘
```

---

## 💻 Menjalankan Web UI Lokal

```bash
# Jalankan web server lokal
node server.js

# Buka di browser
http://localhost:3030
```

---

## 📡 Contoh Integrasi API (cURL / Next.js)

```bash
curl -X POST http://srv2091882.hstgr.cloud:8085/message/sendText/Wawar-primary \
  -H "apikey: WawarSecretMasterKey2026!" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "6285121042025",
    "text": "*[WAWAR x TANDANG]* Surat Tugas No 090/ST/2026 telah terbit."
  }'
```

---

## 👥 Pengembang & Hak Cipta
* **Platform**: WAWAR Notification Hub
* **Maskot**: RAYI (Informasi dan Komunikasi Publik - IKP)
* **Domain**: `kitt.lt`
* **Infrastruktur**: Hostinger VPS (KVM 2, Ubuntu 24.04 LTS, Coolify v4)
