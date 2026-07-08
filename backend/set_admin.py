import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')

ADMIN_PHONE = '0524760267'

conn = sqlite3.connect('tenants.db')

row = conn.execute("SELECT phone, name, is_admin FROM tenants WHERE phone=?", (ADMIN_PHONE,)).fetchone()
if not row:
    print(f"ERROR: phone {ADMIN_PHONE} not found in DB")
else:
    conn.execute("UPDATE tenants SET is_admin=1 WHERE phone=?", (ADMIN_PHONE,))
    conn.commit()
    print(f"OK: {ADMIN_PHONE} is now admin")

print("\nAll tenants:")
for r in conn.execute('SELECT phone, name, is_admin FROM tenants').fetchall():
    print(r)

conn.close()
