# MyPocket — Product & Technical Spec (v2)

PWA untuk menyimpan foto kartu/dokumen dalam bentuk visual "dompet" (pocket). Personal use, data disimpan di VPS sendiri (Postgres).

---

## 1. Istilah
- **Card** = document (foto kartu/dokumen yang disimpan)
- **Pocket** = wadah penyimpanan (dompet)

---

## 2. Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend | React + Vite | + `vite-plugin-pwa` untuk manifest & service worker otomatis |
| Styling | TailwindCSS | Cepat iterasi |
| Animasi | Framer Motion | `layout` + `layoutId` untuk shared-element transition |
| Drag reorder | `@dnd-kit/core` + `@dnd-kit/sortable` | Standar React untuk drag-and-drop list, ringan |
| Backend | Node.js (Express/Fastify) | Sederhana, jalan di VPS yang sama |
| Database | **PostgreSQL** (yang sudah ada di VPS) — bukan overkill, cuma dipakai untuk metadata, bukan simpan gambar | |
| Gambar | Disimpan sebagai **file di filesystem VPS** (mis. `/uploads/cards/`), path-nya disimpan di Postgres | Simpan gambar sebagai `bytea` di Postgres itu yang overkill & bikin query lambat. File di disk + path di DB jauh lebih ringan & standar |
| Auth | PIN, hash disimpan di Postgres | ENV var jadi fallback (lihat bagian 5) |

**Kenapa butuh backend sekarang:** karena data disimpan di VPS (bukan cuma di browser device kamu), otomatis butuh REST API kecil (Express) yang menjembatani React app ↔ Postgres ↔ filesystem. Ini juga artinya kamu bisa akses pocket yang sama dari HP dan laptop.

---

## 3. PWA — Penjelasan Simpel

"PWA wajib" itu maksudnya 3 file/fitur ini, biar app-nya bisa **di-install ke homescreen** dan terasa seperti app asli (bukan cuma tab browser):

1. **`manifest.json`** — file kecil yang bilang ke browser "nama app ini apa, icon-nya apa, warnanya apa" saat di-install ke homescreen.
2. **Service worker** — script yang jalan di background, bikin app tetap bisa dibuka (minimal shell-nya) walau internet lagi lemot/putus.
3. **Icons** (192x192 & 512x512) — pakai foto dompet yang kamu kirim sebagai sementara, tidak masalah.

Semua ini otomatis di-generate kalau pakai `vite-plugin-pwa`, tinggal isi config-nya. Tidak perlu ditulis manual.

---

## 4. Data Model

**Tabel `cards` (Postgres):**

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  front_image_path TEXT NOT NULL,
  back_image_path TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Tabel `auth` (simpan hash PIN):**

