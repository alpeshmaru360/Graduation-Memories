import { useState } from 'react'
import { FileUp, FolderOpen, ImagePlus, Monitor, Save } from 'lucide-react'
import type { Preview, Settings, Student } from './types'

export function Admin({ onSave }: { onSave: (students: Student[]) => void }) {
  const [records, setRecords] = useState<Preview[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    try { await action() }
    catch (error) { setMessage(String(error).replace(/^.*?Error: /, '')) }
    finally { setBusy(false) }
  }
  return <section className="panel">
    <p className="eyebrow">LOCAL COLLECTION</p>
    <h1>Data management</h1>
    <p>Choose a UTF-8 CSV, match portraits from a folder, then review the collection before saving.</p>
    <p className="muted">Required columns: studentId, name, degree, department, graduationYear. Optional: honors, university, photo. Portraits match the photo filename or student ID.</p>
    <div className="actions">
      <button disabled={busy} onClick={() => run(async () => { const next = await window.graduation.preview(); if (next) setRecords(next) })}><FileUp/> Choose CSV</button>
      <button disabled={busy || !records.length} onClick={() => run(async () => { const next = await window.graduation.match(); if (next) setRecords(next) })}><FolderOpen/> Match photo folder</button>
    </div>
    {records.length > 0 && <>
      <p>{records.length} records · {records.filter(student => student.matched).length} photos matched</p>
      <div className="table-wrap"><table><thead><tr><th scope="col">Student</th><th scope="col">ID</th><th scope="col">Department</th><th scope="col">Class</th><th scope="col">Photo</th></tr></thead>
        <tbody>{records.map(student => <tr key={student.id}><td>{student.name}</td><td>{student.studentId}</td><td>{student.department}</td><td>{student.graduationYear}</td><td>{student.matched ? 'Matched' : 'Placeholder'}</td></tr>)}</tbody>
      </table></div>
      <button className="primary" disabled={busy} onClick={() => run(async () => {
        const next = await window.graduation.saveImport()
        setRecords([])
        setMessage('Collection saved.')
        onSave(next)
      })}><Save/> Replace gallery with this collection</button>
    </>}
    <p role="status">{busy ? 'Working…' : message}</p>
  </section>
}

export function Preferences({ settings, years, onSave }: { settings: Settings; years: string[]; onSave: (settings: Settings) => void }) {
  const [draft, setDraft] = useState(settings)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft(old => ({ ...old, [key]: value }))
    setMessage('')
  }
  async function run(action: () => Promise<void>) {
    setBusy(true)
    try { await action() }
    catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }
  return <section className="panel">
    <p className="eyebrow">PRESENTATION</p><h1>Settings</h1>
    <form onSubmit={event => { event.preventDefault(); void run(async () => {
      const saved = await window.graduation.saveSettings(draft)
      setDraft(saved)
      onSave(saved)
      setMessage('Settings saved.')
    }) }}>
      <fieldset disabled={busy} className="fields">
        <label>University name<input required maxLength={100} value={draft.university} onChange={event => update('university', event.target.value)}/></label>
        <label>Default graduation year<select value={draft.year} onChange={event => update('year', event.target.value)}><option value="">All classes</option>{Array.from(new Set([...years, ...(draft.year ? [draft.year] : [])])).sort().reverse().map(year => <option key={year}>{year}</option>)}</select></label>
        <label>Gallery columns on wide screens<select value={draft.columns} onChange={event => update('columns', Number(event.target.value))}>{[8, 10, 12].map(count => <option key={count}>{count}</option>)}</select></label>
        <label>Slideshow interval<select value={draft.interval} onChange={event => update('interval', Number(event.target.value))}>{[5, 10, 15].map(seconds => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>
        <label className="check"><input type="checkbox" checked={draft.animations} onChange={event => update('animations', event.target.checked)}/> Enable animations</label>
        <label className="check"><input type="checkbox" checked={draft.fullscreen} onChange={event => update('fullscreen', event.target.checked)}/> Start in fullscreen</label>
        <div className="actions">
          {draft.logo && <img className="logo-preview" src={draft.logo} alt="University logo preview"/>}
          <button type="button" onClick={() => run(async () => { const logo = await window.graduation.pickLogo(); if (logo) update('logo', logo) })}><ImagePlus/> Choose logo</button>
          {draft.logo && <button type="button" onClick={() => update('logo', '')}>Remove logo</button>}
        </div>
      </fieldset>
      <div className="actions">
        <button className="primary" disabled={busy}><Save/> Save settings</button>
        <button type="button" onClick={() => run(() => window.graduation.kiosk())}><Monitor/> Toggle kiosk mode</button>
      </div>
      <p className="muted">Press Ctrl+Shift+K to leave kiosk mode.</p><p role="status">{message}</p>
    </form>
  </section>
}
