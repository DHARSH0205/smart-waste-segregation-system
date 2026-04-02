import os
import sqlite3
import secrets
import hashlib
import datetime as dt


DB_PATH = os.getenv(
    "SQLITE_DB_PATH",
    os.path.join(os.path.dirname(__file__), "app.db"),
)

# Keep this small because scan history can grow quickly.
SCAN_HISTORY_LIMIT_PER_PROFILE = int(os.getenv("SCAN_HISTORY_LIMIT_PER_PROFILE", "50"))

# Chatbot memory is temporary. We keep it for a limited TTL window and clear it explicitly.
CHAT_TTL_MINUTES = int(os.getenv("CHAT_TTL_MINUTES", "180"))


def _utcnow_iso():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                session_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                waste_category TEXT NOT NULL,
                waste_id INTEGER,
                confidence REAL,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chatbot_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                last_active_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chatbot_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(session_id) REFERENCES chatbot_sessions(id) ON DELETE CASCADE
            );
            """
        )


def _hash_password(password: str, salt_hex: str) -> str:
    salt = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return dk.hex()


def create_user(username: str, email: str, password: str) -> int:
    username = (username or "").strip()
    email = (email or "").strip().lower()
    password = password or ""

    if not username:
        raise ValueError("Username is required")
    if not email:
        raise ValueError("Email is required")
    if len(password) < 4:
        # Keep validation light; frontend can enforce stronger constraints.
        raise ValueError("Password must be at least 4 characters")

    salt_hex = secrets.token_hex(16)
    password_hash = _hash_password(password, salt_hex)

    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO users (username, email, password_salt, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (username, email, salt_hex, password_hash, _utcnow_iso()),
        )
        return int(cur.lastrowid)


def get_user_by_email(email: str):
    email = (email or "").strip().lower()
    with get_connection() as conn:
        cur = conn.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cur.fetchone()
        return row


def verify_user_password(user_row, password: str) -> bool:
    if not user_row:
        return False
    salt_hex = user_row["password_salt"]
    expected_hash = user_row["password_hash"]
    actual_hash = _hash_password(password or "", salt_hex)
    return secrets.compare_digest(expected_hash, actual_hash)


def create_session(user_id: int) -> str:
    session_id = secrets.token_urlsafe(32)
    now = dt.datetime.now(dt.timezone.utc)
    expires_at = now + dt.timedelta(days=7)

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO auth_sessions (session_id, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, user_id, now.isoformat(), expires_at.isoformat()),
        )
    return session_id


def get_user_id_from_session(session_id: str):
    if not session_id:
        return None
    with get_connection() as conn:
        cur = conn.execute(
            """
            SELECT user_id, expires_at
            FROM auth_sessions
            WHERE session_id = ?
            """,
            (session_id,),
        )
        row = cur.fetchone()
        if not row:
            return None

        expires_at = dt.datetime.fromisoformat(row["expires_at"])
        now = dt.datetime.now(dt.timezone.utc)
        if expires_at < now:
            return None
        return int(row["user_id"])


def destroy_session(session_id: str):
    if not session_id:
        return
    with get_connection() as conn:
        conn.execute("DELETE FROM auth_sessions WHERE session_id = ?", (session_id,))


def get_profile_stats(user_id: int):
    with get_connection() as conn:
        user_row = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user_row:
            return None

        counts = conn.execute(
            """
            SELECT waste_category, COUNT(*) as total
            FROM scan_history
            WHERE user_id = ?
            GROUP BY waste_category
            ORDER BY total DESC
            """,
            (user_id,),
        ).fetchall()

        total_scans = conn.execute(
            "SELECT COUNT(*) as total FROM scan_history WHERE user_id = ?",
            (user_id,),
        ).fetchone()["total"]

        by_source_rows = conn.execute(
            """
            SELECT source, COUNT(*) as total
            FROM scan_history
            WHERE user_id = ?
            GROUP BY source
            """,
            (user_id,),
        ).fetchall()

        # Map old source values to the requested scan types.
        by_scan_type = {"single": 0, "camera": 0, "zipFile": 0}
        for row in by_source_rows:
            src = (row["source"] or "").strip()
            src_lower = src.lower()
            if src_lower == "camera":
                by_scan_type["camera"] += int(row["total"])
            elif src_lower == "single" or src_lower == "predict":
                by_scan_type["single"] += int(row["total"])
            elif src_lower in ("zipfile", "zip", "zip_file", "bulk", "bulkzip", "bulk_predict", "zip-predict", "bulk_predict".lower()):
                by_scan_type["zipFile"] += int(row["total"])
            else:
                # Unknown source; ignore for the dashboard aggregates.
                pass

        return {
            "username": user_row["username"],
            "totalScans": int(total_scans),
            "byCategory": {row["waste_category"]: int(row["total"]) for row in counts},
            "byScanType": by_scan_type,
        }


def get_recent_scans(user_id: int, limit: int = 50):
    limit = int(limit)
    with get_connection() as conn:
        cur = conn.execute(
            """
            SELECT waste_category, waste_id, confidence, source, created_at
            FROM scan_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        rows = cur.fetchall()
        return [
            {
                "wasteCategory": row["waste_category"],
                "wasteId": row["waste_id"],
                "confidence": row["confidence"],
                "source": row["source"],
                "createdAt": row["created_at"],
            }
            for row in rows
        ]


