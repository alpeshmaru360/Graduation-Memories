export interface Student {
  id: number
  studentId: string
  name: string
  degree: string
  department: string
  graduationYear: number
  honors?: string
  university?: string
  photo?: string
  thumbnail?: string
}
export interface Settings {
  university: string
  year: string
  columns: number
  animations: boolean
  interval: number
  fullscreen: boolean
  logo: string
}
export type Preview = Student & { matched: boolean }
declare global {
  interface Window {
    graduation: {
      load(): Promise<{students: Student[]; settings: Settings}>
      preview(): Promise<Preview[] | null>
      match(): Promise<Preview[] | null>
      saveImport(): Promise<Student[]>
      pickLogo(): Promise<string | null>
      saveSettings(settings: Settings): Promise<Settings>
      fullscreen(): Promise<void>
      kiosk(): Promise<void>
    }
  }
}
