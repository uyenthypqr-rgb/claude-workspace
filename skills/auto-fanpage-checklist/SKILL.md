---
name: auto-fanpage-checklist
description: Kiểm tra nội dung bài đăng theo chính sách Facebook và tiêu chí tối ưu reach — hỗ trợ Fanpage, Profile cá nhân, và Group. Trả về kết quả PASS/WARN/BLOCK với giải thích cụ thể.
---

# Skill: Facebook Content Checklist

Khi được gọi với nội dung bài đăng, phân tích theo `target_type` và trả về báo cáo kiểm tra.

---

## Cách gọi từ skill khác

Skill này được `auto-fanpage.md` gọi nội bộ ở Bước 5 (trước khi đăng). Nhận input:
- `message`: nội dung text bài đăng
- `image_url`: URL ảnh (nếu có)
- `link`: URL đính kèm (nếu có)
- `content_type`: `text` / `image` / `video` / `reel` / `link`
- `post_time`: thời gian dự định đăng (nếu lên lịch)
- `target_type`: `page` / `profile` / `group` — **bắt buộc để điều chỉnh tiêu chí**
- `privacy`: `public` / `friends` / `only_me` (chỉ áp dụng cho profile)

**Điều chỉnh theo `target_type`:**
- `page`: áp dụng toàn bộ checklist, nghiêm ngặt nhất (Page bị giám sát kỹ hơn)
- `profile`: bỏ qua kiểm tra branded content, branded partnership; thêm kiểm tra privacy; nới lỏng engagement bait (cá nhân được "tag bạn bè" trong context tự nhiên)
- `group`: tương tự page nhưng không áp dụng branded content policy; thêm kiểm tra phù hợp chủ đề group

---

## NHÓM 1 — KIỂM TRA POLICY (🚫 BLOCK nếu vi phạm)

Phân tích `message` theo từng tiêu chí dưới đây. Nếu vi phạm bất kỳ tiêu chí nào trong nhóm này → **BLOCK**, không cho đăng, giải thích lý do cụ thể.

### 1.1 Ngôn ngữ thù địch & quấy rối
- Không chứa ngôn từ phân biệt chủng tộc, tôn giáo, giới tính, khuynh hướng tình dục
- Không so sánh bất kỳ nhóm người nào với động vật, bệnh dịch, "rác"
- Không kêu gọi bạo lực hoặc tự làm hại bản thân
- Không nhắm cá nhân cụ thể với ngôn từ đe dọa/xúc phạm

### 1.2 Thông tin sai lệch
- Không chứa tuyên bố sản phẩm/thực phẩm bổ sung "chữa khỏi bệnh ung thư / tiểu đường / HIV"
- Không chứa thông tin sai về vắc-xin (gây vô sinh, tự kỷ)
- Không chứa thông tin gian lận tài chính (lợi nhuận đảm bảo, không rủi ro)
- Không chứa thông tin bầu cử sai lệch nếu có context bầu cử

### 1.3 Nội dung người lớn & vi phạm nghiêm trọng
- Không chứa mô tả tình dục tường minh
- Không liên quan đến nội dung xâm hại trẻ em
- Không chứa hình ảnh/mô tả bạo lực cực đoan

### 1.4 Vi phạm bản quyền rõ ràng
- Không chứa lyrics bài hát đầy đủ (>4 dòng liên tiếp)
- Không chứa đoạn văn dài copy từ báo/tác giả khác không có attribution
- Nếu `image_url` là ảnh stock rõ ràng (Shutterstock watermark, Getty watermark) → cảnh báo

### 1.5 Vi phạm luật Việt Nam (nếu page target Vietnam)
- Không chứa nội dung chỉ trích chính quyền trực tiếp
- Không kêu gọi biểu tình/bất tuân dân sự
- Không chứa nội dung bị cấm theo Nghị định 147/2024/NĐ-CP

---

## NHÓM 2 — KIỂM TRA THUẬT TOÁN (⚠️ WARN nếu vi phạm)

Nếu vi phạm các tiêu chí dưới đây → **WARN**: liệt kê vấn đề, đề xuất sửa, hỏi người dùng có muốn tiếp tục không.

### 2.1 Engagement bait — Facebook tự động giảm reach
Phát hiện các cụm từ/pattern sau trong `message`:

