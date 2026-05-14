---
name: auto-fanpage-check
description: Routine tự động — kiểm tra Google Sheet và đăng các bài đã đến giờ lên Facebook Fanpage, đồng thời verify post xuất hiện trên feed (web + mobile). Được gọi bởi scheduled routine, không dùng thủ công.
---

# Routine: Auto Fanpage Check & Post & Verify

Routine chạy tự động (mỗi 15 phút). Không tương tác người dùng — tự xử lý hoàn toàn.

**Update mới (fix bug):** Routine bây giờ verify post đã lên feed thật sự sau khi đăng. Nếu post chỉ vào album mà không lên timeline → tự retry với flow 2-bước.

---

## Bước 1 — Đọc cấu hình

Đọc `fanpage-config.json`. Nếu rỗng → log "Không có lịch" và dừng.

Lọc các entry có `active: true`.

---

## Bước 2 — Kiểm tra bài đến giờ cho từng schedule entry

Dùng giờ Việt Nam (UTC+7). Đọc Sheet bằng `mcp__claude_ai_Google_Drive__read_file_content`.

Lọc hàng thỏa cả 3:
1. `thời gian đăng` có giá trị hợp lệ
2. `thời gian đăng` <= now()
3. `trạng thái` NOT IN (`đã đăng`, `posted`, `done`, `lỗi vĩnh viễn`)

---

## Bước 3 — Pre-check token

Với mỗi page sắp đăng, gọi `debug_token` để check expiry. Nếu hết hạn → log error, đánh dấu `trạng thái` = `token-hết-hạn`, gửi notification cảnh báo admin.

---

## Bước 4 — Kiểm tra nội dung trước khi đăng

Với mỗi hàng, chạy skill `auto-fanpage-checklist`:
- **BLOCK** → trạng thái = `lỗi-policy`, log lý do, bỏ qua
- **WARN** → vẫn đăng (routine không có người duyệt), log warning
- Sạch → tiếp tục

Optional: chạy `fanpage-engagement-optimizer`, log điểm số (để báo cáo định kỳ).

---

## Bước 5 — Đăng từng bài (FIX BUG — flow 2-bước cho ảnh)

**Trường hợp A: Text-only**

```bash
RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/feed" \
  --data-urlencode "message=$MESSAGE" \
  -d "published=true" \
  -d "access_token=$PAGE_TOKEN")
POST_ID=$(echo $RESPONSE | jq -r '.id')
```

**Trường hợp B: Có ảnh — flow 2-bước**

```bash
# Bước B1: upload ảnh với published=false
PHOTO_RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/photos" \
  -d "url=$IMAGE_URL" \
  -d "published=false" \
  -d "access_token=$PAGE_TOKEN")
PHOTO_ID=$(echo $PHOTO_RESPONSE | jq -r '.id')

# Bước B2: tạo feed post với attached_media
RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v23.0/{PAGE_ID}/feed" \
  --data-urlencode "message=$MESSAGE" \
  -d "attached_media[0]={\"media_fbid\":\"$PHOTO_ID\"}" \
  -d "published=true" \
  -d "access_token=$PAGE_TOKEN")
POST_ID=$(echo $RESPONSE | jq -r '.id')
```

**Trường hợp C: Có link** — đăng text-only trước, comment link sau (xem `auto-fanpage.md` Trường hợp D)

---

## Bước 6 — VERIFY post đã lên feed (CRITICAL — fix bug)

Sau khi đăng thành công (có POST_ID), đợi 5 giây rồi verify:

```bash
sleep 5

VERIFY=$(curl -s "https://graph.facebook.com/v23.0/$POST_ID?fields=id,message,permalink_url,is_published,attachments&access_token=$PAGE_TOKEN")

IS_PUBLISHED=$(echo $VERIFY | jq -r '.is_published')
PERMALINK=$(echo $VERIFY | jq -r '.permalink_url')
```

**Verify 1: Post đã publish chưa**
- `is_published` = `true` → OK
- `is_published` = `false` → đợi thêm 30s, retry verify (tối đa 3 lần)
- `is_published` = `null` → post bị fail, log error

**Verify 2: Post có trong feed của page không**

```bash
RECENT=$(curl -s "https://graph.facebook.com/v23.0/{PAGE_ID}/feed?limit=5&fields=id&access_token=$PAGE_TOKEN")
FOUND=$(echo $RECENT | jq -r ".data[] | select(.id == \"$POST_ID\") | .id")
```

