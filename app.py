from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3, os

app = Flask(__name__)
CORS(app)
DB = os.environ.get('DB_PATH', 'data.db')

def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with conn() as c:
        c.executescript('''
            CREATE TABLE IF NOT EXISTS vacations (
                id     INTEGER PRIMARY KEY AUTOINCREMENT,
                name   TEXT    NOT NULL,
                start  TEXT    NOT NULL,
                end    TEXT    NOT NULL,
                memo   TEXT    DEFAULT '',
                ts     TEXT    DEFAULT (datetime('now','localtime'))
            );
            CREATE TABLE IF NOT EXISTS blocked (
                date   TEXT    PRIMARY KEY,
                reason TEXT    DEFAULT ''
            );
        ''')

# ── 페이지 ──────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# ── 휴가 API ────────────────────────────────────────────
@app.route('/api/vacations', methods=['GET'])
def get_vacations():
    with conn() as c:
        rows = c.execute(
            'SELECT * FROM vacations ORDER BY start, name'
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/vacations', methods=['POST'])
def post_vacation():
    d = request.json
    if not d or not d.get('name') or not d.get('start') or not d.get('end'):
        return jsonify({'error': '필수 항목 누락'}), 400
    with conn() as c:
        cur = c.execute(
            'INSERT INTO vacations(name,start,end,memo) VALUES(?,?,?,?)',
            (d['name'].strip(), d['start'], d['end'], d.get('memo', '').strip())
        )
        row = c.execute(
            'SELECT * FROM vacations WHERE id=?', (cur.lastrowid,)
        ).fetchone()
    return jsonify(dict(row)), 201

@app.route('/api/vacations/<int:vid>', methods=['DELETE'])
def del_vacation(vid):
    with conn() as c:
        c.execute('DELETE FROM vacations WHERE id=?', (vid,))
    return '', 204

# ── 차단 날짜 API ────────────────────────────────────────
@app.route('/api/blocked', methods=['GET'])
def get_blocked():
    with conn() as c:
        rows = c.execute('SELECT date, reason FROM blocked').fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/blocked', methods=['POST'])
def post_blocked():
    items = request.json  # [{"date": "2026-08-15", "reason": "광복절"}, ...]
    if not isinstance(items, list):
        return jsonify({'error': '배열 형식으로 전달하세요'}), 400
    with conn() as c:
        for item in items:
            c.execute(
                'INSERT OR REPLACE INTO blocked(date,reason) VALUES(?,?)',
                (item['date'], item.get('reason', ''))
            )
    return '', 201

@app.route('/api/blocked/<date>', methods=['DELETE'])
def del_blocked(date):
    with conn() as c:
        c.execute('DELETE FROM blocked WHERE date=?', (date,))
    return '', 204

# ── 실행 ────────────────────────────────────────────────
init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
