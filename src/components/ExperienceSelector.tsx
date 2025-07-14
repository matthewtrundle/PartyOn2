'use client'

import { useState, memo } from 'react'

interface ExperienceSelectorProps<T extends string> {
  modes: T[]
  currentMode: T
  onModeChange: (mode: T) => void
  modeLabels: Record<T, string>
  modeColors: Record<T, string>
  label: string
}

function ExperienceSelector<T extends string>({
  modes,
  currentMode,
  onModeChange,
  modeLabels,
  modeColors,
  label
}: ExperienceSelectorProps<T>) {
  return (
    <div className="fixed top-20 right-4 z-50 group">
      <div className="bg-black/20 backdrop-blur-sm border border-white/30 rounded-2xl p-2 shadow-2xl">
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-lg">
          {modes.map((mode) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`relative px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                currentMode === mode 
                  ? `${modeColors[mode]} text-white shadow-lg transform scale-105` 
                  : 'text-neutral-700 hover:bg-neutral-100 hover:scale-105'
              }`}
            >
              {currentMode === mode && (
                <div className={`absolute inset-0 ${modeColors[mode]} rounded-lg blur opacity-50 -z-10`}></div>
              )}
              {modeLabels[mode]}
            </button>
          ))}
        </div>
        <div className="text-center mt-1">
          <p className="text-xs font-medium text-white/80 tracking-wide">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default memo(ExperienceSelector) as typeof ExperienceSelector