- `FOUND` không rỗng → ✅ post lên feed thành công
- `FOUND` rỗng → ❌ POST KHÔNG LÊN FEED (bug cũ tái diễn) → xem Bước 7

**Verify 3: Permalink URL hợp lệ**
- Pattern đúng: `https://www.facebook.com/{page_id}/posts/{post_id}` hoặc `/photos/...`
- Nếu pattern là `/photo.php?fbid=...` (chỉ photo trong album) → có khả năng không lên feed → xem Bước 7

---

## Bước 7 — Recovery khi post không lên feed

Nếu Verify 2 fail (post có ID nhưng không trên feed):

**Option A: Re-publish bằng cách edit `is_published`**

```bash
curl -s -X POST "https://graph.facebook.com/v23.0/$POST_ID" \
  -d "is_published=true" \
  -d "access_token=$PAGE_TOKEN"
```

Đợi 5s, verify lại. Nếu vẫn fail → Option B.

**Option B: Xoá post lỗi, đăng lại bằng flow 2-bước**

```bash
# Xoá
curl -s -X DELETE "https://graph.facebook.com/v23.0/$POST_ID?access_token=$PAGE_TOKEN"

# Đăng lại theo Trường hợp B (Bước 5)
# ... (lặp lại flow upload photo + create feed post)
```

Log lý do recovery để admin theo dõi pattern.

---

## Bước 8 — Cập nhật Sheet

Sau verify thành công:
- `trạng thái` → `đã đăng`
- `đã đăng lúc` → ISO timestamp
- `post_id` → POST_ID (nếu cột tồn tại)
- `permalink` → PERMALINK
- `engagement_score` → điểm từ optimizer (nếu cột tồn tại)

Sau verify fail (sau recovery vẫn fail):
- `trạng thái` → `lỗi-không-lên-feed`
- `error_message` → mô tả

---

## Bước 9 — Log tóm tắt

```
[auto-fanpage-check] Kết quả [2026-05-13 22:30 VN]:
─────────────────────────────────────────────
Pages quét : 2
Bài đến giờ: 5
─────────────────────────────────────────────
Page "Tuyển dụng PQR" :
  ✅ Đăng thành công + verify OK : 3 bài
  ⚠️  Đăng OK nhưng cần recovery : 1 bài (đã fix)
  ❌ Lỗi vĩnh viễn               : 0 bài

Page "PQR Lifestyle" :
  ✅ Đăng thành công : 1 bài
─────────────────────────────────────────────
Token expiry warnings:
  • Tuyển dụng PQR: còn 56 ngày (OK)
  • PQR Lifestyle: còn 8 ngày (⚠️ cần refresh)
─────────────────────────────────────────────
```

---

## Xử lý lỗi

| Tình huống | Hành động |
|---|---|
| Không đọc được Sheet | Log lỗi, không cập nhật config, retry lần check sau |
| Rate limit (code 4, 32) | Đánh dấu `chờ-retry`, đợi 1h |
| Token hết hạn | Đánh dấu `token-hết-hạn`, dừng routine page đó, gửi notification |
| Nội dung vi phạm (code 368) | Đánh dấu `lỗi-policy`, bỏ qua vĩnh viễn |
| URL ảnh không tải được (1366046) | Đánh dấu `lỗi-ảnh`, thử lần check sau (có thể URL tạm thời down) |
| Bài fail liên tục 3 lần | `lỗi-vĩnh-viễn`, bỏ qua, ghi log |

---

## Tự động báo cáo định kỳ

Cuối mỗi ngày (23:55 VN), tổng hợp:
- Số bài đăng thành công / fail trong ngày
- Engagement score trung bình
- Token nào sắp hết hạn (< 14 ngày)
- Top 3 bài có engagement cao nhất từ Page Insights (nếu API cho phép)

Push notification hoặc gửi vào Sheet `daily-report` (nếu user đã setup).

---

## Lưu ý

- Routine này **không hỏi user** bất cứ điều gì
- Chỉ đăng bài đến hoặc quá giờ, không đăng tương lai
- Verify là bắt buộc — nếu skip verify, bug cũ có thể tái diễn âm thầm
- Nếu Facebook API thay đổi behavior, log error và alert admin
