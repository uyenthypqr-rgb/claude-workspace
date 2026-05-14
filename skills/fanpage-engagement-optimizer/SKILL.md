---
name: fanpage-engagement-optimizer
description: Tối ưu bài Facebook để tăng reach và engagement — kiểm tra hook mạnh, hashtag chất lượng, từ khoá Facebook SEO, timing tối ưu, định dạng feed-friendly. Dùng cùng fanpage-content-writer trước khi đăng. Output là điểm số 0-100 + danh sách cải tiến cụ thể.
---

# Skill: Fanpage Engagement Optimizer

Tối ưu bài Facebook để đạt reach + engagement tốt nhất theo thuật toán 2026.

---

## Input

```yaml
message: "[nội dung bài]"
image_count: 0 | 1 | 2-9 (carousel) | 10+
content_type: text | photo | carousel | video | reel | link
target_time_vn: "YYYY-MM-DD HH:MM"   # giờ Việt Nam
page_topic: "tuyển dụng" | "B2B" | "lifestyle" | "ecommerce"
```

---

## Tiêu chí chấm điểm (tổng 100)

### 1. Hook strength (20 điểm)
- Câu đầu (trước ký tự thứ 200) — Facebook cắt "Xem thêm" tại đây
- Có yếu tố cụ thể (số, tên, khoảnh khắc, hình ảnh)? +10
- Tránh được clickbait (no "không tin được", "shock") +5
- Không bắt đầu bằng "Xin chào", "Hôm nay PQR" +5

**Cách check:**
```
hook = message[:200]
score = 0
if any(pat in hook for pat in ["không tin được", "BIẾT GÌ KHÔNG", "🔥🔥🔥", "HOT HOT"]): score -= 10
if any(starts in hook.lower() for starts in ["xin chào", "hôm nay"]): score -= 5
if re.search(r'\d+', hook): score += 5  # có số
if re.search(r'(sáng|chiều|tối|hôm)', hook): score += 5  # khoảnh khắc
```

### 2. Hashtag quality (15 điểm)
- Số lượng hashtag (Facebook khuyến nghị 1-3, max 5)
  - 1-3: +10
  - 4-5: +5
  - 6+: 0
  - 10+: -5 (spam signal)
- Hashtag có cấu trúc tốt (CamelCase, không quá dài): +5

### 3. Link placement (15 điểm)
- Bài KHÔNG có link trong message body → +15 (best)
- Có link nhưng ở dòng cuối, sau CTA → +10
- Link ở giữa message → +5
- Link ở đầu (3 dòng đầu) → 0

**Lý do:** Facebook giảm reach ~70% cho bài có external link để giữ user trong app. Best practice: đặt link trong comment đầu tiên, ghi "Link ở comment 👇" trong bài.

### 4. Content format (15 điểm)
- Có line break giữa các đoạn (>=2 đoạn) → +5
- Đoạn ngắn (max 3 dòng/đoạn) → +5
- Dùng bullet `•` hoặc `-` cho list 3+ ý → +5

### 5. Visual content (15 điểm)
- Có ảnh → +5 (text-only chỉ đạt 1/3 reach của có ảnh)
- Carousel 3-5 ảnh → +10
- Video native > 30s → +12
- Reel < 60s vertical → +15 (Facebook đang ưu tiên Reels 2-3x)
- Link preview only → 0
- External video link → -5 (Facebook ghét YouTube/TikTok link)

### 6. Engagement bait check (10 điểm — trừ điểm)
Quét các patterns:
- "tag bạn bè / tag a friend" → -10
- "share nếu / share if" → -10
- "like nếu đồng ý / like if" → -10
- "comment có/không / comment yes or no" → -5
- "đoán xem / guess" → -5

### 7. Timing optimization (10 điểm)
Tham chiếu page config `best_post_times_vn`:
- Trong best slot → +10
- Lệch best slot < 1h → +7
- Lệch 1-3h → +4
- Ngoài best slot, không phải 0h-6h → +2
- Trong khung 0h-6h sáng → 0

### 8. Length sweet spot (10 điểm)

| Length | Điểm | Lý do |
|---|---|---|
| < 80 chars | 3 | Quá ngắn, không đủ context, reach trung bình |
| 80-280 chars | 10 | Sweet spot Facebook 2026 cho B2C |
| 280-500 chars | 8 | Vẫn tốt cho recruitment / B2B |
| 500-1200 chars | 6 | Long-form, cần hook tốt |
| 1200-2500 chars | 4 | Risk bị scroll qua |
| > 2500 chars | 2 | Hiếm khi reach tốt |

---

