'use client'

import { memo, useState, useRef, useEffect } from 'react'

interface ExperienceSelectorProps<T extends string> {
  modes: T[]
  currentMode: T
  onModeChange: (mode: T) => void
  modeLabels: Record<T, string>
  modeColors: Record<T, string>
  isNavScrolled?: boolean
}

function ExperienceSelector<T extends string>({
  modes,
  currentMode,
  onModeChange,
  modeLabels,
  modeColors,
  isNavScrolled = false
}: ExperienceSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener(&apos;mousedown', handleClickOutside)
    return () => document.removeEventListener(&apos;mousedown', handleClickOutside)
  }, [])
  
  return (
    <div className="fixed top-24 left-6 md:left-8 lg:left-12 z-50" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
          isNavScrolled 
            ? 'bg-gray-100 border border-gray-200 hover:bg-gray-200' 
            : 'bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20'
        }`}
      >
        <span className={`text-sm font-medium ${isNavScrolled ? 'text-gray-700' : 'text-white'}`}>Vibe: {modeLabels[currentMode]}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isNavScrolled ? 'text-gray-700' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 bg-white/95 backdrop-blur-md border border-white/20 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2 bg-black/5 border-b border-black/10">
            <p className="text-xs font-medium text-gray-700">What&apos;s your vibe?</p>
          </div>
          <div className="p-1">
            {modes.map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  onModeChange(mode)
                  setIsOpen(false)
                }}
                className={`relative w-full px-3 py-2 text-left rounded text-sm font-medium transition-all duration-200 ${
                  currentMode === mode 
                    ? `${modeColors[mode]} text-white` 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {modeLabels[mode]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(ExperienceSelector) as typeof ExperienceSelector