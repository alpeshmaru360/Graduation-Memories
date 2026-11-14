const { readFileSync, writeFileSync, mkdirSync } = require('node:fs')
const { join } = require('node:path')
const { execFileSync } = require('node:child_process')

const sheets = process.argv.slice(2)
if (sheets.length !== 4) throw new Error('Pass four 5×5 contact sheets to regenerate the bundled demo.')
const directory = join('public', 'assets', 'students')
mkdirSync(directory, { recursive: true })
mkdirSync('build', { recursive: true })
const firstNames = ['Haruto','Elena','Malik','Mei','Theo','Ananya','Samir','Clara','Daniel','Imani','Ren','Fatima','Jin','Naomi','Mateo','Yuna','Kwame','Amira','Kenji','Rowan','Ari','Aaliyah','Felix','Sora','Vikram','Leila','Rafael','Priya','Omar','Nina','Maya','Jamal','Hana','Luca','Tariq','Lucia','Ishaan','Sofia','Asha','Kaito','Sara','Nadia','Zane','Elise','Riya','Hugo','Dara','Alina','Tessa','Minh']
const familyNames = ['Sato','Morales','Okafor','Lin','Parker','Sharma','Haddad','Reed','Tan','Mensah','Ito','Al-Mansoori','Park','Reyes','Santos','Mori','Boateng','Saleh','Watanabe','Bennett','Silva','Brooks','Chen','Nguyen','Rao','Hassan','Costa','Iyer','Farouk','Hart','Shah','Cole','Kim','Rossi','Khan','Ruiz','Patel','Marin','Nair','Abe','Kaur','Youssef','Singh','Laurent','Kapoor','Roy','Seng','Moreau','Miller','Tran']
const programs = [
  ['Bachelor of Science', 'Business Administration'], ['Bachelor of Science', 'Computer Science'],
  ['Bachelor of Science', 'Information Technology'], ['Bachelor of Engineering', 'Mechanical Engineering'],
  ['Doctor of Medicine', 'Medicine'], ['Bachelor of Commerce', 'Finance'], ['Bachelor of Architecture', 'Architecture'],
  ['Bachelor of Arts', 'Visual Arts'], ['Bachelor of Education', 'Education'], ['Bachelor of Business', 'Management']
]
const honors = ['', 'With Honors', '', 'Cum Laude', '', 'Magna Cum Laude', '', 'Summa Cum Laude']
const records = []
for (let sheet = 0; sheet < sheets.length; sheet++) {
  const dimensions = execFileSync('magick', ['identify', '-ping', '-format', '%w %h', sheets[sheet]], { encoding: 'utf8' }).split(' ').map(Number)
  const xEdges = sheet === 0 ? [0, 230, 452, 674, 896, 1122] : Array.from({ length: 6 }, (_, i) => Math.round(i * dimensions[0] / 5))
  const yEdges = sheet === 0 ? [0, 282, 561, 840, 1121, 1402] : Array.from({ length: 6 }, (_, i) => Math.round(i * dimensions[1] / 5))
  for (let cell = 0; cell < 25; cell++) {
    const offset = sheet * 25 + cell, id = offset + 1
    const x = cell % 5, y = Math.floor(cell / 5)
    const geometry = (xEdges[x + 1] - xEdges[x] - 6) + 'x' + (yEdges[y + 1] - yEdges[y] - 6) + '+' + (xEdges[x] + 3) + '+' + (yEdges[y] + 3)
    const suffix = String(id).padStart(3, '0')
    const filename = 'student-' + suffix + '.jpg', thumbnail = 'thumb-' + suffix + '.jpg'
    execFileSync('magick', [sheets[sheet], '-crop', geometry, '+repage', '-strip', '-quality', '90', join(directory, filename)])
    execFileSync('magick', [join(directory, filename), '-resize', '160x200>', '-quality', '84', join(directory, thumbnail)])
    const graduationYear = offset < 80 ? 2023 : offset < 90 ? 2024 : 2025
    const [degree, department] = programs[(offset + 9) % programs.length]
    const name = firstNames[offset % 50] + ' ' + familyNames[(offset + (offset < 50 ? 0 : 17)) % 50]
    records.push({ id, studentId: 'GRAD' + graduationYear + '-' + suffix, name, degree, department, graduationYear,
      honors: id === 12 ? 'With Honors' : honors[offset % honors.length],
      university: 'International University', photo: '/assets/students/' + filename, thumbnail: '/assets/students/' + thumbnail })
  }
}
writeFileSync(join('public', 'sampleStudents.json'), JSON.stringify(records, null, 2) + '\n')
execFileSync('magick', ['-background', 'none', 'build/icon.svg', '-define', 'icon:auto-resize=256,128,64,48,32,16', 'build/icon.ico'])
execFileSync('magick', ['-background', 'none', 'build/icon.svg', 'public/assets/icon.png'])