**Tiếng Việt:**
- "tag bạn bè", "tag người thân", "tag ai", "tag một người"
- "share nếu", "chia sẻ nếu", "share cho bạn bè nếu"
- "like nếu đồng ý", "thả tim nếu", "react nếu"
- "bình luận có/không", "comment có/không", "gõ có nếu"
- "điền vào chỗ trống", "hoàn thành câu"
- "đoán xem", "đoán thử", "guess"
- "share để nhận", "chia sẻ để được"

**Tiếng Anh:**
- "tag a friend", "tag someone", "tag your"
- "share if you agree", "share if you"
- "like if yes", "comment yes or no", "react if"
- "fill in the blank", "finish this sentence"
- "guess the", "double tap"

### 2.2 Clickbait & giật tít
Phát hiện pattern:
- "bạn sẽ không tin được...", "you won't believe"
- "số [N] sẽ khiến bạn sốc", "number X will shock you"
- "bí quyết mà [chuyên gia/bác sĩ] giấu bạn"
- "BREAKING:", "JUST IN:" không có context tin tức thực
- Tiêu đề ALL CAPS hoàn toàn (>5 từ liên tiếp viết hoa)
- Dấu "!!!" hoặc "???" quá 2 lần liên tiếp

### 2.3 Link trong caption (giảm reach ~70-80%)
- Nếu `link` được đặt trong `message` (không phải comment riêng) → WARN:
  > "Link trong caption làm giảm reach ~70-80%. Nên đặt link vào bình luận đầu tiên thay vì caption."

### 2.4 Hashtag quá nhiều
- Đếm số hashtag (`#`) trong `message`
- Nếu > 3 hashtag → WARN: "Facebook khuyến nghị tối đa 1-3 hashtag/bài. Bài này có [N] hashtag."
- Nếu > 10 hashtag → WARN mức cao: "Hashtag spam làm giảm reach nghiêm trọng."

### 2.5 Nội dung trùng lặp / template
- Nếu message trông như template điền chỗ trống với placeholder rõ ràng `[TÊN]`, `{nội dung}`, `<<điền vào>>` → WARN

### 2.6 Thời gian đăng không tối ưu (nếu `post_time` có giá trị)
Kiểm tra múi giờ Việt Nam (UTC+7):
- Nếu đăng 0h-6h → WARN: "Đăng lúc [giờ] VN — ít người online. Khung giờ tốt nhất: 7-9h sáng hoặc 7-9h tối."
- Nếu đăng 10h-11h hoặc 14h-16h → OK (khung giờ tốt)
- Nếu đăng Chủ nhật → WARN nhẹ cho business page: "Thứ 5-6 có engagement cao hơn ~20%."

---

## NHÓM 3 — GỢI Ý TỐI ƯU (💡 SUGGEST)

Không chặn, không hỏi xác nhận — chỉ hiển thị gợi ý cuối báo cáo.

### 3.1 Độ dài nội dung
- Nếu `message` < 50 ký tự và không có ảnh → "Bài ngắn + không có ảnh thường reach thấp. Thêm ảnh hoặc mở rộng nội dung."
- Nếu `message` > 5000 ký tự → "Caption dài có thể bị cắt. Facebook hiển thị tối đa ~480 ký tự trước khi 'Xem thêm'."

### 3.2 Loại nội dung
- Nếu `content_type` = `text` (không có ảnh/video) → "Bài chỉ text reach thấp hơn 2.3x so với bài có ảnh. Cân nhắc thêm ảnh."
- Nếu `content_type` = `link` → "Video native và Reels có reach cao hơn nhiều so với link preview."
- Nếu `content_type` = `image` → "Reels đang được Facebook ưu tiên 2-3x hơn ảnh trong algorithm 2025."

### 3.3 Câu hỏi mở trong nội dung
- Nếu không có câu hỏi (`?`) trong message → "Bài đăng có câu hỏi mở nhận được nhiều comment hơn, giúp tăng reach."

### 3.4 Call-to-action không vi phạm
- Nếu không có CTA → "Cân nhắc thêm CTA rõ ràng (VD: 'Chia sẻ suy nghĩ của bạn bên dưới nhé 👇') — không vi phạm engagement bait."

### 3.5 Emoji
- Nếu không có emoji và content_type là lifestyle/entertainment → "Emoji tăng tương tác cho content B2C. Cân nhắc thêm 1-2 emoji phù hợp."

