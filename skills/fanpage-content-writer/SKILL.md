---
name: fanpage-content-writer
description: Viết content Facebook theo chủ đề và tone voice riêng từng page. Mỗi page có file config riêng (tone, hashtag, CTA, checklist nội dung cấm). Hỗ trợ nhiều page — page tuyển dụng PQR Corp, các page khác sau này. Output bao gồm hook đầu, body, CTA, hashtag, gợi ý visual.
---

# Skill: Fanpage Content Writer

Sinh content Facebook chất lượng cao theo tone voice riêng của từng page.

---

## Cách dùng

```
/fanpage-content-writer
```

Hoặc gọi từ agent với input:
```yaml
page_slug: "tuyen-dung-pqr"     # bắt buộc — match file trong page-configs/
topic: "tuyển Frontend Dev"      # bắt buộc — chủ đề bài viết
post_type: "tuyen-dung"          # tuỳ chọn — override default
length: "medium"                 # short (~80 từ) | medium (~150 từ) | long (~250 từ)
cta_type: "apply_link"           # apply_link | inbox | comment | share
extra_context: "..."             # info bổ sung (vd: deadline, link JD)
```

---

## Bước 1 — Load page config

Đọc `page-configs/[page_slug].json`. Nếu không tồn tại:
- Liệt kê các page có sẵn
- Hỏi user: "Page này chưa được setup. Tạo config mới không?" → nếu có, chạy quy trình onboarding page mới (xem cuối file).

**Cấu trúc page config:**
```json
{
  "page_slug": "tuyen-dung-pqr",
  "page_id": "499740783831824",
  "page_name": "Tuyển dụng PQR Corp",
  "description": "Trang tuyển dụng chính thức của PQR Corp",
  "target_audience": "Sinh viên năm cuối, fresher, junior dev/designer/marketing 22-28 tuổi",
  "tone_voice": {
    "personality": ["trẻ trung", "chuyên nghiệp", "gần gũi", "có chút humor nhẹ"],
    "do": [
      "Dùng từ ngữ đời thường, tránh kiểu PR khoa trương",
      "Đi thẳng vào lợi ích thực tế (lương, learning, môi trường)",
      "Câu mở giật mood, gây tò mò",
      "Dùng 'mình/team mình/tụi mình' thay vì 'PQR Corp chúng tôi'",
      "Emoji vừa phải, 2-4 cái/bài"
    ],
    "dont": [
      "Không sáo rỗng kiểu 'gia đình PQR luôn chào đón...'",
      "Không dùng từ ngữ HR khoa trương: 'năng động', 'sáng tạo', 'đam mê'",
      "Không clickbait kiểu 'Bạn sẽ KHÔNG TIN được...'",
      "Không meme khiếm nhã, không câu like dạng 'comment để biết chi tiết'",
      "Không hứa lương cao vô căn cứ"
    ]
  },
  "default_hashtags": [
    "#PQRCorp",
    "#TuyenDungPQR",
    "#VieclamHCM"
  ],
  "topic_hashtags": {
    "frontend": ["#FrontendDeveloper", "#ReactJS", "#TuyenFrontend"],
    "backend": ["#BackendDeveloper", "#NodeJS", "#Python", "#TuyenBackend"],
    "design": ["#UIUXDesigner", "#TuyenDesigner"],
    "marketing": ["#MarketingJobs", "#TuyenMarketing"]
  },
  "default_cta": {
    "apply_link": "👉 Apply ngay tại: [LINK]",
    "inbox": "💬 Inbox page để được tư vấn chi tiết",
    "comment": "👇 Có hứng thú comment 'em' để team mình liên hệ nhé",
    "share": "🔁 Share giúp bạn bè đang tìm việc nhé!"
  },
  "post_types": {
    "tuyen-dung": {
      "structure": ["hook", "job_title", "key_responsibilities", "benefits", "requirements_short", "cta", "hashtags"],
      "max_hashtags": 5
    },
    "employer-branding": {
      "structure": ["hook", "story", "values_demo", "cta_soft", "hashtags"],
      "max_hashtags": 3
    },
    "culture": {
      "structure": ["hook", "moment_description", "team_reaction", "values_implied", "hashtags"],
      "max_hashtags": 3
    },
    "event-recap": {
      "structure": ["hook", "event_summary", "highlight_moments", "thanks", "next_event_teaser", "hashtags"],
      "max_hashtags": 4
    }
  },
  "forbidden_topics": [
    "So sánh trực tiếp với công ty đối thủ",
    "Lương cụ thể trong post công khai (chỉ ghi range)",
    "Drama nhân viên cũ",
    "Chính trị, tôn giáo"
  ],
  "best_post_times_vn": {
    "weekday": ["07:30-08:30", "12:00-13:00", "19:00-21:00"],
    "weekend": ["09:00-11:00", "20:00-22:00"]
  }
}
```

---

## Bước 2 — Sinh content

Áp dụng `tone_voice` + `post_types[post_type].structure`:

