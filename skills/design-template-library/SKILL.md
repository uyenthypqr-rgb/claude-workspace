---
name: design-template-library
description: Thư viện HTML+CSS templates cho fanpage PQR — mỗi post type 1 template tối ưu (kien-thuc, tuyen-dung-sale, minigame, van-hoa-story). Mỗi template có schema content JSON rõ ràng để fanpage-design-agent biết slots cần fill.
---

# Skill: Design Template Library

Bộ template HTML/CSS cho fanpage PQR. Mỗi template = 1 file HTML + sample JSON. Render qua `design-template-renderer`.

## Templates available

| File | Post type | Size | Khi dùng |
|---|---|---|---|
| `kien-thuc-numbered.html` | `kien-thuc` | 1080×1350 | Bài training mindset/kiến thức với big number anchor + 3-4 cards |
| `tuyen-dung-poster.html` (TODO Phase 2) | `tuyen-dung-sale` | 1080×1350 | Bài tuyển sale với benefits + photo + QR |
| `minigame-square.html` (TODO Phase 2) | `minigame` | 1080×1080 | Minigame với photo + game element |
| `van-hoa-story.html` (TODO Phase 2) | `van-hoa-noi-bo` | 1080×1350 | Story telling với photo + quote |

## Schema chuẩn

Mỗi template define content schema. Xem `samples/<template>-sample.json` để có ví dụ.

### kien-thuc-numbered

```json
{
  "header": "📌 PQR SALES MINDSET",          // top-right header (small)
  "series_label": "TRAINING SERIES",          // dưới header
  "series_number": "#02",                     // gold
  "title_line1": "TƯ DUY SALE",               // title row 1
  "title_line2": "THỰC CHIẾN",                // title row 2
  "subtitle": "Khi lý thuyết dừng lại, nghề mới bắt đầu.",
  "big_number": "4",                          // focal anchor
  "big_number_label": "TƯ DUY THỰC CHIẾN",
  "cards": [                                  // 3-4 cards (auto layout horizontal hoặc grid)
    {
      "number": "01",
      "title": "ĐỪNG TRẢ LỜI BẰNG CON SỐ",
      "body": "Hỏi ngược giúp khách tự định nghĩa giá trị trước."
    }
  ],
  "cta": "INBOX → CHƯƠNG TRÌNH ĐÀO TẠO",
  "footer_tagline": "Nơi mindset tạo nên bản lĩnh sale BĐS cao cấp."
}
```

## Cách thêm template mới

1. Copy 1 file existing trong `templates/` làm base
2. Sửa CSS + slots theo design intent
3. Tạo `samples/<name>-sample.json` với content mẫu
4. Test render: `node ../design-template-renderer/render.js --template templates/<name>.html --content samples/<name>-sample.json --out /tmp/test.png`
5. Update bảng "Templates available" ở SKILL.md
6. Update `pqr-brand-designer` "Template Library Map" để agent biết match post_type → template file

## Convention

- Tất cả file HTML self-contained (CSS inline `<style>`)
- Reference assets qua `{{ASSETS}}` placeholder → renderer thay = `file://path/.../pqr-brand-designer/assets/`
- Font: `@font-face` từ `{{ASSETS}}fonts/`
- Color: hardcode HEX từ `pqr-brand-designer/assets/brand-tokens.json`
- Tỉ lệ: 4:5 portrait (1080×1350) hoặc 1:1 square (1080×1080) tùy template
- Vietnamese: `<html lang="vi">` + UTF-8 meta
- Cards loop: dùng `{{#cards}}...{{/cards}}` (Mustache-lite syntax của render.js)
