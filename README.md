# Claude Workspace — PQR

Bộ config Claude Code (agents, skills, settings) cho hệ sinh thái PQR:
- **Fanpage tự động** (viết content + design ảnh + lên lịch Facebook)
- **PQR AI Assistant** (RAG webapp với pgvector + Haiku 4.5)

## Cấu trúc

```
.claude/
├── agents/                    # Agent definitions
├── skills/                    # Skill modules (mỗi skill 1 thư mục)
│   ├── auto-fanpage/          # Đăng/lên lịch Facebook đa target
│   ├── auto-fanpage-checklist # Kiểm tra chính sách FB
│   ├── design-template-*      # Template + render ảnh post
│   ├── doc-ingestion-pqr      # Sửa luồng đồng bộ tài liệu RAG
│   ├── fanpage-content-writer # Viết content theo tone voice
│   ├── pqr-brand-designer     # Visual cho fanpage PQR
│   ├── rag-eval               # Audit chất lượng RAG
│   └── ...
└── settings.local.json.example  # Mẫu permissions (copy → settings.local.json)
```

## Setup

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
# Điền FACEBOOK_APP_ID + FACEBOOK_APP_SECRET thật
cd .claude/skills/skill-fanpage-facebook && npm install
cd ../design-template-renderer && npm install
```

## Lưu ý bảo mật

- `settings.local.json` chứa secret thật (Facebook App Secret) → đã gitignore
- `node_modules/` đã gitignore (cài lại bằng `npm install`)
- File chat export trong `/exports` của workspace (không phải trong .claude)
