import React from 'react'
import { SEED } from '../data/seed.js'

export const PERSON_COLORS = {
  maya: 'bg-rose-500', jordan: 'bg-sky-600', sam: 'bg-emerald-600', dana: 'bg-amber-500',
  alex: 'bg-violet-500', riley: 'bg-teal-500', leo: 'bg-slate-500', ansel: 'bg-ansel',
}

export const personName = (id) => SEED.people.find((p) => p.id === id)?.name ?? id
export const firstName = (id) => personName(id).split(' ')[0]

export function fmtClock(sec, withSeconds = false) {
  const h = Math.floor(sec / 3600) % 24
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${String(m).padStart(2, '0')}${withSeconds ? `:${String(s).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}
export const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

export function Avatar({ id, size = 'md', label }) {
  const name = id === 'ansel' ? 'Ansel' : personName(id)
  const initials = id === 'ansel' ? 'A' : name.split(' ').map((x) => x[0]).join('')
  const sz = { xs: 'h-5 w-5 text-[9px]', sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-16 w-16 text-xl' }[size]
  return (
    <span title={label ?? name} className={`${PERSON_COLORS[id] || 'bg-slate-400'} ${sz} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-slate-900`}>
      {initials}
    </span>
  )
}

export function Btn({ children, variant = 'secondary', className = '', ...p }) {
  const v = {
    primary: 'bg-ansel text-white hover:bg-ansel-700 dark:bg-ansel-400 dark:text-slate-950 dark:hover:bg-ansel-300',
    secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  }[variant]
  return <button className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${v} ${className}`} {...p}>{children}</button>
}

export function Ts({ t, onClick, className = '' }) {
  return (
    <button onClick={onClick} title={`Jump to ${t} in the transcript`}
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs text-ansel hover:bg-ansel-50 dark:text-ansel-300 dark:hover:bg-slate-800 ${className}`}>
      <span aria-hidden>▶</span>{t}
    </button>
  )
}

export function Modal({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`slidein w-full ${wide ? 'max-w-5xl' : 'max-w-md'} rounded-xl bg-white shadow-2xl dark:bg-slate-900`}>
        {children}
      </div>
    </div>
  )
}

export function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}>{children}</span>
}

export function NotInPrototype() {
  return <p className="mt-6 rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">Not part of this prototype.</p>
}
