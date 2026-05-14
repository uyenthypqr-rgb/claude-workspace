---
name: auto-fanpage
description: Đọc nội dung từ Google Drive (Doc/Sheet) và đăng/lên lịch lên Facebook — hỗ trợ Fanpage (tự động 100%, đảm bảo post lên feed/timeline), Profile cá nhân (chuẩn bị + nhắc), Group (tự động nếu là Admin). Đã fix bug "post chỉ xuất hiện trong album, không trên trang chủ".
---

# Skill: Auto Post Facebook (Page / Profile / Group)

Khi được gọi với `/auto-fanpage [target_url_hoặc_id]`, thực hiện tuần tự các bước sau.

**Lưu ý fix bug đã biết:** Lần test trước, post có ảnh được lên lịch xong, Facebook nhận bài nhưng KHÔNG xuất hiện trên trang chủ web + mobile, chỉ thấy ảnh trong album. Nguyên nhân: dùng `/photos` endpoint thuần. **Fix:** Skill này dùng flow 2-bước (upload photo `published=false` → POST `/feed` với `attached_media`) để post luôn xuất hiện trên timeline.

---

## Bước 1 — Xác định loại tài khoản đích và lấy token

Lấy argument từ lệnh. Nếu không có, hỏi:
> "Nhập link hoặc ID Facebook muốn đăng lên (Fanpage, Profile cá nhân, hoặc Group):"

**Phân loại từ URL:**

| Pattern URL | Loại | Xử lý |
|---|---|---|
| `facebook.com/[slug]` (Page đã xác minh) | `page` | Tự động qua Graph API |
| `facebook.com/profile.php?id=` hoặc `facebook.com/[tên]` (cá nhân) | `profile` | Chuẩn bị + nhắc thủ công |
| `facebook.com/groups/[id]` | `group` | Tự động qua Graph API nếu Admin |

**Nếu không rõ loại** → hỏi user.

**Với `target_type = page`:** Đọc `.env` để tìm `PAGE_N_ID`, `PAGE_N_NAME`, `PAGE_N_TOKEN` khớp với target. Nếu không tìm thấy → list các page có sẵn, hỏi chọn.

---

## Bước 2 — Lấy link Google Drive

Hỏi:
> "Nhập link Google Drive (Doc hoặc Sheet) chứa nội dung cần đăng:"

Trích `FILE_ID` từ URL. Đọc bằng `mcp__claude_ai_Google_Drive__read_file_content`.

---

## Bước 3 — Phân tích nội dung và phát hiện lịch đăng

### 3A. Google Doc
- Toàn bộ text làm nội dung
- Tìm pattern `[đăng lúc: YYYY-MM-DD HH:MM]` ở đầu/cuối

### 3B. Google Sheet — đọc cấu trúc cột

Tìm cột (không phân biệt hoa thường, VN/EN):

| Cột | Tên chấp nhận |
|---|---|
| Nội dung | `nội dung`, `content`, `message`, `caption` |
| Hình ảnh | `hình ảnh`, `image`, `photo_url`, `ảnh` |
| Link | `link`, `url` |
| Thời gian đăng | `thời gian đăng`, `scheduled_time`, `giờ đăng`, `time` |
| Loại tài khoản | `loại tài khoản`, `account_type`, `target_type` |
| Quyền riêng tư | `quyền riêng tư`, `privacy` |
| Trạng thái | `trạng thái`, `status` |
| Page slug | `page`, `page_slug` (nếu Sheet đăng cho nhiều page) |

**Phân loại hàng:**
- `thời gian đăng` trống / "ngay" / quá khứ → **đăng ngay**
- `thời gian đăng` tương lai → **lên lịch**
- `trạng thái` = `đã đăng` / `posted` → **bỏ qua**

---

## Bước 4 — Sinh content nếu chưa có (tuỳ chọn)

Nếu hàng có cột `chủ đề` thay vì `nội dung` (Sheet auto-generate mode):
- Gọi skill `fanpage-content-writer` với:
  - `page_slug`: từ config page (hoặc từ cột `page_slug`)
  - `topic`: từ cột `chủ đề`
  - `post_type`: từ cột `loại bài`
- Lấy output làm `message`

---

## Bước 5 — Kiểm tra nội dung (Checklist + Optimizer)

Chạy 2 skill song song:
1. `auto-fanpage-checklist` (BLOCK/WARN/SUGGEST chính sách FB)
2. `fanpage-engagement-optimizer` (điểm 0-100 + đề xuất tối ưu)

**Xử lý:**
- Checklist **BLOCK** → dừng, yêu cầu sửa
- Optimizer < 60/100 → hỏi: "Điểm tối ưu thấp ([N]/100). Xem gợi ý sửa không?"
- Pass cả 2 → tiếp tục

---

## Bước 6 — Preview và xác nhận

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PREVIEW BÀI ĐĂNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Loại      : [Fanpage / Profile / Group]
 Đích      : [page_name / page_id]
 Thời gian : [Ngay / 2026-05-14 19:30]
 Engagement: [N]/100 ⭐
─────────────────────────────────
 Nội dung  :
 [message]
