# پنل مدیریت مرزبان (Marzban Admin Panel)

سیستم جامع مدیریت کاربران و پنل‌های مرزبان با قابلیت‌های پیشرفته نظارت و کنترل

## ✨ ویژگی‌ها

### 🎯 مدیریت کاربران
- ایجاد و مدیریت کاربران با سطوح دسترسی مختلف (ادمین، اپراتور، مشاهده‌گر)
- سیستم احراز هویت امن با JWT
- مدیریت رمز عبور و فعال/غیرفعال کردن کاربران

### 🔧 مدیریت پنل‌ها
- افزودن و مدیریت پنل‌های مرزبان
- تست اتصال و اعتبارسنجی پنل‌ها
- کشف خودکار پنل‌های مرزبان در شبکه
- انتخاب و تنظیم این‌باندها برای هر پنل

### 👑 کنترل سوپر ادمین
- نظارت کامل بر فعالیت‌های اپراتورها
- کنترل دسترسی‌ها و مجوزها
- آمار و گزارشات جامع
- عملیات مدیریتی پیشرفته

### 🔍 کشف و جستجو
- جستجوی پنل‌های مرزبان با URL
- کشف خودکار پنل‌ها در دامنه
- تست اتصال و API
- وارد کردن خودکار پنل‌های یافت شده

### 📊 گزارشات و نظارت
- گزارشات فعالیت‌های کاربران
- آمار استفاده از پنل‌ها
- نظارت بر عملکرد سیستم
- لاگ‌های امنیتی

## 🚀 نصب و راه‌اندازی

### پیش‌نیازها
- Python 3.8+
- Node.js 16+
- PostgreSQL (اختیاری - SQLite برای توسعه)
- Redis (اختیاری)

### راه‌اندازی سریع

```bash
# کلون کردن پروژه
git clone <repository-url>
cd marzban-admin-panel

# اجرای اسکریپت راه‌اندازی
chmod +x start_dev.sh
./start_dev.sh
```

### راه‌اندازی دستی

#### Backend
```bash
cd backend

# نصب وابستگی‌ها
pip install -r requirements.txt

# راه‌اندازی پایگاه داده
python init_sqlite_db.py

# اجرای سرور
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend

# نصب وابستگی‌ها
npm install

# اجرای سرور توسعه
npm run dev
```

### راه‌اندازی با Docker

```bash
# اجرای تمام سرویس‌ها
docker-compose up -d

# مشاهده لاگ‌ها
docker-compose logs -f
```

## 🔧 پیکربندی

### متغیرهای محیطی

#### Backend (.env)
```env
# امنیت
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_MINUTES=10080

# پایگاه داده
DATABASE_URL=postgresql+psycopg://admin:admin@postgres:5432/marzban
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ORIGINS=http://localhost:3000

# ادمین اصلی
ROOT_ADMIN_EMAILS=admin@example.com,superadmin@example.com
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## 👤 کاربران پیش‌فرض

### ادمین اصلی
- **ایمیل**: admin@example.com
- **رمز عبور**: admin123
- **دسترسی**: کامل (سوپر ادمین)

## 📱 استفاده

### ورود به سیستم
1. به آدرس `http://localhost:3000` بروید
2. با اطلاعات ادمین اصلی وارد شوید
3. از داشبورد برای مدیریت سیستم استفاده کنید

### مدیریت کاربران
1. به بخش "کاربران" بروید
2. کاربران جدید ایجاد کنید
3. نقش‌ها و دسترسی‌ها را تنظیم کنید

### مدیریت پنل‌ها
1. به بخش "پنل‌ها" بروید
2. پنل‌های مرزبان را اضافه کنید
3. این‌باندها را انتخاب و تنظیم کنید

### کشف پنل‌ها
1. به بخش "کشف پنل‌ها" بروید
2. URL های پنل‌ها را وارد کنید یا دامنه را جستجو کنید
3. پنل‌های یافت شده را وارد کنید

