---
name: doc-ingestion-pqr
description: Chẩn đoán và sửa luồng đồng bộ tài liệu admin upload cho pqr-ai-assistant. Kiểm tra documents/document_chunks trong PostgreSQL, reprocess tài liệu fail, thêm cột status tracking, ngăn ngừa fail âm thầm trong BackgroundTasks. Dùng khi admin báo "upload xong nhưng AI không trả lời được" hoặc khi cần audit toàn bộ tri thức.
---

# Skill: Document Ingestion (PQR AI Assistant)

Chẩn đoán và sửa luồng đồng bộ tài liệu cho `pqr-ai-assistant`. Mục tiêu: đảm bảo mọi tài liệu admin upload đều đến được chat box.

---

## Vấn đề gốc rễ đã xác định

Đọc file `backend/app/routers/documents.py` và `backend/app/services/document_service.py`:

1. **`upload_document`** dùng `BackgroundTasks` → trả về 200 cho admin ngay lập tức, dù background task có thể fail sau đó
2. **`process_document`** chỉ `print` lỗi, không lưu trạng thái → admin không biết fail
3. **Model `Document`** không có cột `status` hay `error_message`
4. **Frontend list** không filter `chunk_count > 0` → tài liệu fail vẫn hiển thị bình thường
5. **Không có endpoint reprocess** → admin phải xóa và upload lại

---

## Quy trình chẩn đoán (khi admin báo lỗi)

### Bước 1 — Xác định doc nghi vấn

Hỏi admin:
- Tên tài liệu (title)
- Ngày upload gần đúng
- Câu hỏi mẫu mà chat box trả lời "không tìm thấy"

### Bước 2 — Kiểm tra database

Chạy SQL qua psql (hoặc DBeaver/pgAdmin):

```sql
-- Kiểm tra document có trong bảng không
SELECT id, title, filename, file_type, chunk_count, is_active, created_at
FROM documents
WHERE title ILIKE '%[tên_doc]%'
ORDER BY created_at DESC;

-- Kiểm tra chunks tương ứng
SELECT COUNT(*) AS chunk_count,
       AVG(token_count) AS avg_tokens,
       MIN(LENGTH(content)) AS min_content_len,
       MAX(LENGTH(content)) AS max_content_len
FROM document_chunks
WHERE document_id = '[doc_uuid]';

-- Kiểm tra embedding có hợp lệ không (không zero vector)
SELECT chunk_index,
       LENGTH(content) AS content_len,
       embedding[1] AS first_dim,
       embedding[100] AS dim_100
FROM document_chunks
WHERE document_id = '[doc_uuid]'
LIMIT 5;
```

**Chẩn đoán kết quả:**

| Tình trạng | Nguyên nhân | Hành động |
|---|---|---|
| Doc tồn tại, `chunk_count > 0`, chunks có embedding hợp lệ | RAG search ngưỡng quá cao | Hạ `min_score` trong `rag_service.py` từ 0.30 → 0.25 |
| Doc tồn tại, `chunk_count = 0` | Background task fail | Reprocess (Bước 3) |
| Doc tồn tại, `chunk_count > 0` nhưng `documents.chunk_count = 0` | Commit thiếu sót | Update lại `chunk_count` |
| Doc không tồn tại | Upload chưa xong / DB rollback | Kiểm tra log uvicorn |
| `is_active = FALSE` | Admin đã xóa | Hỏi admin có muốn restore không |

### Bước 3 — Reprocess tài liệu fail

Tạo script tạm `backend/scripts/reprocess_doc.py`:

```python
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.document import Document
from app.services.document_service import process_document
import uuid

doc_id = uuid.UUID(sys.argv[1])
file_path = sys.argv[2]  # path đến file gốc nếu vẫn còn

db = SessionLocal()
doc = db.query(Document).filter(Document.id == doc_id).first()
if not doc:
    print(f"Doc {doc_id} không tồn tại")
    sys.exit(1)

# Xóa chunks cũ nếu có
from app.models.chunk import DocumentChunk
db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()
db.commit()
db.close()

# Reprocess
process_document(doc_id, file_path)
```

Chạy:
```bash
cd backend
source venv/bin/activate
python scripts/reprocess_doc.py <doc_uuid> <file_path>
```

### Bước 4 — Test retrieval ngay sau reprocess

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "[câu_hỏi_mẫu]"}'
```

Verify response có `sources` không rỗng, `document_title` đúng tài liệu vừa reprocess.

---

## Sửa lâu dài — Patch cho luồng upload

Để ngăn vấn đề tái diễn, áp dụng các thay đổi sau cho codebase:

### Patch 1 — Thêm cột `status` vào model

File `backend/app/models/document.py`:

```python
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text

