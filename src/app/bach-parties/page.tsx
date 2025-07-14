'use client'

import { useState } from 'react'

type PartyMode = 'normal' | 'bachelor' | 'bachelorette'

export default function BachPartiesPage() {
  const [mode] = useState<PartyMode>('normal')

  return (
    <div className="min-h-screen">
      <h1>Bach Parties - Coming Soon</h1>
      <p>Current Mode: {mode}</p>
      <p>This page is being rebuilt. Please check back soon!</p>
    </div>
  )
}