## Output format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ENGAGEMENT OPTIMIZATION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TỔNG ĐIỂM: [N]/100  [⭐ EXCELLENT | 🟢 GOOD | 🟡 OK | 🔴 NEEDS WORK]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ĐIỂM CHI TIẾT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Hook strength      : [X]/20
 Hashtag quality    : [X]/15
 Link placement     : [X]/15
 Content format     : [X]/15
 Visual content     : [X]/15
 Engagement bait    : [X]/10 (trừ nếu vi phạm)
 Timing             : [X]/10
 Length             : [X]/10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CẢI TIẾN ĐỀ XUẤT (priority)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [Cao] [Vấn đề + cách sửa cụ thể]
2. [TB] [...]
3. [Thấp] [...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SO SÁNH VỚI BENCHMARK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Page tuyển dụng trung bình : ~65/100
• Top 10% bài đăng tốt nhất  : ~85/100
• Bài này                    : [N]/100
```

---

## Quy tắc thuật toán 2026 (đã verify)

### Yếu tố TĂNG reach
1. **Native video / Reel** (đặc biệt < 60s, vertical) — ưu tiên 2-3x
2. **Carousel ảnh** — engagement rate cao hơn single photo ~30%
3. **Câu hỏi mở trong content** — tăng comment tự nhiên
4. **Reply mọi comment trong 1h đầu** — signal "active page"
5. **Post text-only ngắn (<280 char)** — viral nhanh nếu hook mạnh
6. **Time-relevant content** (trending topic, breaking moment)

### Yếu tố GIẢM reach
1. **External link trong message body** — giảm 70-80%
2. **Engagement bait** — Facebook penalty rõ ràng
3. **Repost nội dung cũ** trong 7 ngày
4. **Hashtag spam (>10)** — auto-flag
5. **All-caps text** > 5 từ liên tiếp
6. **Stock photo có watermark**
7. **Đăng quá thường xuyên** (>5 bài/ngày cho page < 100k follower)

### Facebook SEO — từ khoá

Facebook KHÔNG có "SEO" như Google, nhưng có:

1. **Page name + about section** — index trong Facebook Search
2. **Hashtag** — discoverable qua hashtag search
3. **Location tag** — visible trong "Posts near you"
4. **Alt text ảnh** — accessibility + Facebook ranking signal
5. **Page category** — Facebook gợi ý page cho user dựa trên category

**Cho page tuyển dụng:**
- Page category: "Recruiter" hoặc "Employment Agency"
- About: chứa keyword "tuyển dụng", "việc làm", "HCM", "fresher", "intern"
- Mỗi post nên có 1-2 hashtag job-specific (`#TuyenFrontend`, `#VieclamHCM`)
- Tag location TP.HCM cho mọi post recruitment

---

## Tự động sửa (auto-fix)

Nếu user đồng ý, có thể auto-fix các vấn đề sau:
- ✅ Di chuyển link từ body xuống "comment đầu tiên"
- ✅ Cắt hashtag từ 6+ xuống 3
- ✅ Thay engagement bait phrases bằng câu hỏi mở
- ✅ Thêm line break giữa đoạn nếu text liền 1 khối
- ✅ Đề xuất reschedule sang slot tốt hơn

Không auto-fix:
- ❌ Hook (cần user duyệt vì giọng văn riêng)
- ❌ Visual recommendations (cần human chọn ảnh thật)
- ❌ Length (đôi khi dài là cần thiết — vd: JD chi tiết)

---

## Format quy chuẩn ảnh/video (Facebook 2026)

| Loại | Tỉ lệ | Kích thước tối ưu | File |
|---|---|---|---|
| Feed image (portrait) | 4:5 | 1080×1350 | JPG/PNG, <8MB |
| Feed image (square) | 1:1 | 1080×1080 | JPG/PNG, <8MB |
| Carousel | 1:1 hoặc 4:5 | 1080×1080 / 1080×1350 | Tối đa 10 ảnh |
| Story | 9:16 | 1080×1920 | <30s video |
| Reel | 9:16 | 1080×1920 | 15-90s, <100MB |
| Cover photo | 16:9 | 1640×856 | PNG nét hơn JPG |
| Profile photo | 1:1 | 360×360 (min) | Sẽ crop tròn |

**Text overlay rule:** Diện tích text trên ảnh < 20% (Facebook test gần đây không penalize nghiêm như trước nhưng vẫn ảnh hưởng CPC nếu chạy ad).

---

## Tổng quy trình tối ưu

1. **Sinh content** từ skill `fanpage-content-writer`
2. **Chạy optimizer** này → nhận điểm số
3. **Nếu < 70/100** → hỏi user: "Sửa theo gợi ý không?" → auto-fix các item user đồng ý
4. **Chạy lại optimizer** sau khi sửa
5. **Đạt ≥ 75/100** → chuyển sang skill `auto-fanpage-checklist` để check policy
6. **Pass cả 2** → đưa qua skill `skill-fanpage-facebook` để đăng/lên lịch
