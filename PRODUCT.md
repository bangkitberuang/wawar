# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Staf dan pengelola aplikasi pemerintah daerah (ASN/Non-ASN) serta administrator diseminasi informasi publik. Bukan pengguna teknis; prioritas utamanya adalah keterbacaan tinggi, kecepatan aksi, dan kejelasan status operasional pesan (WIB, 24 jam).

## Product Purpose
Gateway pengirim pesan WhatsApp massal & omnichannel (WhatsApp, Telegram, Email/OTP) terjadwal yang terintegrasi langsung dengan ekosistem aplikasi kedinasan. Memungkinkan pengiriman surat dinas, SPPD, notifikasi berkala, sapaan harian bertahap, dan pengingat event secara aman, transparan, dan terukur kinerjanya.

## Positioning
Satu-satunya WhatsApp Gateway & Dissemination Engine di lingkungan Pemda yang dilengkapi integrasi bot asisten cerdas (RAYI) berlandaskan dokumen kedinasan resmi (Strict Knowledge Base), visualisasi kalender siaran harian 31 hari (Model TANDANG), serta antrean cerdas anti-banned berbasis multi-instance Baileys.

## Operating Context
- Lingkungan kerja: Instansi Pemerintah Daerah Jawa Barat & Mitra Layanan Publik.
- Dokumen operasional: Surat Tugas, SPPD digital format F4/A4, SK Panitia, notifikasi presensi, dan panduan kegiatan publik.
- Ritme kerja harian: Apel pagi Senin (07:00 WIB), Sapa Subuh harian (04:30 WIB), Pengingat H-7/H-1/Hari-H event publik.

## Capabilities and Constraints
- **Capabilities**:
  1. Kalender Siaran Interaktif 31 Hari dengan penyaringan kategori program (Subuh, Dinas, Event) dan import Excel (.xlsx).
  2. 4 Pola Kampanye Cerdas: One-Time Broadcast, Series 31 Hari, Recurring Mingguan/Bulanan, Event Reminder Countdown.
  3. Persona Asisten Virtual RAYI dengan multi-engine (Keyword Rules, Gemini Strict, Gemini RAG).
  4. Laporan kinerja pengiriman: Log audit transparan (Terkirim, Tertunda, Gagal, Dibalas).
  5. Multi-Instance WhatsApp (Trio Nomor Strategis).
- **Constraints**:
  1. Wajib zona waktu WIB dengan format 24 jam.
  2. Bahasa antarmuka Bahasa Indonesia lugas dengan adab santun Sunda (Sampurasun/Wilujeng).
  3. Bebas dari gaya AI generik (tidak memakai emoji mentah di UI chrome/menu/tombol; memakai Lucide Icons resmi).
  4. Kontras memenuhi standar WCAG AA.

## Brand Commitments
- **Nama Produk**: WAWAR (diambil dari kata Sunda "wawar" yang berarti kabar, warta, pengumuman, atau siaran).
- **Asisten AI**: RAYI (kata Sunda untuk adik/kerabat muda yang sigap, santun, dan cekatan).
- **Ekosistem Induk**: BANGKIT Beruang Ecosystem (Rekayasa Digital Independen).
- **Identitas Visual**: Bersih, berwibawa, aksen hijau zamrud (#059669 / #10B981) dipadukan dengan tipografi modern Inter/Outfit dan Lucide Icons.

## Evidence on Hand
- Instance aktif: `Wawar-primary` (+62 851-2104-2025) pada Evolution API v2 (Hostinger VPS Cloud).
- Integrasi riil: TANDANG (Aplikasi SPPD & Tata Naskah Elektronik), Sistem Layanan IKP.
- Basis data lokal & JSON mock yang sinkron dengan SQLite/file storage.

## Product Principles
1. **Keterbacaan & Kecepatan Di Atas Kesan 'Wow'**: Setiap label tombol menyatakan aksi/hasil yang jelas, tidak memotong teks penting.
2. **Riwayat Sebagai Ukuran Kinerja**: Setiap siaran meninggalkan jejak audit yang jelas (siapa yang menerima, pending, gagal, membalas).
3. **Bot Cerdas Berpijak Data Fakta**: Bot hanya menjawab hal-hal yang tercantum di Knowledge Base resmi.
4. **Keselarasan Ekosistem**: WAWAR bekerja harmonis sebagai bagian dari BANGKIT Beruang Ecosystem.

## Accessibility & Inclusion
- Standar WCAG AA (kontras rasio teks minimal 4.5:1).
- Target sentuh minimal 44px untuk pengguna ponsel/tablet.
- Fokus keyboard terlihat jelas dan menghormati `prefers-reduced-motion`.
