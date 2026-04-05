# 🎬 Movix Backend - Movie Streaming Platform

Backend API cho nền tảng streaming phim Movix, được xây dựng với Express.js, TypeScript, PostgreSQL và Socket.IO.

---

## 🚀 Quick Start

### Khởi động với Docker (Khuyến nghị) 

```bash
# Clone repository
git clone <repository-url>
cd Movix-BE

# Khởi động services
docker-compose up -d

# Xem logs
docker-compose logs -f app

# Dừng services
docker-compose down
```

**Backend sẽ chạy tại**: http://localhost:5000

---

## 📋 Tính Năng

### ✅ Core Features
- 🎬 **Movie Management** - CRUD operations cho phim, TV shows
- 👤 **User Management** - Authentication, authorization, profiles
- 💬 **Comments** - Bình luận, reply, toxicity detection
- ⭐ **Ratings** - Đánh giá phim
- 📊 **Dashboard** - Thống kê cho admin
- 🎭 **People** - Quản lý diễn viên, đạo diễn
- 🎪 **Banners** - Quản lý banners trang chủ
- 📜 **History** - Lịch sử xem phim
- 🤖 **AI Chatbot** - Hỗ trợ người dùng với Gemini AI

### ✅ Real-time Features
- 📢 **Notifications** - Thông báo real-time với WebSocket
- 🎉 **Watch Party** - Xem phim cùng nhau real-time

---

## 📢 Notification System

Hệ thống notification đã được kiểm tra và **hoạt động đúng**.

### 📚 Tài Liệu Notification

1. **[TOM_TAT_NOTIFICATION.md](./TOM_TAT_NOTIFICATION.md)** 🇻🇳
   - Tóm tắt ngắn gọn bằng tiếng Việt
   - Quick start cho FE
   - Checklist tích hợp

2. **[NOTIFICATION_README.md](./NOTIFICATION_README.md)** 📖
   - Hướng dẫn chi tiết (~500 dòng)
   - Code examples (React, Vue)
   - API reference đầy đủ
   - Best practices

3. **[NOTIFICATION_QUICK_REFERENCE.md](./NOTIFICATION_QUICK_REFERENCE.md)** ⚡
   - Quick reference (~200 dòng)
   - Bảng API endpoints
   - Code snippets nhanh

4. **[NOTIFICATION_TEST_REPORT.md](./NOTIFICATION_TEST_REPORT.md)** 📊
   - Báo cáo kiểm tra chi tiết
   - Kiến trúc hệ thống
   - Kết quả testing

### 🧪 Test Files

- **[test-notification.http](./test-notification.http)** - HTTP test file cho REST Client
- **[test-notification-system.js](./test-notification-system.js)** - Automated test script

### ⚡ Quick Start Notification

```javascript
// Frontend - Kết nối WebSocket
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('notification:new', (notification) => {
  console.log('Thông báo mới:', notification);
  // Hiển thị toast notification
});

socket.on('notification:unread-count', (data) => {
  console.log('Số chưa đọc:', data.count);
  // Cập nhật badge
});
```

**👉 Xem [TOM_TAT_NOTIFICATION.md](./TOM_TAT_NOTIFICATION.md) để bắt đầu!**

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **AI**: Google Gemini AI
- **Deployment**: Docker & Docker Compose

---

## 📁 Cấu Trúc Dự Án

```
Movix-BE/
├── src/
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── routes/            # API routes
│   ├── middlewares/       # Auth, validation, etc.
│   ├── types/             # TypeScript types
│   └── utils/             # Helper functions
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Seed data
│   └── migrations/        # Database migrations
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Docker build file
└── package.json           # Dependencies
```

---

## 🔧 Environment Variables

Tạo file `.env` với nội dung:

```env
# Database
DATABASE_URL="postgresql://postgres:password@db:5432/movie_db"

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# Server
PORT=5000
FRONTEND_URL="http://localhost:3000"

# Google Gemini AI
GEMINI_API_KEY="your-gemini-api-key"

# Email (optional)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Đăng xuất

### Movies
- `GET /api/movies` - Lấy danh sách phim
- `GET /api/movies/:slug` - Chi tiết phim
- `POST /api/movies` - Tạo phim mới (admin)
- `PUT /api/movies/:id` - Cập nhật phim (admin)
- `DELETE /api/movies/:id` - Xóa phim (admin)

### Notifications
- `GET /api/notifications` - Lấy danh sách thông báo
- `GET /api/notifications/unread-count` - Số lượng chưa đọc
- `PATCH /api/notifications/:id/read` - Đánh dấu đã đọc
- `PATCH /api/notifications/read-all` - Đánh dấu tất cả
- `DELETE /api/notifications/:id` - Xóa thông báo

### Comments
- `GET /api/comments/movie/:movieId` - Lấy comments của phim
- `POST /api/comments` - Tạo comment
- `DELETE /api/comments/:id` - Xóa comment

### User Profile
- `GET /api/profile` - Lấy thông tin user
- `PUT /api/profile` - Cập nhật profile
- `GET /api/profile/favorites` - Danh sách yêu thích
- `POST /api/profile/favorites/:movieId` - Thêm vào yêu thích

### Dashboard (Admin)
- `GET /api/dashboard/stats` - Thống kê tổng quan
- `GET /api/dashboard/users` - Quản lý users
- `GET /api/dashboard/movies` - Quản lý movies

**👉 Xem [NOTIFICATION_README.md](./NOTIFICATION_README.md) để biết chi tiết API Notification**

---

## 🔌 WebSocket Events

### Notification Events
- `notification:new` - Thông báo mới
- `notification:unread-count` - Số lượng chưa đọc
- `notification:system` - Thông báo hệ thống

### Watch Party Events
- `party:created` - Party được tạo
- `party:joined` - User join party
- `party:left` - User rời party
- `party:sync` - Đồng bộ video

**👉 Xem [NOTIFICATION_QUICK_REFERENCE.md](./NOTIFICATION_QUICK_REFERENCE.md) để biết chi tiết WebSocket**

---

## 🧪 Testing

### Test Notification System
```bash
# 1. Cập nhật TEST_TOKEN trong file
# 2. Chạy test
node test-notification-system.js
```

### Test REST API
- Sử dụng file `test-notification.http` với VS Code REST Client
- Hoặc import vào Postman

### Manual Testing
```bash
# Kiểm tra server
curl http://localhost:5000/api