─────────────────────────────────
 Ảnh  : [url / không]
 Link : [url / không]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Hỏi: "Đăng/lên lịch bài này? (có / không / sửa)"

---

## Bước 7 — Đăng lên Fanpage (CORE FIX — flow đảm bảo lên feed)

### Trường hợp A: Bài chỉ có text (không ảnh, không link)

```bash
RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/feed" \
  -d "message=$(echo "$MESSAGE" | jq -sRr @uri)" \
  -d "published=true" \
  -d "access_token={PAGE_TOKEN}")
```

### Trường hợp B: Bài có ảnh (1 ảnh) — FLOW 2 BƯỚC

**Bước B1: Upload photo với `published=false`** để lấy `media_fbid` (KHÔNG hiển thị)

```bash
PHOTO_RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/photos" \
  -d "url={IMAGE_URL}" \
  -d "published=false" \
  -d "access_token={PAGE_TOKEN}")

PHOTO_ID=$(echo $PHOTO_RESPONSE | jq -r '.id')
```

Kiểm tra `PHOTO_ID` không phải null. Nếu null → kiểm tra error code:
- `code 100, subcode 1366046`: URL ảnh không truy cập được từ Facebook server → đổi URL
- `code 1`: định dạng ảnh không hỗ trợ (WEBP một số trường hợp) → convert JPG/PNG

**Bước B2: POST `/feed` với `attached_media`** để post xuất hiện trên timeline

```bash
RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/feed" \
  -d "message=$(echo "$MESSAGE" | jq -sRr @uri)" \
  -d "attached_media[0]={\"media_fbid\":\"$PHOTO_ID\"}" \
  -d "published=true" \
  -d "access_token={PAGE_TOKEN}")
```

### Trường hợp C: Bài có nhiều ảnh (carousel)

Lặp upload từng ảnh với `published=false`, gom các `photo_id` vào `attached_media[0]`, `attached_media[1]`, ...:

```bash
ATTACHED=""
for i in $(seq 0 $((${#IMAGE_URLS[@]} - 1))); do
  PHOTO_ID=$(curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/photos" \
    -d "url=${IMAGE_URLS[$i]}" \
    -d "published=false" \
    -d "access_token={PAGE_TOKEN}" | jq -r '.id')
  ATTACHED="${ATTACHED}attached_media[$i]={\"media_fbid\":\"$PHOTO_ID\"}&"
done

curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/feed" \
  -d "message=$(echo "$MESSAGE" | jq -sRr @uri)" \
  -d "${ATTACHED}" \
  -d "published=true" \
  -d "access_token={PAGE_TOKEN}"
```

### Trường hợp D: Bài có link (không ảnh kèm)

Khuyến nghị: **KHÔNG đặt link trong message**. Đăng text-only trước, sau đó comment link.

```bash
# Đăng text trước
POST_RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/feed" \
  -d "message=$(echo "$MESSAGE_WITHOUT_LINK" | jq -sRr @uri)" \
  -d "published=true" \
  -d "access_token={PAGE_TOKEN}")

POST_ID=$(echo $POST_RESPONSE | jq -r '.id')

# Comment link
curl -s -X POST "https://graph.facebook.com/v23.0/$POST_ID/comments" \
  -d "message=Link chi tiết: {LINK}" \
  -d "access_token={PAGE_TOKEN}"
```

### Trường hợp E: Lên lịch (cho mọi case A-D)

Thêm `published=false&scheduled_publish_time={UNIX_TIMESTAMP}` vào lệnh POST `/feed`:

```bash
# Convert "2026-05-14 19:30" giờ VN sang unix timestamp UTC
SCHEDULED_TS=$(date -j -f "%Y-%m-%d %H:%M %Z" "2026-05-14 19:30 +0700" "+%s")

curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/feed" \
  -d "message=$(echo "$MESSAGE" | jq -sRr @uri)" \
  -d "attached_media[0]={\"media_fbid\":\"$PHOTO_ID\"}" \
  -d "published=false" \
  -d "scheduled_publish_time=$SCHEDULED_TS" \
  -d "access_token={PAGE_TOKEN}"
```

**Giới hạn Facebook:**
- `scheduled_publish_time` phải >= 10 phút từ hiện tại
- `scheduled_publish_time` phải <= 6 tháng từ hiện tại

---

## Bước 8 — Verify post đã lên feed (HOOK MỚI — CRITICAL)

Sau khi đăng (hoặc khi routine scheduled bắn lúc đúng giờ), CHẠY verify:

### Verify ngay sau khi đăng (cho case "đăng ngay")

Đợi 5 giây để Facebook propagate, sau đó:

```bash
sleep 5
VERIFY=$(curl -s "https://graph.facebook.com/v23.0/{POST_ID}?fields=id,message,permalink_url,is_published,created_time,attachments&access_token={PAGE_TOKEN}")

IS_PUBLISHED=$(echo $VERIFY | jq -r '.is_published')
PERMALINK=$(echo $VERIFY | jq -r '.permalink_url')
ATTACHMENT_TYPE=$(echo $VERIFY | jq -r '.attachments.data[0].type')
```

