---
name: rag-eval
description: Tạo bộ câu hỏi kiểm thử cho hệ thống RAG pqr-ai-assistant, đo độ chính xác truy xuất, phát hiện gap kiến thức. Dùng sau khi upload tài liệu mới, hoặc khi cần audit chất lượng AI assistant. Output là báo cáo có thể chia sẻ cho stakeholder.
---

# Skill: RAG Evaluation

Đo chất lượng truy xuất của `pqr-ai-assistant` và phát hiện chỗ thiếu kiến thức.

---

## Khi nào dùng

1. Sau khi admin upload bộ tài liệu mới (ví dụ: bộ sổ tay nhân viên 50 file)
2. Trước khi onboard nhân viên mới — đảm bảo AI trả lời được các câu hỏi phổ biến
3. Hàng tháng — audit chất lượng tri thức

---

## Quy trình

### Bước 1 — Thu thập câu hỏi kiểm thử

Hỏi user (hoặc admin):
> "Cho mình 10-20 câu hỏi mà nhân viên hay hỏi nhất (kèm câu trả lời mong đợi nếu có)."

Phân loại câu hỏi:
- **Câu hỏi sự kiện** (factual): "Quy định nghỉ phép thường niên là bao nhiêu ngày?"
- **Câu hỏi quy trình** (procedural): "Làm sao để xin nghỉ ốm?"
- **Câu hỏi tổng hợp** (synthesis): "So sánh chế độ bảo hiểm cho nhân viên chính thức và thử việc"
- **Câu hỏi out-of-scope**: "Lương CEO bao nhiêu?" (AI nên từ chối)

Tối thiểu 5 câu mỗi loại.

### Bước 2 — Lưu thành file test set

Lưu vào `backend/tests/rag_eval_set.json`:

```json
{
  "version": "2026-05-13",
  "test_cases": [
    {
      "id": "T001",
      "category": "factual",
      "question": "Quy định nghỉ phép thường niên của PQR Corp?",
      "expected_keywords": ["12 ngày", "thâm niên", "tích lũy"],
      "expected_source_title": "Sổ tay nhân viên 2026",
      "must_answer": true
    },
    {
      "id": "T002",
      "category": "procedural",
      "question": "Làm sao để xin nghỉ ốm?",
      "expected_keywords": ["form", "HR", "giấy khám"],
      "expected_source_title": "Quy trình nhân sự",
      "must_answer": true
    },
    {
      "id": "T003",
      "category": "out_of_scope",
      "question": "Lương CEO bao nhiêu?",
      "expected_keywords": [],
      "expected_source_title": null,
      "must_answer": false
    }
  ]
}
```

### Bước 3 — Script chạy test

Tạo `backend/scripts/rag_eval.py`:

```python
import json
import sys
import requests
from pathlib import Path

API_URL = "http://localhost:8000/api/chat"
TOKEN = sys.argv[1] if len(sys.argv) > 1 else None
TEST_FILE = Path("tests/rag_eval_set.json")

with open(TEST_FILE) as f:
    test_set = json.load(f)

results = {"total": 0, "passed": 0, "failed": 0, "cases": []}

for case in test_set["test_cases"]:
    results["total"] += 1
    response = requests.post(
        API_URL,
        json={"message": case["question"]},
        headers={"Authorization": f"Bearer {TOKEN}"} if TOKEN else {},
    ).json()

    answer = response.get("answer", "")
    sources = response.get("sources", [])

    # Đánh giá
    passed = True
    reasons = []

    if case["must_answer"]:
        if "không tìm thấy" in answer.lower() or len(sources) == 0:
            passed = False
            reasons.append("AI không trả lời được câu must-answer")
        else:
            # Check keywords
            for kw in case["expected_keywords"]:
                if kw.lower() not in answer.lower():
                    reasons.append(f"Thiếu keyword: {kw}")
            # Check source
            if case["expected_source_title"]:
                source_titles = [s["document_title"] for s in sources]
                if case["expected_source_title"] not in source_titles:
                    reasons.append(f"Source sai: mong đợi '{case['expected_source_title']}', nhận '{source_titles}'")
                    passed = False
    else:
        # out_of_scope: AI nên từ chối
        if "không tìm thấy" not in answer.lower() and len(sources) > 0:
            passed = False
            reasons.append("AI trả lời câu out-of-scope thay vì từ chối")

    if passed:
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["cases"].append({
        "id": case["id"],
        "question": case["question"],
        "passed": passed,
        "reasons": reasons,
        "answer_preview": answer[:200],
        "sources_returned": [s["document_title"] for s in sources],
        "top_score": max([s["relevance_score"] for s in sources]) if sources else 0,
    })

# In báo cáo
print(f"\n{'='*60}")
print(f"  RAG EVAL REPORT")
print(f"{'='*60}")
print(f"Total : {results['total']}")
print(f"Passed: {results['passed']} ({results['passed']*100//results['total']}%)")
print(f"Failed: {results['failed']}")
print(f"{'='*60}\n")

for c in results["cases"]:
    icon = "✅" if c["passed"] else "❌"
    print(f"{icon} [{c['id']}] {c['question']}")
    if not c["passed"]:
        for r in c["reasons"]:
            print(f"     • {r}")

# Lưu kết quả
with open(f"tests/rag_eval_result_{test_set['version']}.json", "w") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
```

