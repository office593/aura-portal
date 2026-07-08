import sys, sqlite3, json
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('tenants.db')

# הסרת אדמין מ-0500000000
conn.execute("UPDATE tenants SET is_admin=0 WHERE phone='0500000000'")

# החזרת דיירים שנמחקו
specs = json.dumps({
    'קירות': 'טיח + צבע לבן', 'ריצוף': 'גרניט 60x60',
    'מטבח': 'ארונות לבן עם משטח קוורץ', 'חדר אמבטיה': 'אריחי 30x60 לבן',
    'חלונות': 'אלומיניום + זכוכית כפולה', 'מיזוג': 'מיני מרכזי לכל חדר',
})
existing = [r[0] for r in conn.execute('SELECT phone FROM tenants').fetchall()]

if '0509876543' not in existing:
    conn.execute(
        "INSERT INTO tenants (phone,name,is_admin,air_old,air_new,floor_old,floor_new,specs) VALUES (?,?,?,?,?,?,?,?)",
        ('0509876543', 'שרה כהן', 0, 'צפון', 'דרום', '3', '5', specs)
    )
    print('added sarah')

if '0521112233' not in existing:
    conn.execute(
        "INSERT INTO tenants (phone,name,is_admin,air_old,air_new,floor_old,floor_new,specs) VALUES (?,?,?,?,?,?,?,?)",
        ('0521112233', 'דוד לוי', 0, 'מערב', 'מזרח-צפון', '2', '4', specs)
    )
    print('added david')

conn.commit()

rows = conn.execute('SELECT phone, name, is_admin FROM tenants').fetchall()
for r in rows:
    print(r)
conn.close()
