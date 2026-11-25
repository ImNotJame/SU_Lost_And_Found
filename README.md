# SU Lost & Found

เว็บไซต์สำหรับประกาศสิ่งของหายและสิ่งของที่พบภายในมหาวิทยาลัย ผู้ใช้สามารถค้นหาโพสต์ สมัครสมาชิก ส่งคำขอรับคืน และติดตามสถานะได้

โปรเจกต์นี้แบ่งเป็น:

- `backend/` — REST API ที่พัฒนาด้วย FastAPI
- `frontend/` — เว็บแอปที่พัฒนาด้วย React และ Vite

## คุณสมบัติหลัก

- ค้นหาและกรองโพสต์ของหายหรือของที่พบ
- สมัครสมาชิกและเข้าสู่ระบบด้วย JWT
- สร้างโพสต์พร้อมชื่อ รายละเอียด สถานที่ วันที่ และรูปภาพ
- ดูโพสต์ของตนเอง เปลี่ยนสถานะ และลบโพสต์
- ส่งคำขอรับคืนพร้อมข้อความยืนยันสิทธิ์
- เจ้าของโพสต์อนุมัติหรือปฏิเสธคำขอ
- แสดงอีเมลเจ้าของเมื่อคำขอได้รับอนุมัติ

## เทคโนโลยี

| ส่วนงาน | เทคโนโลยี |
|---|---|
| Frontend | React 18, React Router, Vite |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL และ Psycopg 3 |
| Authentication | JWT และ Argon2 ผ่าน `pwdlib` |

## โครงสร้างโปรเจกต์

```text
SU_Lost_And_Found/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── uploads/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── dist/
└── README.md
```

## สิ่งที่ต้องติดตั้ง

- Python 3.10 หรือใหม่กว่า
- Node.js รุ่น LTS และ npm
- PostgreSQL

## เริ่มใช้งานบน Windows

### 1. สร้างฐานข้อมูล PostgreSQL

```sql
CREATE DATABASE lost_and_found;
```

### 2. ตั้งค่าและรัน Backend

เปิด PowerShell ที่โฟลเดอร์รากของโปรเจกต์:

```powershell
Set-Location 'C:\618458\SU_Lost_And_Found'
py -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

สร้างหรือแก้ไขไฟล์ `backend\.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost:5432/lost_and_found
JWT_SECRET_KEY=<random-secret-at-least-32-characters>
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

อย่า commit หรือแชร์ไฟล์ `.env`

จากโฟลเดอร์ราก สร้างตารางและรัน API:

```powershell
Set-Location 'C:\618458\SU_Lost_And_Found\backend'
python -m services.init_db
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend ทำงานที่:

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- OpenAPI: `http://127.0.0.1:8000/openapi.json`

### 3. รัน Frontend

เปิด PowerShell อีกหน้าต่าง:

```powershell
Set-Location 'C:\618458\SU_Lost_And_Found\frontend'
npm install
npm run dev
```

เปิด URL ที่ Vite แสดง โดยปกติคือ `http://localhost:5173`

Vite จะส่ง `/api/*` ไปยัง Backend โดยตัด `/api` ออก และส่ง `/uploads/*` ไปยัง Backend พอร์ต `8000`

### สร้างไฟล์สำหรับ Production

```powershell
Set-Location 'C:\618458\SU_Lost_And_Found\frontend'
npm run build
```

ไฟล์ผลลัพธ์จะอยู่ใน `frontend/dist/`

## Endpoint หลัก

ส่ง JWT ในคำขอที่ต้องเข้าสู่ระบบด้วย Header:

```http
Authorization: Bearer <access_token>
```

| Method | Path | สิทธิ์ | รายละเอียด |
|---|---|---|---|
| `POST` | `/auth/register` | สาธารณะ | สมัครสมาชิก |
| `POST` | `/auth/login` | สาธารณะ | เข้าสู่ระบบ |
| `GET` | `/auth/me` | Bearer | ดูบัญชีปัจจุบัน |
| `GET` | `/posts` | สาธารณะ | ดูและกรองรายการโพสต์ |
| `POST` | `/posts` | Bearer | สร้างโพสต์ |
| `GET` | `/posts/me` | Bearer | ดูโพสต์ของตนเอง |
| `PATCH` | `/posts/{post_id}/status` | Bearer, เจ้าของโพสต์ | เปลี่ยนสถานะโพสต์ |
| `POST` | `/posts/{post_id}/image` | Bearer, เจ้าของโพสต์ | อัปโหลดรูป |
| `DELETE` | `/posts/{post_id}` | Bearer, เจ้าของโพสต์ | ลบโพสต์ |
| `POST` | `/posts/{post_id}/claims` | Bearer | ส่งคำขอรับคืน |
| `GET` | `/posts/{post_id}/claims` | Bearer, เจ้าของโพสต์ | ดูคำขอที่ได้รับ |
| `PATCH` | `/posts/{post_id}/claims/{claim_id}` | Bearer, เจ้าของโพสต์ | อนุมัติหรือปฏิเสธคำขอ |
| `GET` | `/claims/me` | Bearer | ดูคำขอที่ตนเองส่ง |

รูปภาพที่อัปโหลดเข้าถึงได้ที่ `/uploads/{filename}`

