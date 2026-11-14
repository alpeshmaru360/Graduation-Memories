import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, ChevronLeft, Database, GraduationCap, Maximize, Pause, Play, Search, Settings2, Sparkles, X } from 'lucide-react'
import { Admin, Preferences } from './Management'
import type { Settings, Student } from './types'

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('')
const asset = (path: string | undefined) => path && (path.startsWith('/assets/') || path.startsWith('/media/')) ? path : undefined

function Portrait({ student, thumbnail = false }: { student: Student; thumbnail?: boolean }) {
  const src = asset(thumbnail ? student.thumbnail || student.photo : student.photo)
  const [failed, setFailed] = useState<string>()
  return <div className="portrait" style={{ '--hue': (student.id * 31 + 172) % 360 } as CSSProperties}>
    <div className="portrait-fallback"><GraduationCap/><span>{initials(student.name)}</span><small>{student.name}</small></div>
    {src && src !== failed && <img src={src} alt="" loading={thumbnail ? 'lazy' : 'eager'} decoding="async" onError={() => setFailed(src)}/>}
  </div>
}

const Tile = memo(function Tile({ student, selected, open }: { student: Student; selected: boolean; open: (id: number) => void }) {
  return <button type="button" className={'tile' + (selected ? ' selected' : '')} data-student={student.id} onClick={() => open(student.id)} aria-label={'View ' + student.name}>
    <Portrait student={student} thumbnail/>
    <span className="tile-name">{student.name}</span>
  </button>
})

