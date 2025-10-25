# Setup Custom Domain untuk Ada Ide

## 1. Setup Domain di Cloudflare Dashboard

### A. Setup Worker Route untuk adaide.akses.digital
1. Login ke Cloudflare Dashboard
2. Pilih domain: **akses.digital**
3. Pergi ke **Workers Routes**
4. Klik **Add Route**
   - Route: `adaide.akses.digital/*`
   - Worker: `ada-ide`
   - Zone: `akses.digital`

### B. Setup DNS Record
1. Pergi ke **DNS** > **Records**
2. Tambahkan CNAME record:
   - Type: `CNAME`
   - Name: `adaide`
   - Target: `ada-ide.threadsauto.workers.dev`
   - Proxy status: **Proxied** (orange cloud)
   - TTL: Auto

## 2. Verifikasi Setup

### Test Aplikasi
```bash
curl https://adaide.akses.digital
```

### Test File Access
Upload file di aplikasi, lalu akses:
```bash
curl https://adaide.akses.digital/files/namafile.jpg
```

## 3. SSL/TLS Settings

Pastikan SSL/TLS mode di Cloudflare:
- Mode: **Full** atau **Full (strict)**
- Edge Certificates: Auto-generated oleh Cloudflare

## 4. Deploy

Setelah konfigurasi DNS:
```bash
wrangler deploy
```

## Notes

- DNS propagation bisa memakan waktu 5-10 menit
- File R2 akan diakses via: `https://adaide.akses.digital/files/{filename}`
- Web app diakses via: `https://adaide.akses.digital`
- Pastikan custom domain sudah verify di Cloudflare dashboard
