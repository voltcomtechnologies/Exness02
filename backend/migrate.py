import sqlite3
import sys

db_path = "exness_crm.db"
print(f"Opening database: {db_path}")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check and add is_read to ticket_messages table
cur.execute("PRAGMA table_info(ticket_messages)")
cols = [c[1] for c in cur.fetchall()]
print("ticket_messages columns:", cols)

if 'is_read' not in cols:
    cur.execute("ALTER TABLE ticket_messages ADD COLUMN is_read BOOLEAN DEFAULT 0")
    conn.commit()
    print("Added is_read column to ticket_messages")
else:
    print("is_read column already exists in ticket_messages")

conn.close()
print("Done")
sys.exit(0)