### کنترل سوپر ادمین
1. به بخش "کنترل سوپر ادمین" بروید
2. فعالیت‌های اپراتورها را نظارت کنید
3. عملیات مدیریتی انجام دهید

## 🔒 امنیت

### سطوح دسترسی
- **سوپر ادمین**: دسترسی کامل به تمام بخش‌ها
- **ادمین**: مدیریت کاربران و پنل‌ها
- **اپراتور**: مدیریت کاربران در پنل‌های اختصاصی
- **مشاهده‌گر**: فقط مشاهده اطلاعات

### احراز هویت
- JWT Token با انقضای کوتاه
- Refresh Token برای تمدید خودکار
- Rate Limiting برای جلوگیری از حملات

### لاگ‌های امنیتی
- ثبت تمام فعالیت‌های مهم
- ردیابی تغییرات و عملیات
- گزارشات امنیتی

## 🛠️ توسعه

### ساختار پروژه
```
├── backend/                 # Backend (FastAPI)
│   ├── app/
│   │   ├── api/routes/     # API Routes
│   │   ├── core/           # Core functionality
│   │   ├── db/             # Database
│   │   ├── models/         # Database models
│   │   └── services/       # Business logic
│   └── requirements.txt
├── frontend/               # Frontend (Next.js)
│   ├── app/               # App Router
│   ├── components/        # UI Components
│   └── lib/              # Utilities
└── docker-compose.yml     # Docker configuration
```

### API Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### تست
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

## 🐛 عیب‌یابی

### مشکلات رایج

#### خطای 500 در افزودن پنل
- بررسی اتصال پایگاه داده
- بررسی لاگ‌های سرور
- تست اتصال به پنل مرزبان

#### مشکل در ورود
- بررسی تنظیمات JWT
- بررسی اطلاعات کاربر
- پاک کردن cache مرورگر

#### مشکل در کشف پنل‌ها
- بررسی اتصال شبکه
- بررسی تنظیمات فایروال
- تست دستی URL پنل

### لاگ‌ها
```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# Database logs
docker-compose logs postgres
```

## 📈 عملکرد

### بهینه‌سازی
- استفاده از Redis برای cache
- Connection pooling برای پایگاه داده
- Lazy loading در frontend
- Compression و minification

### مانیتورینگ
- Health check endpoints
- Performance metrics
- Error tracking
- Usage statistics

## 🤝 مشارکت

### گزارش باگ
1. مشکل را در Issues گزارش دهید
2. اطلاعات کامل سیستم را ارائه دهید
3. مراحل تکرار مشکل را بنویسید

### پیشنهاد ویژگی
1. ایده خود را در Discussions مطرح کنید
2. جزئیات و مزایا را توضیح دهید
3. نمونه کد یا mockup ارائه دهید

### Pull Request
1. Fork کنید
2. Branch جدید ایجاد کنید
3. تغییرات را commit کنید
4. Pull Request ارسال کنید

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است.

## 📞 پشتیبانی

- **Issues**: برای گزارش مشکلات
- **Discussions**: برای سوالات و پیشنهادات
- **Email**: support@example.com

## 🔄 بروزرسانی

### نسخه فعلی: 1.0.0

### تغییرات مهم
- راه‌اندازی اولیه سیستم
- پیاده‌سازی مدیریت کاربران
- اضافه کردن کشف پنل‌ها
- کنترل سوپر ادمین

### برنامه آینده
- [ ] پشتیبانی از چندین زبان
- [ ] API برای اپلیکیشن موبایل
- [ ] سیستم اعلان‌ها
- [ ] گزارشات پیشرفته
- [ ] پشتیبانی از LDAP/Active Directory

---

**نکته**: این سیستم برای مدیریت پنل‌های مرزبان طراحی شده و نیاز به دانش فنی مناسب دارد. لطفاً قبل از استفاده در محیط تولید، تمام تنظیمات امنیتی را بررسی کنید.