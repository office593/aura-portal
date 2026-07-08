import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('tenants.db')

cols = [r[1] for r in conn.execute('PRAGMA table_info(contacts)').fetchall()]
if 'type' not in cols:
    conn.execute("ALTER TABLE contacts ADD COLUMN type TEXT DEFAULT 'contact'")
    conn.execute("UPDATE contacts SET type='contact' WHERE type IS NULL")
    print('Added type column')

professionals = [
    ('בר אוריין אדריכלים', 'אדריכל הפרויקט'),
    ('משרד עורכי דין נריה כהן', 'עו"ד דיירים'),
    ('ירון מלול - שמאות מקרקעין', 'שמאי דיירים'),
    ('MZG Engineering', 'חברת פיקוח מטעם הדיירים'),
    ("ד\"ר מ. דרוקר ושות'", 'עו"ד יזם'),
    ('דגש הנדסה - תכנון תנועה ודרכים בע"מ', 'יועצי תחבורה'),
    ('URBAN NOF', 'יועץ נוף'),
]

existing = [r[0] for r in conn.execute("SELECT name FROM contacts WHERE type='professional'").fetchall()]
for name, role in professionals:
    if name not in existing:
        conn.execute("INSERT INTO contacts (name, role, type) VALUES (?,?,'professional')", (name, role))
        print(f'Added: {name}')

conn.commit()
print('Done')
for r in conn.execute("SELECT id, name, role, type FROM contacts WHERE type='professional'").fetchall():
    print(r)
conn.close()