```sql
CREATE TABLE auth (
  id INTEGER PRIMARY KEY DEFAULT 1,
  pin_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**File gambar:**
- Sebelum upload ke server, kompres dulu di sisi client (canvas resize max width ~1200px, quality 0.8) supaya file kecil.
- Generate thumbnail (~300px) buat ditampilin di stack/shortcut view; full-res baru di-fetch saat document view dibuka.
- Hapus card → hapus row di Postgres **dan** hapus file fisiknya di server (jangan sampai numpuk file orphan).

---

## 5. PIN Security

Alurnya:
- PIN di-hash (SHA-256 + salt) dan disimpan di tabel `auth` — ini yang dipakai untuk login sehari-hari.
- `PIN_FALLBACK` disimpan di `.env` server — ini jadi **jalur darurat**: kalau tabel `auth` kosong/hilang/corrupt, server pakai hash dari env ini sebagai PIN yang valid. Berguna kalau kamu ganti server / reset DB dan lupa reset PIN dulu.
- Karena cuma untuk kamu sendiri, fitur "lupa PIN" formal di-skip dulu — kalau lupa, tinggal reset lewat akses server langsung (SSH ke VPS, update tabel `auth` atau ganti `.env`).
- Optional tapi disarankan: rate-limit percobaan PIN salah di endpoint API (misal max 5x per menit) biar gak brute-force-able walau cuma kamu yang pakai.

---

## 6. Screens & Flow

### 6.1 Lock Screen
PIN pad sederhana, submit ke `/api/auth/verify`.

### 6.2 Shortcut View (closed pocket)
3 card yang `is_favorite = true`. Tap → animasi buka pocket → ke Main View.
- Kalau favorite < 3, sisanya biarkan kosong/placeholder dashed.

### 6.3 Main View (open pocket)
- Card ditampilkan stacked (bertumpuk), urut berdasarkan `sort_order`.
- Slot dashed border = tombol buka Register form.
- Tap card pertama → lift animation.
- Tap lagi → buka Document View modal.
- **Drag** card di stack → reorder, update `sort_order` semua card yang kena geser lewat 1 API call (`PATCH /api/cards/reorder`).

### 6.4 Register (Add Card) Form
- Input nama.
- Upload foto depan (required, `capture="environment"` untuk buka kamera langsung di HP).
- Upload foto belakang (optional).

### 6.5 Document View (modal)
- Overlay gelap transparan.
- Nama, foto depan, foto belakang.
- **Icon star** (favorite/unfavorite — toggle `is_favorite`) dan **icon trash** (hapus card) di sebelahnya.
- Tap area gelap → close.

---

## 7. Animasi — Saran Konkret

Prinsip: satu momen animasi yang "niat" per transisi, bukan efek bertebaran di semua elemen.

1. **Buka pocket (shortcut → main view):**
   Shortcut view fade+scale-down sedikit lalu keluar; main view masuk dengan card-card muncul **staggered** (delay ~40ms antar card) sambil sedikit rotasi acak kecil (-3° s/d 3°) supaya kesan "kartu difan-out" seperti kartu asli di dompet, bukan kaku sejajar.

2. **Tap card (lift):**
   `translateY(-20px)` + shadow membesar, pakai spring transition (Framer Motion `type: "spring", stiffness: 300, damping: 20`) — kesan sedikit "mantul", bukan linear.

3. **Tap lagi (buka Document View):**
   Pakai `layoutId` yang sama antara card di stack dan card di modal (Framer Motion shared layout) → card yang di-tap secara visual "membesar jadi modal", bukan modal muncul dari tempat lain. Ini yang bikin transisinya berasa halus & terarah.

4. **Drag reorder:**
   Saat drag, card yang dipegang sedikit membesar (`scale: 1.05`) + shadow lebih tegas, card lain di stack geser dengan animasi `layout` otomatis dari dnd-kit + framer motion.

5. **Star/trash action di modal:**
   Star: icon "pop" kecil (scale 1 → 1.3 → 1) saat di-toggle, warnanya berubah instan ke warna aksen (jangan pakai transisi warna yang lambat, biar terasa responsif).
   Trash: card di modal fade+scale-down sebelum modal close, kasih jeda ~150ms biar user lihat konfirmasinya jalan (bisa ditambah confirm dialog simple kalau mau lebih aman).

---

## 8. Struktur Folder

```
myPocket/
  client/                  # React + Vite
    src/
      components/
        LockScreen.tsx
        ShortcutView.tsx
        PocketView.tsx
        CardStack.tsx
        CardItem.tsx
        RegisterForm.tsx
        DocumentModal.tsx
      lib/
        api.ts
        imageUtils.ts       # compress before upload
      store/
        useCardStore.ts
        useAuthStore.ts
    public/
      manifest.json
      icons/
  server/                  # Node + Express
    src/
      routes/
        auth.ts
        cards.ts
      db/
        pool.ts             # Postgres connection
        schema.sql
      uploads/               # folder gambar disimpan di sini
    .env                    # PIN_FALLBACK, DATABASE_URL, dll
```

---

## 9. Sisa Keputusan Kecil (opsional, bisa nanti)

- Limit jumlah card (biar disk VPS gak penuh)? Bisa skip dulu karena personal use.
- Rate-limit percobaan PIN — disarankan tapi bukan blocker.
- Auto-lock timeout kalau app di-background — bisa ditambah belakangan, gak wajib untuk MVP.

---

## 10. Deployment
- Frontend build (Vite) bisa di-serve statis oleh Express yang sama (satu proses, satu domain, gampang) atau dipisah ke Nginx sebagai reverse proxy ke API.
- **HTTPS wajib** untuk PWA install & akses kamera — pastikan VPS sudah pakai SSL (Let's Encrypt/Certbot kalau belum).
