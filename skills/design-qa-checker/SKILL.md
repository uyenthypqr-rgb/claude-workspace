---
name: design-qa-checker
description: Verify PNG render output cho fanpage PQR — check kích thước, file size, brand color presence (gold #B99A44), render fail detection (whitespace overflow). Trả về PASS/WARN/FAIL với issue cụ thể. Dùng sau bước render trong fanpage-design-agent.
---

# Skill: Design QA Checker

Kiểm tra chất lượng PNG render trước khi giao cho user hoặc upload Drive/Facebook.

## Khi dùng

Sau khi `design-template-renderer` xuất PNG → gọi `qa-check.js` để verify.

## Cách dùng

```bash
node qa-check.js --file /tmp/output.png --expected-width 1080 --expected-height 1350
```

Args:
- `--file` : path tới PNG cần check (required)
- `--expected-width` : width mong đợi (default 1080)
- `--expected-height` : height mong đợi (default 1350)
- `--max-size-mb` : file size tối đa (default 8)

## Checks performed

| Check | Type | Description | Threshold |
|---|---|---|---|
| File exists | hard | File tồn tại + readable | required |
| PNG header | hard | Magic bytes đúng PNG | required |
| Dimensions | hard | Khớp expected (cho phép @2x scale) | exact |
| File size | warn | Không quá lớn (FB limit 8MB) | < 8MB |
| Min file size | warn | Không quá nhỏ (báo hiệu render trống) | > 30KB |
| Brand color presence | warn | Có pixel màu gold #B99A44 trong PNG | > 0.5% pixels |
| Whitespace ratio | warn | Pixel trắng pure không quá 60% (avoid blank-ish render) | < 60% |

## Output format

```
{
  "status": "pass|warn|fail",
  "checks": [
    { "name": "file_exists", "result": "pass" },
    { "name": "dimensions", "result": "pass", "actual": "2160x2700 (=1080x1350 @2x)" },
    { "name": "file_size", "result": "pass", "actual_kb": 1352, "limit_mb": 8 },
    { "name": "brand_color", "result": "pass", "gold_pixel_pct": 3.4 },
    { "name": "whitespace", "result": "pass", "white_pixel_pct": 12.1 }
  ],
  "issues": []
}
```

Exit code: 0 = pass/warn, 1 = fail.

## Implementation

`qa-check.js` dùng pure Node + PNG parser tự viết (no deps). Đọc PNG header → verify magic + dimensions; sample pixels (mỗi N pixel để nhanh) để count brand-color và whitespace.

## Tích hợp với agent

Agent gọi qua Bash:
```bash
node qa-check.js --file /tmp/render.png 2>&1 | tee /tmp/qa-result.json
```
Parse JSON output → quyết định: pass thì proceed (upload/post), warn thì log + proceed, fail thì abort + báo issue.
