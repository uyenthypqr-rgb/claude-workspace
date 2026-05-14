---
name: design-template-renderer
description: Render HTML+CSS template thành PNG ảnh post Facebook bằng Chrome headless (Puppeteer). Đảm bảo tiếng Việt đúng diacritics, brand match exact, deterministic. Input là template HTML + content JSON, output là file PNG đúng kích thước.
---

# Skill: Design Template Renderer

Engine render PNG cho fanpage PQR. Dùng Chrome headless để load HTML template, inject content (data placeholders), screenshot ra PNG.

## Khi dùng

- Khi `fanpage-design-agent` cần biến content brief thành ảnh thật (1080×1350 hoặc 1080×1080)
- Khi cần re-render lại 1 design với content mới (cùng template)
- Khi debug: render preview để kiểm tra layout

## Architecture

```
content.json + template.html → render.js (Puppeteer) → output.png
                                    ↓
                            Headless Chrome
                            (system Chrome via puppeteer-core)
                                    ↓
                            page.screenshot()
                                    ↓
                            PNG 1080×1350
```

## Cách dùng

```bash
cd /Users/jackiviet/Desktop/CLAUDE\ CODE\ WORK\ SPACE/.claude/skills/design-template-renderer

node render.js \
  --template ../design-template-library/templates/kien-thuc-numbered.html \
  --content samples/sample-kien-thuc.json \
  --out /tmp/output.png \
  --width 1080 \
  --height 1350
```

Args:
- `--template` : path tới HTML template (required)
- `--content` : path tới JSON file chứa content data (required)
- `--out` : path output PNG (required)
- `--width` : width px (default 1080)
- `--height` : height px (default 1350)
- `--scale` : device scale (default 2 — retina quality)

## Setup 1 lần

```bash
cd /Users/jackiviet/Desktop/CLAUDE\ CODE\ WORK\ SPACE/.claude/skills/design-template-renderer
npm install
```

Cài `puppeteer-core` (~5MB, không bundle Chromium). Renderer dùng system Chrome tại `/Applications/Google Chrome.app/`.

## Content JSON schema

Tùy template, mỗi template define schema riêng. Generic structure:

```json
{
  "header": "📌 PQR SALES MINDSET",
  "series_label": "TRAINING SERIES",
  "series_number": "#02",
  "title": "TƯ DUY SALE\nTHỰC CHIẾN",
  "subtitle": "Khi lý thuyết dừng lại, nghề mới bắt đầu.",
  "big_number": "4",
  "big_number_label": "TƯ DUY THỰC CHIẾN",
  "cards": [
    {
      "number": "01",
      "title": "ĐỪNG TRẢ LỜI BẰNG CON SỐ",
      "body": "Hỏi ngược giúp khách tự định nghĩa giá trị trước."
    }
  ],
  "cta": "INBOX → CHƯƠNG TRÌNH ĐÀO TẠO",
  "hashtags": "#PQRSalesMindset #KienThucBDS"
}
```

Template HTML dùng Mustache-style `{{ field }}` placeholders. Renderer thay placeholder trước khi load Chrome.

## Cách render.js hoạt động

1. Parse args (template path, content path, output path, dimensions)
2. Read content JSON
3. Read template HTML
4. Replace `{{ field }}` placeholders với data từ JSON (handle arrays với `{{#cards}}...{{/cards}}` blocks)
5. Replace `{{ASSETS}}` với absolute path tới `pqr-brand-designer/assets/`
6. Launch headless Chrome via puppeteer-core, point tới system Chrome
7. Set viewport theo dimensions + deviceScaleFactor=2
8. `page.setContent(html, { waitUntil: 'networkidle0' })` — đợi fonts + images load xong
9. `page.screenshot({ path: out, omitBackground: false, fullPage: false })`
10. Print: render time + output size

## Troubleshooting

| Vấn đề | Cách fix |
|---|---|
| Tiếng Việt hiển thị ô vuông | Font không có Vietnamese subset → re-download font với subset=vietnamese hoặc dùng @import từ Google Fonts CDN trong template |
| PNG bị crop | viewport không khớp template — check width/height args |
| Font không load | path @font-face sai — dùng absolute file:/// path |
| Render timeout | tăng timeout trong waitUntil hoặc giảm complexity HTML |
| Chrome không tìm thấy | puppeteer-core cần executable path — set CHROME_PATH env hoặc auto-detect |

## Tích hợp với agent

Agent `fanpage-design-agent` gọi qua Bash:
```bash
node /Users/jackiviet/.../design-template-renderer/render.js \
  --template ... --content ... --out ...
```
Parse stdout để lấy thành công/thất bại + output path.