# Kiểm tra WebSocket status
curl http://localhost:5000/api/websocket/status
```

---

## 🐳 Docker Commands

```bash
# Khởi động services
docker-compose up -d

# Xem logs
docker-compose logs -f app

# Kiểm tra status
docker-compose ps

# Restart services
docker-compose restart

# Dừng services
docker-compose down

# Xóa volumes (reset database)
docker-compose down -v
```

---

## 🗄️ Database

### Prisma Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Open Prisma Studio
npx prisma studio
```

### Database Schema

Xem file `prisma/schema.prisma` để biết chi tiết schema.

**Main Models**:
- User
- Movie
- Genre
- Comment
- Rating
- Notification
- WatchParty
- Banner
- ChatbotLog

---

## 👥 Roles & Permissions

### User Roles
- **user** - Người dùng thông thường
- **admin** - Quản trị viên

### Permissions
- Admin có thể CRUD movies, genres, banners
- User chỉ có thể xem, comment, rate

---

## 🔒 Security

- ✅ JWT Authentication
- ✅ Password hashing với bcrypt
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection
- ✅ Rate limiting (TODO)

---

## 📊 Monitoring & Logs

```bash
# Xem logs real-time
docker-compose logs -f app

# Xem logs database
docker-compose logs -f db

# Xem logs của một service cụ thể
docker-compose logs -f app | grep "notification"
```

---

## 🚀 Deployment

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Docker Production

```bash
# Build image
docker build -t movix-backend .

# Run container
docker run -p 5000:5000 --env-file .env movix-backend
```

---

## 🤝 Contributing

### Development Workflow

1. Clone repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Create pull request

### Code Style

- TypeScript strict mode
- ESLint configuration
- Prettier formatting

```bash
# Run linter
npm run lint
```

---

## 📝 Changelog

### Version 1.0.0 (2025-12-03)

**Features**:
- ✅ Movie management system
- ✅ User authentication & authorization
- ✅ Comment system with toxicity detection
- ✅ Rating system
- ✅ Notification system (REST + WebSocket)
- ✅ Watch Party feature
- ✅ AI Chatbot with Gemini
- ✅ Admin dashboard
- ✅ Docker deployment

**Documentation**:
- ✅ Notification system documentation
- ✅ API reference
- ✅ Test scripts
- ✅ Quick reference guides

---

## 📞 Support

### Documentation Files

- **[TOM_TAT_NOTIFICATION.md](./TOM_TAT_NOTIFICATION.md)** - Tóm tắt Notification (Tiếng Việt)
- **[NOTIFICATION_README.md](./NOTIFICATION_README.md)** - Hướng dẫn chi tiết Notification
- **[NOTIFICATION_QUICK_REFERENCE.md](./NOTIFICATION_QUICK_REFERENCE.md)** - Quick Reference
- **[NOTIFICATION_TEST_REPORT.md](./NOTIFICATION_TEST_REPORT.md)** - Báo cáo kiểm tra

### Troubleshooting

Nếu gặp vấn đề:
1. Kiểm tra Docker đang chạy: `docker-compose ps`
2. Xem logs: `docker-compose logs -f app`
3. Kiểm tra database connection
4. Đọc documentation files
5. Chạy test scripts

---

## 📄 License

MIT License

---

## 👨‍💻 Authors

Movix Development Team

---

**🎉 Happy Coding! 🚀**

---

## 📚 Quick Links

- [Notification System Overview](./TOM_TAT_NOTIFICATION.md) 🇻🇳
- [Notification API Documentation](./NOTIFICATION_README.md) 📖
- [Quick Reference](./NOTIFICATION_QUICK_REFERENCE.md) ⚡
- [Test Report](./NOTIFICATION_TEST_REPORT.md) 📊
- [HTTP Test File](./test-notification.http) 🧪
- [Automated Test Script](./test-notification-system.js) 🤖