def record_scan(user_id: int, waste_category: str, waste_id, confidence, source: str):
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO scan_history (user_id, waste_category, waste_id, confidence, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, waste_category, waste_id, confidence, source, _utcnow_iso()),
        )


def record_scans_many(scans: list[tuple]):
    """
    scans: list of (user_id, waste_category, waste_id, confidence, source)
    """
    if not scans:
        return
    now_iso = _utcnow_iso()
    with get_connection() as conn:
        conn.executemany(
            """
            INSERT INTO scan_history (user_id, waste_category, waste_id, confidence, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [(u, cat, wid, conf, src, now_iso) for (u, cat, wid, conf, src) in scans],
        )


def chat_get_or_create_session(user_id: int) -> int:
    ttl_threshold = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=CHAT_TTL_MINUTES)

    with get_connection() as conn:
        cur = conn.execute(
            """
            SELECT id, last_active_at
            FROM chatbot_sessions
            WHERE user_id = ?
            ORDER BY last_active_at DESC
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
        if row:
            last_active = dt.datetime.fromisoformat(row["last_active_at"])
            if last_active >= ttl_threshold:
                return int(row["id"])

        # Expired or none: create new session
        now_iso = _utcnow_iso()
        cur2 = conn.execute(
            """
            INSERT INTO chatbot_sessions (user_id, created_at, last_active_at)
            VALUES (?, ?, ?)
            """,
            (user_id, now_iso, now_iso),
        )
        return int(cur2.lastrowid)


def chat_touch_session(session_id: int):
    with get_connection() as conn:
        conn.execute(
            "UPDATE chatbot_sessions SET last_active_at = ? WHERE id = ?",
            (_utcnow_iso(), session_id),
        )


def chat_add_message(session_id: int, role: str, content: str):
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO chatbot_messages (session_id, role, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, role, content, _utcnow_iso()),
        )


def chat_get_recent_messages(session_id: int, limit: int = 20):
    limit = int(limit)
    with get_connection() as conn:
        cur = conn.execute(
            """
            SELECT role, content
            FROM chatbot_messages
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (session_id, limit),
        )
        rows = cur.fetchall()
        # Reverse to chronological order
        rows.reverse()
        return [{"role": row["role"], "content": row["content"]} for row in rows]


def chat_clear_session(user_id: int):
    with get_connection() as conn:
        cur = conn.execute(
            """
            SELECT id
            FROM chatbot_sessions
            WHERE user_id = ?
            ORDER BY last_active_at DESC
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            return
        session_id = int(row["id"])

        conn.execute("DELETE FROM chatbot_messages WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM chatbot_sessions WHERE id = ?", (session_id,))


def update_password_for_user(user_id: int, current_password: str, new_password: str):
    current_password = current_password or ""
    new_password = new_password or ""
    if len(new_password) < 4:
        raise ValueError("New password must be at least 4 characters")

    with get_connection() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user_row:
            raise ValueError("User not found")

        if not verify_user_password(user_row, current_password):
            raise ValueError("Current password is incorrect")

        salt_hex = secrets.token_hex(16)
        password_hash = _hash_password(new_password, salt_hex)

        conn.execute(
            """
            UPDATE users
            SET password_salt = ?, password_hash = ?
            WHERE id = ?
            """,
            (salt_hex, password_hash, user_id),
        )