### 2.1 Hook (1-2 dòng đầu)
- Mục đích: giữ người đọc lại trong 3 giây đầu (Facebook cắt sau ~480 ký tự)
- Patterns tốt:
  - Câu hỏi tò mò: "Đi làm 1 năm, bạn muốn nhớ gì nhất?"
  - Số liệu giật mood: "30 ứng viên — 3 vòng phỏng vấn — 1 chỗ trống"
  - Khung cảnh: "Sáng thứ 2, team Frontend đang debug bug nửa đêm còn lại..."
  - Lợi ích thẳng: "Lương trên thị trường + WFH 2 ngày/tuần + sếp không micromanage"
- Tránh:
  - "Xin chào các bạn, hôm nay PQR..."
  - "🔥🔥🔥 HOT HOT HOT 🔥🔥🔥"
  - "Bạn có biết...?"

### 2.2 Body
- Chia 2-3 đoạn ngắn (mỗi đoạn 2-3 dòng)
- Mỗi đoạn 1 ý — không nhồi
- Dùng bullet `•` hoặc số `1.` khi liệt kê (>= 3 ý)
- Emoji ở đầu bullet để break vision

### 2.3 CTA
- Lấy từ `default_cta[cta_type]` của page config
- Thay `[LINK]` nếu có
- Đặt ở dòng riêng, có khoảng cách với body

### 2.4 Hashtags
- Lấy `default_hashtags` + `topic_hashtags[topic_key]` nếu match
- Giới hạn theo `post_types[post_type].max_hashtags`
- Đặt cuối bài, cùng 1 dòng hoặc 2 dòng

---

## Bước 3 — Kiểm tra nội dung cấm

Với mỗi item trong `forbidden_topics`:
- Quét content xem có vi phạm không
- Nếu có → từ chối, giải thích, đề xuất viết lại

---

## Bước 4 — Đề xuất visual

Dựa trên `post_type`:

| Post type | Visual gợi ý |
|---|---|
| tuyen-dung | Banner JD tự thiết kế (Canva), kích thước 1080×1350 (4:5 portrait) |
| employer-branding | Ảnh thật team chụp tại văn phòng (tránh stock photo) |
| culture | Ảnh khoảnh khắc thật (team building, sinh nhật, lunch) |
| event-recap | Carousel 5-10 ảnh từ event |

Nhắc: **Text overlay trên ảnh phải < 20% diện tích** (rule Facebook để không bị giảm reach).

---

## Bước 5 — Đề xuất thời gian đăng

Dựa trên `best_post_times_vn`:
- Nếu đang weekday → đề xuất khung gần nhất
- Nếu đang weekend → đề xuất theo weekend slots

Hỏi user: "Đăng ngay, lên lịch [time gợi ý], hay chọn giờ khác?"

---

## Output format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CONTENT BÀI ĐĂNG — [page_name]
  Topic: [topic]  |  Type: [post_type]  |  Length: [length]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Nội dung đầy đủ từ hook → body → CTA → hashtags]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GỢI Ý VISUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Loại: [banner/photo/carousel]
• Spec: [kích thước, format]
• Concept: [mô tả gợi ý cho designer]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  THỜI GIAN ĐĂNG ĐỀ XUẤT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [Slot 1 gần nhất, vd: hôm nay 19:30]
• [Slot 2, vd: ngày mai 08:00]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KIỂM TRA CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Không vi phạm forbidden_topics
✅ Hashtag số lượng phù hợp ([N]/[max])
✅ Độ dài content trong target
[⚠️] [Cảnh báo nếu có]
```

Sau khi hiển thị, hỏi user:
> "Đồng ý với content? (đăng ngay / lên lịch / sửa / viết lại hoàn toàn)"

---

## Onboarding page mới

Khi user yêu cầu thêm page mới, hỏi theo thứ tự:

1. **Tên page + Page ID** (lấy từ URL hoặc /me/accounts)
2. **Mô tả ngắn** về page (mục đích, ai theo dõi)
3. **Target audience** chi tiết (tuổi, vùng, sở thích, vai trò)
4. **Tone voice:**
   - 3-5 tính từ mô tả tính cách (vd: "hài hước", "chuyên nghiệp", "ấm áp")
   - 3-5 dòng "DO" (cách viết nên có)
   - 3-5 dòng "DON'T" (cách viết tránh)
5. **Hashtag mặc định** (3-5 cái dùng cho mọi bài)
6. **Hashtag theo chủ đề** (mapping topic → hashtags)
7. **CTA mặc định** (4 dạng: link, inbox, comment, share)
8. **Post types** muốn hỗ trợ (xem ví dụ ở tuyen-dung-pqr)
9. **Forbidden topics** (chính sách nội dung của page)
10. **Best post times** (test bằng Page Insights → khung giờ audience online)

Tổng hợp thành JSON, lưu `page-configs/[slug].json`. Test bằng 1 bài draft, hiển thị cho user duyệt trước khi đăng thật.

---

## Page configs hiện có

Xem file `page-configs/tuyen-dung-pqr.json` để tham khảo cấu trúc đầy đủ.
