# Ruang Arus

Aplikasi manajemen keuangan pribadi berbasis Next.js, Supabase Auth, dan PostgreSQL. Antarmuka dan dashboard demo bisa dijelajahi tanpa akun; data demo hanya disimpan sementara di browser.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local` menggunakan nilai dari Supabase Dashboard → Project Settings → API. Jangan pernah memasukkan `service_role` key ke aplikasi browser.

## Menyiapkan Supabase

1. Buat proyek Supabase dan buka SQL Editor.
2. Jalankan isi [`supabase/schema.sql`](supabase/schema.sql) untuk membuat tabel transaksi, indeks, grant, dan kebijakan Row Level Security.
3. Pastikan autentikasi Email aktif di Authentication → Providers. Atur URL redirect/konfirmasi untuk domain lokal dan domain produksi.
4. Salin Project URL dan anon/public key ke environment aplikasi.

Kebijakan RLS membatasi baca, tambah, ubah, dan hapus transaksi ke pemilik yang sedang login. Jalankan ulang kebijakan hanya pada database baru; buat kebijakan tambahan dengan nama berbeda jika menyesuaikan schema yang sudah dipakai.

## Deploy ke Vercel

1. Push repository ini ke GitHub, lalu impor repository di Vercel. Vercel akan mendeteksi Next.js secara otomatis.
2. Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di Project Settings → Environment Variables untuk environment yang digunakan.
3. Deploy, lalu tambahkan domain Vercel ke Supabase Authentication → URL Configuration (Site URL dan redirect URLs).

Perintah verifikasi lokal: `npm run lint` dan `npm run build`.