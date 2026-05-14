"""
Helper đăng bài Facebook cho page Tuyển dụng PQR.
Dùng flow 2 bước (upload published=false → /feed attached_media) để post LUÔN lên trang chủ,
KHÔNG bị mắc vào album. Tự verify is_published + permalink_url sau khi đăng.

Setup 1 lần:
    export PAGE_3_TOKEN="<token_long_lived_từ_drive>"

Dùng:
    python3 post.py now "Nội dung bài"                          # text only
    python3 post.py now "Nội dung bài" https://i.imgur.com/x.jpg  # có ảnh
    python3 post.py schedule "Nội dung" 2026-05-15 19:30          # lên lịch (giờ VN)
    python3 post.py schedule "Nội dung" 2026-05-15 19:30 https://i.imgur.com/x.jpg
"""

import json, mimetypes, os, sys, time, urllib.parse, urllib.request, uuid
from datetime import datetime
from pathlib import Path

PAGE_ID = "499740783831824"
GRAPH_VERSION = "v23.0"


def _load_token():
    """Lấy PAGE_3_TOKEN từ env, fallback đọc từ .env file cạnh script."""
    tok = os.environ.get("PAGE_3_TOKEN")
    if tok:
        return tok
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("PAGE_3_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"')
    return None


PAGE_TOKEN = _load_token()

FOOTER = (
    "\n-----------------------------"
    "\n🔎 𝐓𝐔𝐘𝐄̂̉𝐍 𝐃𝐔̣𝐍𝐆 𝐏𝐐𝐑 | Your Prosperity - Our Success"
    "\n📍 Trụ sở chính: 101 Nguyễn Cơ Thạch KĐT Sala P. An Khánh TP. HCM"
)


def _require_token():
    if not PAGE_TOKEN:
        sys.exit(
            "❌ Thiếu env PAGE_3_TOKEN. Chạy: export PAGE_3_TOKEN=\"<token>\" rồi thử lại.\n"
            "   Token long-lived hiện tại trên Google Drive (file: facebook-secrets-pqr-tuyen-dung)."
        )


def _post(url, data):
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        sys.exit(f"❌ Facebook API error {e.code}: {err}")


def _get(url):
    try:
        with urllib.request.urlopen(url) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()}


def insert_footer(content):
    """Chèn FOOTER trước hashtag block (giữ hashtag ở cuối bài)."""
    lines = content.rstrip().split("\n")
    hashtag_start = None
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip().startswith("#"):
            hashtag_start = i
        else:
            break
    if hashtag_start is None:
        return content.rstrip() + FOOTER
    body = "\n".join(lines[:hashtag_start]).rstrip()
    hashtags = "\n".join(lines[hashtag_start:])
    return f"{body}{FOOTER}\n\n{hashtags}"


def _upload_photo_unpublished(image_src):
    """B1 của flow 2 bước: upload ảnh với published=false, lấy media_fbid.
    image_src có thể là URL (http/https) HOẶC đường dẫn local file."""
    if image_src.startswith(("http://", "https://")):
        resp = _post(
            f"https://graph.facebook.com/{GRAPH_VERSION}/{PAGE_ID}/photos",
            {"url": image_src, "published": "false", "access_token": PAGE_TOKEN},
        )
    else:
        path = Path(image_src)
        if not path.exists():
            sys.exit(f"❌ File ảnh không tồn tại: {image_src}")
        resp = _multipart_upload_photo(path)
    if "id" not in resp:
        sys.exit(f"❌ Upload ảnh fail: {resp}")
    return resp["id"]