**Kiểm tra checklist:**

| Field | Mong đợi | Nếu sai |
|---|---|---|
| `is_published` | `true` (cho đăng ngay), `false` (cho scheduled) | Nếu `null` → post bị fail thầm, xem error log |
| `permalink_url` | URL dạng `https://facebook.com/{page_id}/posts/{post_id}` | Nếu null → post chưa publish, đợi thêm 30s rồi check lại |
| `attachments.data[0].type` | `photo` / `album` (carousel) / `share` (link) | Nếu là `album` mà bạn đăng 1 ảnh → có thể vẫn lên feed nhưng visual khác |

### Verify post xuất hiện trên feed page

```bash
RECENT_POSTS=$(curl -s "https://graph.facebook.com/v23.0/{PAGE_ID}/feed?limit=3&fields=id,message,created_time&access_token={PAGE_TOKEN}")

# Check POST_ID có trong recent posts không
FOUND=$(echo $RECENT_POSTS | jq -r ".data[] | select(.id == \"$POST_ID\") | .id")
```

Nếu `FOUND` rỗng → **post không lên feed**, mặc dù có post_id. Đây là bug đã gặp trước. Trong trường hợp này:
1. Log warning
2. Lấy `attachments` của post → nếu là `photo` đơn thuần (không qua `/feed` endpoint) → reupload bằng flow Trường hợp B
3. Thông báo user

### Verify visibility cho user thường (không phải admin)

```bash
# Lấy permalink, mở incognito browser (manual step) hoặc dùng FB Graph API debugger
echo "Verify URL: $PERMALINK"
echo "Mở link này trong tab ẩn danh để xác nhận post hiển thị cho user thường"
```

---

## Bước 9 — Cập nhật Sheet và log

Sau khi verify thành công:
- Cột `trạng thái` → `đã đăng`
- Cột `đã đăng lúc` → timestamp
- Cột `post_id` → POST_ID (nếu sheet có cột này)
- Cột `permalink` → PERMALINK_URL

Log dạng:
```
✅ [2026-05-13 22:30] Đăng thành công lên page Tuyển dụng PQR
   Post ID    : 499740783831824_1234567890
   Permalink  : https://facebook.com/499740783831824/posts/1234567890
   Verified   : ✅ Có trên feed, type=photo, is_published=true
```

Nếu fail:
```
❌ [2026-05-13 22:30] Lỗi đăng hàng [N]
   Lý do      : [error_message]
   Hành động  : [retry / skip / báo admin]
```

---

## Bước 10 — Lên lịch routine kiểm tra (cho mode scheduled)

Dùng `/schedule` tạo routine:
- **Tên**: `fb-auto-[target_type]-[target_id]`
- **Cron**: `*/15 * * * *`
- **Prompt**: `"Chạy /auto-fanpage-check, đọc fanpage-config.json, đăng bài đến giờ và verify post lên feed cho [target] [id]"`

---

## Xử lý lỗi Facebook Graph API

| Code | Subcode | Ý nghĩa | Hành động |
|---|---|---|---|
| 190 | - | Token hết hạn | Cảnh báo user, hướng dẫn refresh |
| 190 | 460 | Password changed | User cần re-auth |
| 200 | - | Thiếu quyền | Check scope `pages_manage_posts`, `pages_read_engagement` |
| 100 | 1366046 | URL ảnh không truy cập | Đổi sang URL khác hoặc upload trực tiếp |
| 100 | 33 | Page ID invalid | Verify page ID đúng |
| 368 | - | Nội dung vi phạm policy | Báo user, không retry |
| 1487390 | - | Scheduled time quá gần (< 10 phút) | Push lên ít nhất 11 phút |
| 1487409 | - | Scheduled time quá xa (> 6 tháng) | Báo user giới hạn |
| 4 | - | Rate limit | Đợi 1h, retry |
| 17 | - | User reached limit | Đợi 24h, retry |

---

## Kiểm tra token expiry trước mỗi lần đăng

```bash
TOKEN_INFO=$(curl -s "https://graph.facebook.com/debug_token?input_token={PAGE_TOKEN}&access_token={PAGE_TOKEN}")
EXPIRES_AT=$(echo $TOKEN_INFO | jq -r '.data.expires_at')
NOW=$(date +%s)
DAYS_LEFT=$(( ($EXPIRES_AT - $NOW) / 86400 ))

if [ $DAYS_LEFT -lt 14 ]; then
  echo "⚠️ Token còn $DAYS_LEFT ngày. Vui lòng refresh sớm."
fi
```

---

## Lưu ý quan trọng

- **LUÔN** dùng flow 2-bước cho ảnh để post lên timeline (đừng dùng `/photos` endpoint thuần)
- **LUÔN** verify `is_published` + `permalink_url` sau khi đăng
- **LUÔN** check token expiry trước batch lớn
- Đặt link trong **comment đầu tiên**, không trong message — tăng reach ~70%
- Scheduled post phải >= 10 phút và <= 6 tháng từ hiện tại
- Facebook API v23.0 là version hỗ trợ tại 2026; sẽ deprecate vào ~2028
