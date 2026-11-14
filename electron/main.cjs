const { app, BrowserWindow, dialog, ipcMain, nativeImage, net, protocol, session } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { randomUUID } = require('node:crypto')
const Papa = require('papaparse')

protocol.registerSchemesAsPrivileged([{ scheme: 'wall', privileges: { standard: true, secure: true, supportFetchAPI: true } }])
app.setName('Graduation Memories')
if (process.env.GRADUATION_USER_DATA) app.setPath('userData', path.resolve(process.env.GRADUATION_USER_DATA))
const defaults = { university: 'International University', year: '', columns: 10, animations: true, interval: 5, fullscreen: false, logo: '' }
const dist = path.join(__dirname, '..', 'dist')
let window, dataPath, students, settings, draft, matches, logoDraft
let kiosk = false
let writes = Promise.resolve()
const allowedImage = /\.(?:jpe?g|png|webp)$/i
const serial = action => {
  const result = writes.then(action)
  writes = result.catch(() => {})
  return result
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) }
  catch (error) {
    if (error.code === 'ENOENT') return fallback
    if (error instanceof SyntaxError) {
      await fs.rename(file, file + '.invalid-' + Date.now())
      return fallback
    }
    throw error
  }
}

async function saveJson(file, value) {
  const target = path.join(dataPath, file)
  const temporary = target + '.tmp'
  await fs.writeFile(temporary, JSON.stringify(value, null, 2))
  await fs.rename(temporary, target)
}

function register(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (event.sender !== window.webContents || event.senderFrame?.url !== 'wall://app/index.html') throw new Error('Untrusted request')
    return handler(...args)
  })
}

function setKiosk(enabled) {
  kiosk = enabled
  window.setKiosk(enabled)
  window.setFullScreen(enabled)
}

function parseCsv(csv) {
  const parsed = Papa.parse(csv.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: key => key.trim().toLowerCase() })
  if (parsed.errors.length) throw new Error(parsed.errors[0].message)
  if (!parsed.data.length || parsed.data.length > 5000) throw new Error('Provide between 1 and 5,000 student records.')
  const ids = new Set()
  return parsed.data.map((row, index) => {
    const get = key => (row[key] ?? '').trim()
    const studentId = get('studentid'), name = get('name'), degree = get('degree'), department = get('department')
    const graduationYear = Number(get('graduationyear')), filename = get('photo')
    const label = 'Record ' + (index + 1)
    if (!studentId || !name || !degree || !department || !/^\d{4}$/.test(get('graduationyear')) || graduationYear < 1900 || graduationYear > 2200) {
      throw new Error(label + ' requires studentId, name, degree, department, and a valid graduationYear.')
    }
    if (ids.has(studentId.toLowerCase())) throw new Error(label + ' repeats student ID ' + studentId)
    if (filename && (/[\\/:]/.test(filename) || !allowedImage.test(filename))) throw new Error(label + ' must specify a JPG, PNG, or WebP filename in the photo column.')
    ids.add(studentId.toLowerCase())
    return { id: index + 1, studentId, name, degree, department, graduationYear, honors: get('honors'), university: get('university'), filename }
  })
}

function preview() {
  return draft?.map(({ filename, ...student }) => ({ ...student, matched: !!matches.get(student.id) })) ?? []
}

async function pickPhotos() {
  if (!draft) throw new Error('Choose a CSV first.')
  const selected = await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
  if (selected.canceled) return null
  const directory = selected.filePaths[0]
  const entries = (await fs.readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile() && allowedImage.test(entry.name))
  const names = new Map(entries.map(entry => [entry.name.toLowerCase(), entry.name]))
  const stems = new Map(entries.map(entry => [path.parse(entry.name).name.toLowerCase(), entry.name]))
  const next = new Map()
  for (const student of draft) {
    const filename = names.get(student.filename.toLowerCase()) ?? stems.get(student.studentId.toLowerCase())
    if (filename) next.set(student.id, path.join(directory, filename))
  }
  matches = next
  return preview()
}

