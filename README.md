# Ada Ide - Platform Manajemen Ide Konten

Platform web untuk membantu konten kreator individu mengelola ide konten agar lebih produktif. Dibangun dengan Cloudflare Workers, Hono, D1, dan R2.

## 🚀 Fitur

- ✅ **Autentikasi** - Sistem registrasi dan login dengan JWT
- 📝 **CRUD Ide** - Tambah, edit, hapus, dan kelola ide konten
- 🏷️ **Tags & Status** - Kategorisasi ide dengan tags dan status (draft, in progress, ready, published)
- 📎 **Upload Lampiran** - Upload file pendukung ke R2 (max 10MB)
- 🔍 **Pencarian & Filter** - Cari ide berdasarkan judul, status, dan tag
- 📊 **Statistik** - Visualisasi data dengan Chart.js
- 📱 **Responsive** - Tampilan mobile-friendly dengan Tailwind CSS

## 🛠️ Tech Stack

- **Backend**: Cloudflare Workers + Hono
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Frontend**: HTML, Tailwind CSS, Vanilla JavaScript
- **Charts**: Chart.js

## 📋 Prasyarat

- Node.js 18+ terinstall
- Akun Cloudflare dengan Workers enabled
- Wrangler CLI terinstall

```bash
npm install -g wrangler
```

## 🔧 Setup & Installation

### 1. Clone & Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Login ke Cloudflare

```bash
wrangler login
```

### 3. Setup Database D1

```bash
# Buat database
npm run db:create

# Catat database_id yang muncul, lalu update di wrangler.toml
# Ganti "your-database-id-here" dengan database_id Anda

# Jalankan migrasi schema
npm run db:migrate
```

### 4. Setup R2 Bucket

```bash
# Buat R2 bucket
npm run r2:create
```

### 5. Update Environment Variables

Copy `wrangler.toml.example` ke `wrangler.toml` dan update:
- `database_id` dengan ID database D1 Anda (dari step 3)
- `JWT_SECRET` dengan string random yang aman

```bash
# Copy example config
cp wrangler.toml.example wrangler.toml

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit wrangler.toml dan masukkan:
# - database_id dari output step 3
# - JWT_SECRET dari output command di atas
```

**PENTING**: Jangan commit `wrangler.toml` yang berisi JWT_SECRET actual ke git public!

### 6. Development

```bash
# Jalankan local development server
npm run dev

# Akses di http://localhost:8787
```

### 7. Deploy Production

```bash
# Deploy ke Cloudflare
npm run deploy
```

Aplikasi akan tersedia di: `https://ada-ide.<your-subdomain>.workers.dev`

## 📁 Struktur Project

```
ada-ide/
├── src/
│   ├── index.ts              # Entry point Hono
│   ├── types.ts              # TypeScript interfaces
│   ├── routes/
│   │   ├── auth.ts           # Auth endpoints
│   │   ├── ideas.ts          # CRUD ideas
│   │   ├── attachments.ts    # Upload/delete files
│   │   └── stats.ts          # Statistics
│   ├── utils/
│   │   ├── auth.ts           # JWT & password hashing
│   │   └── r2.ts             # R2 utilities
│   └── db/
│       └── schema.sql        # Database schema
├── public/
│   ├── index.html            # Frontend UI
│   └── script.js             # Frontend logic
├── package.json
├── wrangler.toml             # Cloudflare config
└── README.md
```

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get user info (protected)

### Ideas
- `GET /api/ideas` - List semua ide (support pagination & filter)
- `POST /api/ideas` - Tambah ide baru
- `GET /api/ideas/:id` - Detail ide
- `PUT /api/ideas/:id` - Update ide
- `DELETE /api/ideas/:id` - Hapus ide

### Attachments
- `POST /api/attachments/upload` - Upload file ke R2
- `DELETE /api/attachments/:id` - Hapus attachment

### Statistics
- `GET /api/stats` - Get statistik user

## 🔒 Security

- Password di-hash menggunakan SHA-256
- JWT untuk autentikasi dengan expiry 7 hari
- File upload dibatasi 10MB
- Validasi file type untuk keamanan
- CORS enabled untuk API access

## 📊 Database Schema

### users
- id, email, password, created_at, updated_at

### ideas
- id, user_id, title, description, tags, status, created_at, updated_at

### attachments
- id, idea_id, file_name, file_url, size, created_at

## 🎨 UI Features

- Minimal dan bersih
- Dark mode ready
- Responsive design
- Interactive charts
- Real-time filtering
- Modal-based workflows

## 🐛 Troubleshooting

### Database migration gagal
```bash
# Coba migrate dengan flag --local dulu
npm run db:migrate:local

# Lalu migrate ke production
npm run db:migrate
```

### R2 bucket tidak bisa diakses
- Pastikan bucket sudah dibuat: `wrangler r2 bucket list`
- Periksa binding di wrangler.toml
- Pastikan BUCKET binding sesuai dengan bucket_name

### JWT Secret error
- Generate JWT secret baru yang kuat
- Update di wrangler.toml bagian [vars]
- Redeploy aplikasi

## 📝 Development Tips

### Testing Local D1
```bash
# Migrate local database
wrangler d1 execute ada-ide-db --local --file=./src/db/schema.sql

# Query local database
wrangler d1 execute ada-ide-db --local --command="SELECT * FROM users"
```

### Testing Production D1
```bash
# Query production database
wrangler d1 execute ada-ide-db --command="SELECT * FROM users LIMIT 10"
```

### Monitoring R2 Storage
```bash
# List files in bucket
wrangler r2 object list ada-ide-storage

# Delete all files (BE CAREFUL!)
wrangler r2 object delete ada-ide-storage --file=filename
```

## 🚀 Deployment Checklist

- [ ] Database D1 sudah dibuat dan migrate
- [ ] R2 bucket sudah dibuat
- [ ] JWT_SECRET sudah diupdate dengan string random
- [ ] wrangler.toml sudah dikonfigurasi dengan benar
- [ ] Test di local environment dulu
- [ ] Deploy dengan `npm run deploy`
- [ ] Test register & login di production
- [ ] Test CRUD operations
- [ ] Test file upload

## 📄 License

MIT License

## 👨‍💻 Author

Built with ❤️ for content creators

---

**Happy Creating! 🎉**