export default function App() {
  const [students, setStudents] = useState<Student[]>([])
  const [settings, setSettings] = useState<Settings>()
  const [error, setError] = useState('')
  const [screen, setScreen] = useState<'gallery' | 'admin' | 'settings'>('gallery')
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [year, setYear] = useState('')
  const [search, setSearch] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [ripple, setRipple] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const reducedMotion = useReducedMotion()
  const animate = !!settings?.animations && !reducedMotion
  const profileHeading = useRef<HTMLHeadingElement>(null)
  const galleryTitle = useRef<HTMLHeadingElement>(null)
  const lastTile = useRef<number | null>(null)
  const openingTimer = useRef<number>(0)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    window.graduation.load().then(data => {
      setStudents(data.students)
      setSettings(data.settings)
      setYear(data.students.some(student => String(student.graduationYear) === data.settings.year) ? data.settings.year : '')
    }).catch(reason => setError(String(reason)))
    return () => window.clearTimeout(openingTimer.current)
  }, [])

  const years = useMemo(() => Array.from(new Set(students.map(student => String(student.graduationYear)))).sort().reverse(), [students])
  const departments = useMemo(() => Array.from(new Set(students.map(student => student.department))).sort(), [students])
  const visible = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/)
    return students.filter(student => {
      const searchable = [student.name, student.studentId, student.department, student.graduationYear].join(' ').toLowerCase()
      return (!year || String(student.graduationYear) === year) && (!department || student.department === department) && terms.every(term => searchable.includes(term))
    })
  }, [students, year, department, query])
  const index = visible.findIndex(student => student.id === selected)
  const current = visible[index]

  const step = useCallback((direction: number) => {
    if (visible.length) setSelected(id => visible[(visible.findIndex(student => student.id === id) + direction + visible.length) % visible.length].id)
  }, [visible])

  const open = useCallback((id: number) => {
    window.clearTimeout(openingTimer.current)
    lastTile.current = id
    if (!animate) { setSelected(id); return }
    setRipple(id)
    openingTimer.current = window.setTimeout(() => { setSelected(id); setRipple(null) }, 155)
  }, [animate])

  const back = useCallback(() => {
    window.clearTimeout(openingTimer.current)
    setRipple(null)
    setSelected(null)
    setPlaying(false)
    setScreen('gallery')
    requestAnimationFrame(() => {
      const tile = document.querySelector<HTMLButtonElement>('[data-student="' + lastTile.current + '"]')
      ;(tile ?? galleryTitle.current)?.focus({ preventScroll: true })
    })
  }, [])

  useEffect(() => {
    if (!playing || selected === null) return
    const timer = window.setTimeout(() => step(1), (settings?.interval ?? 5) * 1000)
    return () => window.clearTimeout(timer)
  }, [playing, selected, settings?.interval, step])
  const profileOpen = current !== undefined
  useEffect(() => { if (profileOpen) profileHeading.current?.focus({ preventScroll: true }) }, [profileOpen])
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape' && (profileOpen || screen !== 'gallery' || ripple !== null)) back()
      if (profileOpen && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault()
        step(event.key === 'ArrowRight' ? 1 : -1)
      }
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [back, profileOpen, ripple, screen, step])

  if (!settings) return <main className="loading" role="status">{error || 'Opening Graduation Memories…'}</main>
  function navigate(next: 'admin' | 'settings') {
    back()
    lastTile.current = null
    setScreen(next)
  }
  return <div className={'app' + (!animate ? ' no-motion' : '')}>
    <header className="topbar">
      <button className="brand" onClick={back} aria-label="Graduation Memories home">
        <span className="crest">{settings.logo ? <img src={settings.logo} alt=""/> : <GraduationCap/>}</span>
        <span><strong>{settings.university}</strong><small>GRADUATION MEMORIES</small></span>
      </button>
      <div className="toolbar">
        {screen === 'gallery' && !current && <button className="icon-button" aria-label={search ? 'Hide search and filters' : 'Show search and filters'} aria-expanded={search} onClick={() => setSearch(value => !value)}><Search/></button>}
        <button className="icon-button" aria-label="Data management" title="Data management" onClick={() => navigate('admin')}><Database/></button>
        <button className="icon-button" aria-label="Settings" title="Settings" onClick={() => navigate('settings')}><Settings2/></button>
        <button className="icon-button" aria-label="Toggle fullscreen" title="Fullscreen (F11)" onClick={() => void window.graduation.fullscreen()}><Maximize/></button>
      </div>
    </header>

    {screen === 'gallery' && <main className="gallery-scroll" hidden={profileOpen}>
      <section className="gallery">
        <div className="gallery-heading">
          <div><p className="eyebrow"><span/> {year ? 'CLASS OF ' + year : 'THE GRADUATION COLLECTION'}</p><h1 ref={galleryTitle} tabIndex={-1}>Graduation <em>Memories</em></h1></div>
          <div className="gallery-actions">
            <select aria-label="Graduation year" value={year} onChange={event => setYear(event.target.value)}><option value="">All classes</option>{years.map(value => <option key={value}>{value}</option>)}</select>
            <button className="primary" disabled={!visible.length} onClick={() => { open(visible[0].id); setPlaying(true) }}><Play/> Slideshow</button>
          </div>
        </div>
        {search && <div className="filters">
          <label className="search-box"><Search/><input autoFocus aria-label="Search students" placeholder="Search name, ID, department, or year" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button className="plain" aria-label="Clear search" onClick={() => setQuery('')}><X/></button>}</label>
          <select aria-label="Department" value={department} onChange={event => setDepartment(event.target.value)}><option value="">All departments</option>{departments.map(value => <option key={value}>{value}</option>)}</select>
        </div>}
        <div className="wall-label"><span>THE PHOTO WALL</span><span aria-live="polite">{visible.length} {visible.length === 1 ? 'GRADUATE' : 'GRADUATES'}</span></div>
        {visible.length ? <div className="photo-grid" style={{ '--columns': settings.columns } as CSSProperties}>{visible.map(student => <Tile key={student.id} student={student} selected={ripple === student.id} open={open}/>)}</div>
          : <div className="empty"><p>No students match these filters.</p><button onClick={() => { setQuery(''); setYear(''); setDepartment('') }}>Clear filters</button></div>}
        <footer><span>{settings.university}</span><span>Select a portrait to view the graduate</span></footer>
      </section>
    </main>}

    <AnimatePresence>
      {current && screen === 'gallery' && <motion.main className="profile" initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: animate ? .32 : 0 }}>
        <div className="profile-top"><button onClick={back}><ArrowLeft/> Back to gallery</button><span>{index + 1} / {visible.length}</span></div>
        <div className="profile-body" onTouchStart={event => { swipe.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={event => {
          const start = swipe.current
          swipe.current = null
          if (!start) return
          const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1)
        }}>
          <motion.div className="profile-content" key={current.id} initial={animate ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: animate ? .42 : 0 }}>
            <motion.div className="photo-frame" initial={animate ? { scale: .91 } : false} animate={{ scale: 1 }} transition={{ duration: animate ? .5 : 0 }}><Portrait student={current}/><i/><i/><i/><i/></motion.div>
            <motion.div className="bio" initial={animate ? { opacity: 0, x: 16 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: animate ? .36 : 0, delay: animate ? .1 : 0 }}>
              <p className="eyebrow"><Sparkles/> CLASS OF {current.graduationYear}</p>
              <h1 ref={profileHeading} tabIndex={-1} aria-live="polite">{current.name}</h1>
              <div className="gold-rule"/>
              <p className="degree">{current.degree}</p><p className="department">{current.department}</p>
              {current.honors && <p className="honors"><Sparkles/> {current.honors}</p>}
              <p className="profile-university">{current.university || settings.university}</p>
              <small>{current.studentId}</small>
            </motion.div>
          </motion.div>
        </div>
        <div className="profile-controls"><button onClick={() => step(-1)} disabled={visible.length < 2}><ChevronLeft/> Previous</button>
          <button className="icon-button" title={playing ? 'Pause slideshow' : 'Play slideshow'} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} onClick={() => setPlaying(value => !value)}>{playing ? <Pause/> : <Play/>}</button>
          <button onClick={() => step(1)} disabled={visible.length < 2}>Next <ArrowRight/></button></div>
      </motion.main>}
    </AnimatePresence>

    {screen !== 'gallery' && <main className="management">
      <button onClick={back}><ArrowLeft/> Back to gallery</button>
      {screen === 'admin' ? <Admin onSave={data => { setStudents(data); setYear(''); setQuery(''); setDepartment('') }}/>
        : <Preferences settings={settings} years={years} onSave={value => { setSettings(value); setYear(value.year) }}/>}
    </main>}
  </div>
}
