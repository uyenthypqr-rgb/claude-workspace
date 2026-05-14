# Skill: Auto Post Facebook từ Google Drive

Đọc nội dung từ Google Drive (Doc hoặc Sheet) và đăng/nhắc đăng lên Facebook.

| Loại tài khoản | Cơ chế | Mức tự động |
|---|---|---|
| **Fanpage** | Facebook MCP → Graph API | 100% tự động |
| **Profile cá nhân** | Chuẩn bị content + Push notification | Bạn bấm đăng (15 giây) |
| **Group** | Graph API `publish_to_groups` | Tự động nếu là Admin |

---

## Cách dùng

```
/auto-fanpage https://www.facebook.com/YourPage
/auto-fanpage https://www.facebook.com/profile.php?id=123456
/auto-fanpage https://www.facebook.com/groups/456789
```

---

## Template Google Sheet

Tạo sheet với các cột sau (tên cột linh hoạt — skill tự nhận diện):

| nội dung | hình ảnh | link | thời gian đăng | loại tài khoản | quyền riêng tư | trạng thái | đã đăng lúc |
|---|---|---|---|---|---|---|---|
| Chào buổi sáng! | https://i.imgur.com/abc.jpg | | 2026-05-10 08:00 | page | | chờ đăng | |
| Chia sẻ cá nhân | | | 2026-05-11 12:00 | profile | friends | chờ đăng | |
| Thảo luận nhóm | | https://blog.vn/bai | 2026-05-12 09:00 | group | | chờ đăng | |
| Đăng ngay | https://i.imgur.com/xyz.jpg | | | page | | | |

**Giá trị hợp lệ:**
- `loại tài khoản`: `page` / `profile` / `group`
- `quyền riêng tư`: `public` / `friends` / `only_me` (chỉ dùng cho profile)
- `trạng thái`: `chờ đăng` → skill tự cập nhật thành `đã đăng` hoặc `lỗi`
- `thời gian đăng`: định dạng `YYYY-MM-DD HH:MM` (VD: `2026-05-15 08:00`)

---

## Luồng hoạt động

```
/auto-fanpage [target]
    │
    ├─ Nhập link Google Drive
    ├─ Đọc Sheet (Google Drive MCP)
    ├─ Phân loại: page / profile / group
    │
    ├─ Kiểm tra checklist (BLOCK / WARN / OK)
    │
    ├─ [page / group] Đăng ngay qua Facebook MCP
    │
    ├─ [profile] Chuẩn bị content → bạn tự paste vào Facebook
    │
    └─ Lên lịch? → Lưu fanpage-config.json
                 → Tạo routine /schedule (check mỗi 15 phút)
                           │
                           ├─ [page/group] Tự đăng
                           └─ [profile] Push notification nhắc đúng giờ
```

---

## Thiết lập lần đầu

### Bước 1 — Kiểm tra Node.js

```bash
node -v   # cần v18 trở lên
```

Nếu chưa có: tải tại [nodejs.org](https://nodejs.org)

### Bước 2 — Tạo Facebook Developer App

1. Vào [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Chọn loại **Business**
3. Thêm sản phẩm: **Facebook Login** + **Pages API**
4. Vào **Settings > Basic** → copy **App ID** và **App Secret**

**Permissions cần bật trong App:**
- `pages_manage_posts` — đăng lên Page
- `pages_read_engagement` — đọc thông tin Page
- `publish_to_groups` — đăng vào Group (nếu cần)

### Bước 3 — Cấu hình biến môi trường

```bash
export FACEBOOK_APP_ID=your_app_id_here
export FACEBOOK_APP_SECRET=your_app_secret_here
```

Hoặc tạo file `.env` trong thư mục này (không commit):
```env
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
```

### Bước 4 — Xác thực Facebook (OAuth)

```bash
npx @supercorp/facebook-mcp --setup
```

Trình duyệt mở → đăng nhập Facebook → cấp quyền → token được lưu tự động.

### Bước 5 — Mở project trong Claude Code

```bash
cd "/Users/jackiviet/Desktop/CLAUDE CODE WORK SPACE/skill-fanpage-facebook"
claude
```

Facebook MCP khởi động tự động từ `.claude/settings.json`.
Google Drive MCP đã được cấu hình sẵn trong Claude Code.

### Bước 6 — Test lần đầu

```
/auto-fanpage https://www.facebook.com/YourPage
```

---

## Cấu trúc thư mục

```
skill-fanpage-facebook/
├── .claude/
│   ├── settings.json              # Facebook MCP config
│   └── skills/
│       ├── auto-fanpage.md        # Skill chính
│       ├── auto-fanpage-check.md  # Routine tự động check & đăng
│       └── auto-fanpage-checklist.md  # Kiểm tra nội dung
├── fanpage-config.json            # Cấu hình lịch (tự tạo)
└── README.md
```

---

## Quản lý lịch đăng

```
/schedule          # xem tất cả routine đang chạy
```

Hủy routine: `/schedule` → chọn `fb-auto-page-[id]` → Delete

---

## Lưu ý quan trọng

- **Profile cá nhân**: Facebook chặn API posting từ 2018, không thể tự động hoàn toàn. Skill chuẩn bị nội dung + nhắc bạn đúng giờ.
- **Fanpage**: Token cần làm mới mỗi 60 ngày (long-lived token)
- **Giới hạn ký tự**: 63.206 ký tự/bài
- **Routine check**: mỗi 15 phút — bài có thể đăng trễ tối đa 15 phút
- **Rate limit**: Facebook cho phép ~200 posts/hour/page