def _multipart_upload_photo(file_path: Path):
    """Upload local file via multipart/form-data (cho phép Facebook host ảnh)."""
    boundary = f"----PythonBoundary{uuid.uuid4().hex}"
    mime_type = mimetypes.guess_type(file_path.name)[0] or "image/png"
    parts = []
    for field, value in (("published", "false"), ("access_token", PAGE_TOKEN)):
        parts.append(f"--{boundary}\r\n".encode())
        parts.append(f'Content-Disposition: form-data; name="{field}"\r\n\r\n'.encode())
        parts.append(f"{value}\r\n".encode())
    parts.append(f"--{boundary}\r\n".encode())
    parts.append(
        f'Content-Disposition: form-data; name="source"; filename="{file_path.name}"\r\n'
        f"Content-Type: {mime_type}\r\n\r\n".encode()
    )
    parts.append(file_path.read_bytes())
    parts.append(f"\r\n--{boundary}--\r\n".encode())
    body = b"".join(parts)
    req = urllib.request.Request(
        f"https://graph.facebook.com/{GRAPH_VERSION}/{PAGE_ID}/photos",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        sys.exit(f"❌ Multipart upload error {e.code}: {err}")


def post_now(message, image_url=None):
    """Đăng ngay. Dùng /feed (text-only) hoặc /feed + attached_media (có ảnh)."""
    _require_token()
    message = insert_footer(message)
    data = {"message": message, "published": "true", "access_token": PAGE_TOKEN}

    if image_url:
        media_fbid = _upload_photo_unpublished(image_url)
        data["attached_media[0]"] = json.dumps({"media_fbid": media_fbid})

    resp = _post(
        f"https://graph.facebook.com/{GRAPH_VERSION}/{PAGE_ID}/feed", data
    )
    if "id" not in resp:
        sys.exit(f"❌ Đăng fail: {resp}")
    return verify_post(resp["id"])


def schedule_post(message, when_str, image_url=None):
    """Lên lịch. when_str = 'YYYY-MM-DD HH:MM' giờ VN."""
    _require_token()
    message = insert_footer(message)
    dt = datetime.strptime(when_str, "%Y-%m-%d %H:%M")
    unix_ts = int(dt.timestamp()) - 7 * 3600  # convert VN (UTC+7) → UTC
    now = int(time.time())
    if unix_ts < now + 600:
        sys.exit("❌ Scheduled time phải >= 10 phút từ hiện tại.")
    if unix_ts > now + 6 * 30 * 86400:
        sys.exit("❌ Scheduled time phải <= 6 tháng từ hiện tại.")

    data = {
        "message": message,
        "published": "false",
        "scheduled_publish_time": str(unix_ts),
        "access_token": PAGE_TOKEN,
    }
    if image_url:
        media_fbid = _upload_photo_unpublished(image_url)
        data["attached_media[0]"] = json.dumps({"media_fbid": media_fbid})

    resp = _post(
        f"https://graph.facebook.com/{GRAPH_VERSION}/{PAGE_ID}/feed", data
    )
    if "id" not in resp:
        sys.exit(f"❌ Lên lịch fail: {resp}")
    return verify_post(resp["id"], scheduled=True)


def verify_post(post_id, scheduled=False):
    """B8 của flow: verify is_published + permalink_url + có trên feed không."""
    if not scheduled:
        time.sleep(5)  # đợi Facebook propagate

    fields = "id,message,permalink_url,is_published,scheduled_publish_time,attachments"
    info = _get(
        f"https://graph.facebook.com/{GRAPH_VERSION}/{post_id}"
        f"?fields={fields}&access_token={PAGE_TOKEN}"
    )

    print("━" * 50)
    print(f"✅ Post ID   : {post_id}")
    print(f"   Permalink : {info.get('permalink_url', '(chưa có)')}")
    print(f"   Published : {info.get('is_published')}")
    if scheduled:
        sched = info.get("scheduled_publish_time")
        if sched:
            sched_vn = datetime.fromtimestamp(int(sched) + 7 * 3600)
            print(f"   Scheduled : {sched_vn.strftime('%Y-%m-%d %H:%M')} (giờ VN)")
    else:
        feed = _get(
            f"https://graph.facebook.com/{GRAPH_VERSION}/{PAGE_ID}/feed"
            f"?limit=5&fields=id&access_token={PAGE_TOKEN}"
        )
        on_feed = any(p.get("id") == post_id for p in feed.get("data", []))
        print(f"   Trên feed : {'✅ có' if on_feed else '❌ KHÔNG — kiểm tra ngay'}")
        if not on_feed:
            print("   ⚠️  Post có ID nhưng không hiện trên feed. Có thể bị bug album.")
            print("       Recovery: chạy lại với image_url khác hoặc xóa + đăng lại.")
    print("━" * 50)
    return info


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    mode = sys.argv[1]
    if mode == "now":
        message = sys.argv[2]
        image_url = sys.argv[3] if len(sys.argv) > 3 else None
        post_now(message, image_url)
    elif mode == "schedule":
        message = sys.argv[2]
        when_str = f"{sys.argv[3]} {sys.argv[4]}"  # "2026-05-15" + "19:30"
        image_url = sys.argv[5] if len(sys.argv) > 5 else None
        schedule_post(message, when_str, image_url)
    else:
        sys.exit(f"❌ Mode không hợp lệ: {mode}. Dùng 'now' hoặc 'schedule'.")