### 3.6 Spec kỹ thuật (nếu có ảnh/video)
- Nhắc nhở nếu chưa biết spec:
  - Ảnh tối ưu: 4:5 portrait (1080×1350px) hoặc 1:1 square (1080×1080px)
  - Text overlay trên ảnh: dưới 20% diện tích
  - Video: 9:16 dọc, 1080×1920px, MP4, H.264, dưới 1GB
  - Reels: 15-30 giây, vertical

---

## NHÓM 4 — RIÊNG CHO PROFILE CÁ NHÂN (chỉ áp dụng khi `target_type = profile`)

### 4.1 Quyền riêng tư (⚠️ WARN)
- Nếu `privacy` trống → WARN: "Chưa chọn đối tượng xem. Mặc định sẽ là Public — bạn có muốn đổi sang 'Bạn bè' không?"
- Nếu nội dung chứa thông tin cá nhân nhạy cảm (địa chỉ, số điện thoại, CMND) và `privacy` = `public` → WARN: "Nội dung có thể chứa thông tin cá nhân — cân nhắc đăng chế độ 'Bạn bè' thay vì công khai."

### 4.2 Tone phù hợp profile cá nhân (💡 SUGGEST)
- Nếu nội dung có vẻ quảng cáo sản phẩm/dịch vụ rõ ràng → "Nội dung quảng cáo trên profile cá nhân thường reach thấp và có thể bị giảm hiển thị. Cân nhắc dùng Fanpage thay thế."
- Nếu nội dung hoàn toàn không có yếu tố cá nhân/câu chuyện → "Nội dung profile cá nhân hiệu quả hơn khi có yếu tố câu chuyện cá nhân — thêm góc nhìn/trải nghiệm của bạn."

### 4.3 Engagement tự nhiên — nới lỏng cho profile (điều chỉnh so với Page)
- "Tag bạn bè" được phép nếu context tự nhiên (VD: "cc @[tên] bạn thích điều này không?") — KHÔNG phải engagement bait
- "Bình luận suy nghĩ của bạn bên dưới" KHÔNG phải engagement bait với profile cá nhân
- Chỉ WARN nếu rõ ràng là bait: "Like nếu đồng ý", "Share nếu yêu gia đình"

### 4.4 Tần suất và spam (⚠️ WARN)
- Profile cá nhân không nên đăng quá 3 bài/ngày (dễ bị mute bởi bạn bè)
- Nếu sheet có nhiều bài trong cùng 1 ngày → WARN: "Có [N] bài cùng ngày — profile cá nhân đăng nhiều dễ bị bạn bè ẩn. Nên giãn ra."

---

## NHÓM 5 — RIÊNG CHO GROUP (chỉ áp dụng khi `target_type = group`)

### 5.1 Phù hợp chủ đề group (💡 SUGGEST)
- Nếu không biết chủ đề group → nhắc: "Kiểm tra nội dung có phù hợp chủ đề group không trước khi đăng để tránh bị xóa bài."

### 5.2 Spam group (⚠️ WARN)
- Không đăng cùng 1 nội dung lên nhiều group trong cùng ngày (Facebook phát hiện cross-group spam)
- Không đăng link quảng cáo vào group không cho phép quảng cáo

---

## Output Format

Sau khi phân tích xong, in báo cáo theo format sau:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KIỂM TRA NỘI DUNG FACEBOOK
  Loại: [Fanpage / Profile cá nhân / Group]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[🚫 BLOCK]  (nếu có vi phạm policy)
  • [mô tả vi phạm cụ thể + lý do]
  ➜ Hành động: Phải sửa trước khi đăng.

[⚠️  CẢNH BÁO]  (nếu có vấn đề thuật toán)
  • [vấn đề] — [giải thích ngắn]
  ➜ Gợi ý sửa: [cách sửa cụ thể]

[💡 GỢI Ý]
  • [gợi ý tối ưu]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KẾT QUẢ: [BLOCK ❌ / CẦN XEM XÉT ⚠️ / SẴN SÀNG ✅]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Sau báo cáo:**
- Nếu **BLOCK** → dừng, không hỏi đăng tiếp. Yêu cầu sửa nội dung.
- Nếu **WARN** → hỏi: "Bài có [N] cảnh báo. Tiếp tục đăng hay muốn sửa trước?"
- Nếu chỉ **SUGGEST** hoặc sạch → tiếp tục đăng bình thường.
