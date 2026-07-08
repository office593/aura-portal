import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('tenants.db')

cols = [r[1] for r in conn.execute('PRAGMA table_info(contacts)').fetchall()]
if 'website' not in cols:
    conn.execute("ALTER TABLE contacts ADD COLUMN website TEXT")
    print('Added website column')

websites = {
    'בר אוריין אדריכלים': 'https://www.bar-urian.co.il',
    'משרד עורכי דין נריה כהן': 'https://www.nklaw.co.il',
    'ירון מלול - שמאות מקרקעין': 'https://www.mmlul.co.il',
    'MZG Engineering': 'https://www.mzg.co.il',
    "ד\"ר מ. דרוקר ושות'": 'https://www.drucker-law.co.il',
    'דגש הנדסה - תכנון תנועה ודרכים בע"מ': 'https://www.dagesh.co.il',
    'URBAN NOF': 'https://www.urbannof.co.il',
}

for name, url in websites.items():
    conn.execute("UPDATE contacts SET website=? WHERE name=?", (url, name))
    print(f'Set website for {name}: {url}')

conn.commit()
print('\nProfessionals:')
for r in conn.execute("SELECT name, website FROM contacts WHERE type='professional'").fetchall():
    print(r)
conn.close()