async function importStudents() {
  if (!draft) throw new Error('Choose a CSV first.')
  const batch = randomUUID()
  const folder = path.join(dataPath, 'media', batch)
  await fs.mkdir(folder, { recursive: true })
  const records = []
  for (const { filename, ...student } of draft) {
    const source = matches.get(student.id)
    if (source) {
      const image = nativeImage.createFromPath(source)
      if (image.isEmpty()) throw new Error('Unable to read the image for ' + student.name)
      const full = 'student-' + student.id + '.jpg', thumb = 'thumb-' + student.id + '.jpg'
      const resize = limit => {
        const { width, height } = image.getSize()
        return Math.max(width, height) <= limit ? image : image.resize(width >= height ? { width: limit } : { height: limit })
      }
      await fs.writeFile(path.join(folder, full), resize(1800).toJPEG(88))
      await fs.writeFile(path.join(folder, thumb), resize(320).toJPEG(82))
      student.photo = '/media/' + batch + '/' + full
      student.thumbnail = '/media/' + batch + '/' + thumb
    }
    records.push(student)
  }
  await saveJson('students.json', records)
  students = records
  draft = undefined
  return students
}

async function serve(request) {
  const url = new URL(request.url)
  if (url.hostname !== 'app') return new Response(null, { status: 404 })
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.some(part => !/^[\w.-]+$/.test(part) || part === '..' || part === '.')) return new Response(null, { status: 404 })
  const file = parts[0] === 'media' ? path.join(dataPath, ...parts) : path.join(dist, ...parts)
  if (parts[0] === 'media' && !allowedImage.test(file)) return new Response(null, { status: 404 })
  try { return await net.fetch(pathToFileURL(file).href) }
  catch { return new Response(null, { status: 404 }) }
}

app.whenReady().then(async () => {
  dataPath = app.getPath('userData')
  await fs.mkdir(path.join(dataPath, 'media'), { recursive: true })
  students = await readJson(path.join(dataPath, 'students.json'), null)
  if (!Array.isArray(students) || !students.length || students.some(student => !student || typeof student.name !== 'string' || typeof student.department !== 'string' || typeof student.studentId !== 'string')) {
    students = JSON.parse(await fs.readFile(path.join(dist, 'sampleStudents.json'), 'utf8'))
  }
  settings = { ...defaults, ...await readJson(path.join(dataPath, 'settings.json'), {}) }
  protocol.handle('wall', serve)
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_details, callback) => callback({ cancel: true }))
  window = new BrowserWindow({
    width: 1500, height: 950, minWidth: 640, minHeight: 520, show: false,
    icon: path.join(dist, 'assets', 'icon.png'),
    backgroundColor: '#081829', autoHideMenuBar: true, fullscreen: settings.fullscreen,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false }
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', event => event.preventDefault())
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return
    if (input.key === 'F11' && !kiosk) {
      event.preventDefault()
      window.setFullScreen(!window.isFullScreen())
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'k' && kiosk) {
      event.preventDefault()
      setKiosk(false)
    }
  })
  register('load', () => ({ students, settings }))
  register('preview', () => serial(async () => {
    const selected = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }] })
    if (selected.canceled) return null
    const source = selected.filePaths[0]
    if ((await fs.stat(source)).size > 10 * 1024 * 1024) throw new Error('CSV files must be smaller than 10 MB.')
    draft = parseCsv(await fs.readFile(source, 'utf8'))
    matches = new Map()
    return preview()
  }))
  register('match', () => serial(pickPhotos))
  register('save-import', () => serial(importStudents))
  register('pick-logo', () => serial(async () => {
    const selected = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'Logo', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] })
    if (selected.canceled) return null
    const image = nativeImage.createFromPath(selected.filePaths[0])
    if (image.isEmpty()) throw new Error('Unable to read this logo.')
    const name = 'logo-' + randomUUID() + '.png'
    await fs.writeFile(path.join(dataPath, 'media', name), image.resize({ width: 240 }).toPNG())
    logoDraft = '/media/' + name
    return logoDraft
  }))
  register('save-settings', value => serial(async () => {
    const next = {
      university: String(value.university || defaults.university).trim().slice(0, 100) || defaults.university,
      year: /^\d{4}$/.test(value.year) ? value.year : '',
      columns: [8, 10, 12].includes(value.columns) ? value.columns : 10,
      animations: !!value.animations, fullscreen: !!value.fullscreen,
      interval: [5, 10, 15].includes(value.interval) ? value.interval : 5,
      logo: value.logo && [settings.logo, logoDraft].includes(value.logo) ? value.logo : ''
    }
    await saveJson('settings.json', next)
    settings = next
    return settings
  }))
  register('fullscreen', () => { if (!kiosk) window.setFullScreen(!window.isFullScreen()) })
  register('kiosk', () => setKiosk(!kiosk))
  window.once('ready-to-show', () => window.show())
  await window.loadURL('wall://app/index.html')
}).catch(error => {
  dialog.showErrorBox('Graduation Memories', error.message)
  app.quit()
})
app.on('window-all-closed', () => app.quit())
