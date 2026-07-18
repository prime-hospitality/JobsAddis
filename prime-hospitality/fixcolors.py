f = 'src/app/admin/AdminDashboard.tsx'
c = open(f, 'r', encoding='utf-8').read()

# Replace dark focus ring with iOS blue focus ring
c = c.replace('focus:ring-[#1c1c1e]/10', 'focus:ring-[#007aff]/20')
c = c.replace('focus:ring-[#1c1c1e]/20', 'focus:ring-[#007aff]/20')
c = c.replace('focus:border-[#1c1c1e]', 'focus:border-[#007aff]')

# Fix inactive nav text to be darker (more readable)
c = c.replace(
    'text-[#8e8e93] font-medium hover:bg-[#e5e5ea] hover:text-black',
    'text-[#3a3a3c] font-medium hover:bg-[#e5e5ea] hover:text-[#1c1c1e]'
)

# Fix remaining hardcoded style prop grays
c = c.replace('color: "#6b7280"', 'color: "#8e8e93"')
c = c.replace('color: "#374151"', 'color: "#1c1c1e"')

open(f, 'w', encoding='utf-8').write(c)
print('Done')