Chạy:
```bash
cd backend
python scripts/rag_eval.py <admin_jwt_token>
```

### Bước 4 — Phân tích kết quả

| Tỉ lệ pass | Đánh giá | Hành động |
|---|---|---|
| ≥ 90% | Xuất sắc | Maintain, audit hàng tháng |
| 75-89% | Tốt | Xem cases fail, bổ sung tài liệu hoặc tune ngưỡng |
| 50-74% | Có vấn đề | Audit toàn bộ chunking strategy, thử overlap chunks |
| < 50% | Nghiêm trọng | Reprocess toàn bộ, đánh giá lại embedding model |

### Bước 5 — Phát hiện gap kiến thức

Với mỗi case fail vì "AI không tìm thấy":
1. Hỏi admin: "Câu hỏi này có nên có trong tài liệu không?"
2. Nếu **có** → tài liệu thiếu hoặc chunking cắt sai context → cần bổ sung hoặc reprocess
3. Nếu **không** → cập nhật system prompt để AI từ chối đẹp hơn

Tổng hợp gap thành báo cáo:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GAP ANALYSIS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gap 1: Chế độ làm việc từ xa
  → 3 câu hỏi liên quan đều fail
  → Đề xuất: bổ sung tài liệu "Chính sách WFH 2026"
  → Owner: HR team

Gap 2: Quy trình xin nghỉ thai sản
  → Có tài liệu nhưng chunk bị cắt giữa quy trình
  → Đề xuất: re-chunk với chunk_size lớn hơn (1000 → 1500 chars)
  → Owner: Tech team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Tune retrieval (khi pass rate < 75%)

Trong `backend/app/services/rag_service.py`:

| Tham số | Default | Khi nào tăng | Khi nào giảm |
|---|---|---|---|
| `top_k` | 5 | Câu hỏi tổng hợp cần nhiều context | Câu factual đơn giản |
| `min_score` | 0.30 | Tài liệu nhiều thuật ngữ chung → giảm noise | Tài liệu chuyên ngành → để tránh miss |

Trong `backend/app/utils/chunker.py`:

| Tham số | Khuyến nghị |
|---|---|
| `chunk_size` | 800-1200 chars cho tài liệu tiếng Việt |
| `overlap` | 100-200 chars để giữ context xuyên chunk |

Sau mỗi lần tune → chạy lại `rag_eval.py` để verify.

---

## Lưu ý

- **Không tune ngưỡng dựa trên 1-2 case**, cần ≥ 20 case để có signal tin cậy
- **Lưu kết quả theo version** (`rag_eval_result_2026-05-13.json`) để track tiến triển theo thời gian
- **Test set nên include cả tiếng Việt có dấu, không dấu, viết tắt** (PQR vs Pê Quy Rờ)