class Document(Base):
    __tablename__ = "documents"
    # ... existing columns ...
    status = Column(String(20), nullable=False, default="pending")
    # values: pending | processing | done | failed
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
```

Tạo Alembic migration:
```bash
cd backend
alembic revision -m "add document status tracking"
# Sửa file migration vừa tạo, thêm:
# op.add_column('documents', sa.Column('status', sa.String(20), nullable=False, server_default='pending'))
# op.add_column('documents', sa.Column('error_message', sa.Text(), nullable=True))
# op.add_column('documents', sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True))
# UPDATE documents SET status = 'done' WHERE chunk_count > 0;
# UPDATE documents SET status = 'failed' WHERE chunk_count = 0;
alembic upgrade head
```

### Patch 2 — Cập nhật `process_document` để ghi trạng thái

File `backend/app/services/document_service.py`:

```python
from datetime import datetime

def process_document(doc_id, file_path):
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return

        doc.status = "processing"
        db.commit()

        text = parse_file(file_path, doc.file_type)
        if not text or len(text.strip()) < 10:
            raise ValueError("File rỗng hoặc parse không ra text")

        chunks = chunk_text(text, doc.title)
        if not chunks:
            raise ValueError("Chunking trả về 0 chunks")

        embeddings = embed_texts(chunks)
        if len(embeddings) != len(chunks):
            raise ValueError(f"Embedding count mismatch: {len(embeddings)} vs {len(chunks)}")

        chunk_objects = [
            DocumentChunk(
                document_id=doc_id,
                chunk_index=i,
                content=content,
                embedding=embedding,
                token_count=len(content.split()),
            )
            for i, (content, embedding) in enumerate(zip(chunks, embeddings))
        ]
        db.bulk_save_objects(chunk_objects)

        doc.chunk_count = len(chunk_objects)
        doc.status = "done"
        doc.processed_at = datetime.utcnow()
        doc.error_message = None
        db.commit()
    except Exception as e:
        db.rollback()
        # Re-fetch doc vì rollback đã invalidate
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            doc.error_message = str(e)[:1000]
            db.commit()
    finally:
        db.close()
        if os.path.exists(file_path):
            os.remove(file_path)
```

### Patch 3 — Endpoint reprocess

Thêm vào `backend/app/routers/documents.py`:

```python
@router.post("/{doc_id}/reprocess")
async def reprocess_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Endpoint này yêu cầu file gốc — nhưng hiện tại file đã bị xóa sau khi process
    # Giải pháp tốt hơn: lưu file vào storage thay vì xóa
    raise HTTPException(
        status_code=501,
        detail="Reprocess chưa khả dụng. Vui lòng xóa và upload lại tài liệu."
    )

@router.get("/{doc_id}/status")
def get_document_status(
    doc_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
    return {
        "id": str(doc.id),
        "title": doc.title,
        "status": doc.status,
        "chunk_count": doc.chunk_count,
        "error_message": doc.error_message,
        "processed_at": doc.processed_at,
    }
```

### Patch 4 — Lưu file gốc thay vì xóa

Sửa `upload_document` trong `routers/documents.py`:
- Thay `tempfile.NamedTemporaryFile(delete=False, ...)` bằng lưu file vào `backend/uploads/{doc_id}.{ext}`
- Bỏ `os.remove(file_path)` trong `process_document` (hoặc chỉ xóa khi reprocess thành công)
- Khi reprocess: dùng path đã lưu

### Patch 5 — Polling status ở frontend

Sau khi admin upload, frontend nên:
1. Gọi `POST /upload` → nhận `doc_id`
2. Poll `GET /{doc_id}/status` mỗi 2 giây trong 60 giây
3. Hiển thị badge: "Đang xử lý" → "Sẵn sàng ✅" hoặc "Lỗi ❌ [error_message]"

---

## Audit toàn bộ tri thức

Chạy SQL để tìm tất cả doc đang fail:

```sql
SELECT id, title, filename, chunk_count, status, error_message, created_at
FROM documents
WHERE is_active = TRUE
  AND (chunk_count = 0 OR status IN ('failed', 'processing'))
ORDER BY created_at DESC;
```

Với mỗi doc trong list → reprocess (nếu còn file) hoặc báo admin upload lại.

---

## Output cuối cùng

Sau khi xử lý, báo cáo cho admin theo format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BÁO CÁO ĐỒNG BỘ TÀI LIỆU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tài liệu       : [title]
Trạng thái cũ  : [status_cũ — VD: chunk_count = 0]
Hành động      : [Reprocess / Tune ngưỡng / ...]
Kết quả        : ✅ [N] chunks lưu thành công
Test query     : "[câu_hỏi_mẫu]"
  → AI trả lời : "[trích đầu câu]..."
  → Nguồn      : [N] sources, score cao nhất [X]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
