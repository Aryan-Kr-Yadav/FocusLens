'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('fl_theme') as Theme | null
    const initial = stored || 'dark'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  const toggle = () => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('fl_theme', next)
      applyTheme(next)
      return next
    })
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

function applyTheme(theme: Theme) {
  const r = document.documentElement
  if (theme === 'light') {
    r.style.setProperty('--void',     '#f0f2f8')
    r.style.setProperty('--space',    '#e8eaf4')
    r.style.setProperty('--deep',     '#dde0f0')
    r.style.setProperty('--panel',    '#ffffff')
    r.style.setProperty('--panel2',   '#f4f5fc')
    r.style.setProperty('--panel3',   '#eceef8')
    r.style.setProperty('--neon',     '#059669')
    r.style.setProperty('--neon-d',   '#047857')
    r.style.setProperty('--plasma',   '#6d28d9')
    r.style.setProperty('--plasma-l', '#7c3aed')
    r.style.setProperty('--star',     '#0284c7')
    r.style.setProperty('--pulsar',   '#e11d48')
    r.style.setProperty('--amber',    '#d97706')
    r.style.setProperty('--white',    '#111827')
    r.style.setProperty('--text',     '#374151')
    r.style.setProperty('--muted',    '#9ca3af')
    r.style.setProperty('--dim',      '#d1d5db')
    r.style.setProperty('--border',   'rgba(109,40,217,0.15)')
    r.style.setProperty('--border2',  'rgba(109,40,217,0.28)')
    r.style.setProperty('--border3',  'rgba(5,150,105,0.25)')
    r.style.setProperty('--glow-green',  '0 0 10px rgba(5,150,105,0.15)')
    r.style.setProperty('--glow-violet', '0 0 10px rgba(109,40,217,0.15)')
    r.style.setProperty('--glow-blue',   '0 0 10px rgba(2,132,199,0.15)')
    document.body.style.background = '#f0f2f8'
    document.body.style.color = '#374151'
    document.body.setAttribute('data-theme', 'light')
  } else {
    r.style.setProperty('--void',     '#02030a')
    r.style.setProperty('--space',    '#06080f')
    r.style.setProperty('--deep',     '#0a0d18')
    r.style.setProperty('--panel',    '#0e1120')
    r.style.setProperty('--panel2',   '#131628')
    r.style.setProperty('--panel3',   '#191e32')
    r.style.setProperty('--neon',     '#39ff9c')
    r.style.setProperty('--neon-d',   '#00c864')
    r.style.setProperty('--plasma',   '#7c3aff')
    r.style.setProperty('--plasma-l', '#a855f7')
    r.style.setProperty('--star',     '#00d4ff')
    r.style.setProperty('--pulsar',   '#ff3d8a')
    r.style.setProperty('--amber',    '#ffb020')
    r.style.setProperty('--white',    '#eef2ff')
    r.style.setProperty('--text',     '#94a3c0')
    r.style.setProperty('--muted',    '#3d4666')
    r.style.setProperty('--dim',      '#252a42')
    r.style.setProperty('--border',   'rgba(124,58,255,0.12)')
    r.style.setProperty('--border2',  'rgba(124,58,255,0.25)')
    r.style.setProperty('--border3',  'rgba(57,255,156,0.2)')
    r.style.setProperty('--glow-green',  '0 0 20px rgba(57,255,156,0.35),0 0 60px rgba(57,255,156,0.1)')
    r.style.setProperty('--glow-violet', '0 0 20px rgba(124,58,255,0.4),0 0 60px rgba(124,58,255,0.15)')
    r.style.setProperty('--glow-blue',   '0 0 20px rgba(0,212,255,0.35)')
    document.body.style.background = '#02030a'
    document.body.style.color = '#94a3c0'
    document.body.setAttribute('data-theme', 'dark')
  }
}
