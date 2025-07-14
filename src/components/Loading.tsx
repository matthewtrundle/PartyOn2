interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'gold' | 'navy' | 'white'
  fullScreen?: boolean
}

export default function Loading({
  size = 'md',
  color = 'gold',
  fullScreen = false
}: LoadingProps) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const colors = {
    gold: 'bg-gold-500',
    navy: 'bg-navy-500',
    white: 'bg-white'
  }

  const LoadingDots = () => (
    <div className="loading-dots">
      <span className={`${sizes[size]} ${colors[color]} rounded-full opacity-75`} />
      <span className={`${sizes[size]} ${colors[color]} rounded-full`} />
      <span className={`${sizes[size]} ${colors[color]} rounded-full opacity-75`} />
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/95 flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <LoadingDots />
          <p className="font-sans text-navy-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return <LoadingDots />
}