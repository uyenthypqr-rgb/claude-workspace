---
name: pqr-brand-designer
description: Thiết kế visual cho fanpage PQR (đại lý phân phối BĐS cao cấp). Đọc brand guideline đã trích từ Drive (màu Gold #B99A44 + Gray #555555, font Montserrat, logo Sun-Sea-Wave), sinh ra ảnh post Facebook 4:5 hoặc 1:1 theo brief content. Ưu tiên Canva MCP để gen ảnh thật, fallback HTML/SVG mockup. Mặc định nền sáng dễ đọc, tránh template stock.
---

# Skill: PQR Brand Designer

Khi nhận brief content (hook, body, signature series, hashtags), sinh ra visual đúng brand PQR.

## 🎨 Brand Identity (đã trích từ brand-guidelines-PQR-View.pdf)

### Bảng màu

| Tên | HEX | RGB | Vai trò |
|---|---|---|---|
| **Gold (chủ đạo)** | `#B99A44` | 185, 154, 68 | Logo, accent, header |
| **Gray (chữ)** | `#555555` | 85, 85, 85 | Body text, subhead |
| **Gold sáng** | `#DDC96C` | 221, 201, 108 | Highlight, gradient stop |
| **Gold đậm** | `#966C26` | 150, 108, 38 | Gradient stop, shadow |
| **Đen** | `#333333` | 51, 51, 51 | Title đậm, contrast cao |
| **Trắng kem (NỀN MẶC ĐỊNH)** | `#FAFAF7` | 250, 250, 247 | Nền sáng cho post |
| **Trắng pure** | `#FFFFFF` | 255, 255, 255 | Nền card, alternative |

**Gradient gold (logo signature):** `linear-gradient(135deg, #DDC96C 0%, #BA9B44 50%, #966C26 100%)`

### Typography

| Cấp | Font | Weight | Use case |
|---|---|---|---|
| Display title | Montserrat | Bold (700) | Headline lớn, tiêu đề bài |
| Subhead | Montserrat | SemiBold (600) | Sub title, accent text |
| Body | Montserrat | Medium (500) | Đoạn văn dài, mô tả |
| Caption | Montserrat | Regular (400) | Footer, tagline nhỏ |
| Display elegant (optional) | DFVN Menata Regular hoặc Playfair Display (web fallback) | - | Tiêu đề kiểu serif sang trọng cho bài kien-thuc |
| Script (optional) | SVN-Darleston hoặc Great Vines (web fallback) | - | Tagline trang trọng, ít dùng |

**Web font fallback (khi không có DFVN/SVN):**
- DFVN Menata → Playfair Display (Google Fonts) hoặc Cormorant Garamond
- SVN-Darleston → Great Vibes hoặc Allura

### Logo

File: `assets/logo-pqr-color.png` (1500×819 RGBA, trans BG)

Phiên bản trên Drive (chưa download nhưng biết tên):
- `Logo-PQR-Final-2.png` — color chính (đã download → assets/logo-pqr-color.png)
- `Logo-PQR-Final-1.png` — alt color
- `Logo-PQR-Gray.png` — đơn sắc xám
- `Logo-PQR-white-1.png`, `Logo-PQR-white-2.png` — trắng (cho nền tối)
- `Logo-In-Trang-den.png` — đen (cho in văn bản)

**Sai logo (BLOCK):**
- Bóp méo, xiên, nghiêng
- Nhợt nhạt
- Sai màu / sai gradient
- Logo bị đè text (text overlay phải clear khỏi logo)

### Brand voice trong design

- **Sun + Sea Wave** — concept gốc của logo. Thiết kế có thể gợi: ánh sáng mặt trời, sóng biển, chuyển động mềm mại.
- **Cao cấp, không khoa trương** — nhiều khoảng trắng (whitespace), không lấp đầy mọi góc.
- **Sản phẩm chính:** Biệt thự biển, biệt thự nghỉ dưỡng, shophouse, condotel, khách sạn Phú Quốc.

---

## 🚦 Quy tắc design tổng quát (theo feedback user)

1. **NỀN SÁNG — không nền tối**. Mặc định `#FAFAF7` (trắng kem warm). Nền tối chỉ dùng khi user đặc biệt yêu cầu.
2. **Dễ đọc — contrast WCAG AA tối thiểu** (gray #333 trên kem #FAFAF7 → đạt). Không gold trên trắng (gold quá nhạt → fail accessibility).
3. **Thu hút — có 1 visual anchor mạnh** (con số lớn / icon / hình minh hoạ vector / typography lớn).
4. **Không stock photo** — ưu tiên ảnh thật + minh hoạ vector + typography.
5. **Logo bottom-right hoặc bottom-center**, kích thước ≤ 12% chiều ngang ảnh.
6. **Whitespace tối thiểu 15% mỗi cạnh** — không nhồi text sát viền.

---

## 📐 Templates theo post_type

### Template A — `kien-thuc` series (giáo dục + branding)

**Tỉ lệ:** 4:5 (1080×1350) — feed-friendly portrait

```
┌──────────────────────────────────┐  ← #FAFAF7 nền kem
│  [12% top whitespace]            │
│  PQR SALES MINDSET               │  ← Montserrat SemiBold #B99A44 14pt uppercase, letter-spacing wide
│  TRAINING SERIES  #02            │  ← Montserrat Bold + số lớn 48pt #333333
│                                  │
│  ━━━━━━━━━━━━━━━━━━              │  ← divider gold #B99A44 80×3
│                                  │
│  ┌────────────────────────┐      │  ← khối tiêu đề chính
│  │ TƯ DUY                 │      │  ← Playfair Display Bold 64pt #333333
│  │ SALE                   │      │
│  │ THỰC CHIẾN             │      │
│  └────────────────────────┘      │
│                                  │
│  Khi lý thuyết dừng lại,         │  ← Montserrat Italic 22pt #555555
│  nghề mới bắt đầu.               │
│                                  │
│  ┌─────┬─────┬─────┬─────┐       │  ← 4 ô equal-width, viền gold mỏng 1pt
│  │  ① │  ② │  ③ │  ④ │       │  ← số gold lớn 28pt
│  │Đừng │Đọc  │Bán  │Phản │       │
│  │trả  │im   │quyết│đối =│       │
│  │số   │lặng │định │info │       │
│  └─────┴─────┴─────┴─────┘       │
│                                  │
│  [whitespace]                    │
│  [LOGO PQR center, 80px wide]    │  ← logo color, không tagline
└──────────────────────────────────┘
```

### Template B — `tuyen-dung-sale` (bài tuyển)

**Tỉ lệ:** 4:5

- Header: `ĐANG TUYỂN | [Vị trí]` — Montserrat Bold 32pt #333
- Big number: range hoa hồng % gold #B99A44 64pt
- Bullet 3 benefits với icon
- Footer: thị trường (HCM/HN/ĐN/...) + apply CTA
- Logo bottom

### Template C — `van-hoa-noi-bo` / `success-story` (kể chuyện)

**Tỉ lệ:** 4:5 hoặc 1:1

- Ảnh thật chiếm 60-70% diện tích (top hoặc fullbleed với gradient mask)
- Caption text overlay phía dưới: `"Quote ngắn"` Playfair Italic
- Attribution: tên + role (Montserrat Medium nhỏ)
- Logo bottom-right

### Template D — `minigame`

**Tỉ lệ:** 1:1 (1080×1080)

- Big PRIZE typography ở giữa
- Background subtle pattern (sóng biển vector)
- Luật chơi 3 bước icon + text ngắn
- Hashtag minigame ở dưới

---

## 🛠️ Cách sinh visual

### Option 1 — Canva MCP (PREFERRED)

Khi có Canva MCP available:

```
1. mcp__claude_ai_Canva__upload-asset-from-url 
   → upload logo từ Drive (hoặc dùng asset đã có)

2. mcp__claude_ai_Canva__generate-design-structured 
   → input: brief có structure rõ (title, sub, bullets, color palette)
   → output: design ID + thumbnail URL

3. mcp__claude_ai_Canva__perform-editing-operations 
   → tinh chỉnh: đổi font, sửa màu, di chuyển logo

4. mcp__claude_ai_Canva__export-design 
   → export PNG 1080×1350 cho Facebook
```

### Option 2 — HTML/SVG mockup (fallback)

Khi Canva MCP không sẵn, sinh file HTML hoặc SVG mockup tại `mockups/[post-id].html`.

User có thể:
- Mở trong browser → screenshot
- Convert SVG → PNG bằng `rsvg-convert` hoặc Inkscape
- Hoặc dùng làm reference cho designer chỉnh trong Figma/Canva

### Option 3 — Detailed brief cho human designer (last resort)

Output file `briefs/[post-id]-brief.md` với:
- Spec kỹ thuật chi tiết (kích thước, màu HEX, font + weight + size, vị trí từng element)
- Wireframe ASCII
- Mock content text đầy đủ
- Logo file path
- Reference style nếu có

---

## ✅ Checklist trước khi giao design

- [ ] Tỉ lệ đúng (4:5 cho feed, 1:1 cho minigame, 9:16 cho story/reel)
- [ ] Nền sáng, contrast text đạt WCAG AA
- [ ] Logo có, đúng vị trí, không bị bóp méo, ≥ 80px wide
- [ ] Text overlay < 25% diện tích (FB recommend < 20% cho ad, post thường nới)
- [ ] Không sai chính tả tên brand "PQR" (không phải "PQR Corp" trong design — config riêng)
- [ ] Tagline nếu có: "Your Prosperity - Our Success" đúng chính tả
- [ ] Không vi phạm brand DON'T (xem brand-guidelines)
- [ ] Có nguồn ảnh thật (nếu dùng) — không stock generic

---

## 📂 Cấu trúc thư mục skill

```
pqr-brand-designer/
├── SKILL.md                       (file này)
├── brand-guideline.md             (extracted từ PDF — chi tiết hơn nếu cần)
├── assets/
│   └── logo-pqr-color.png         (logo chính, gold + gray, RGBA)
├── templates/                     (HTML/SVG templates per post_type — sẽ tạo dần khi cần)
├── mockups/                       (output mockups khi dùng option 2)
└── briefs/                        (output briefs khi dùng option 3)
```

---

## ⚠️ Quan trọng

- **Luôn confirm với user trước khi finalize** — design là việc subjective, cho preview trước rồi user quyết
- **Không tự ý đổi brand color** — chỉ dùng palette trên, không pha thêm màu mới (vd: thêm xanh, đỏ) trừ khi có lý do business
- **Mỗi series cần consistent template** — bài #2 trong series phải match style bài #1, #3
- **Lưu Figma master** (nếu có) cho mỗi series — reuse cho bài tiếp theo, chỉ đổi số/title
