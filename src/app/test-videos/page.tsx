'use client'

export default function TestVideos() {
  const videos = [
    "/videos/hero/austin-skyline-timelapse.mp4",
    "/videos/hero/austin-nightlife-cinematic.mp4", 
    "/videos/hero/austin-music-festival.mp4",
    "/videos/backgrounds/bachelor-party-6th-street.mp4",
    "/videos/backgrounds/bachelorette-party-glamorous.mp4"
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Video Test Page</h1>
      <div className="space-y-8">
        {videos.map((video, index) => (
          <div key={index} className="border p-4 rounded-lg">
            <p className="mb-2 font-mono text-sm">{video}</p>
            <video 
              src={video}
              controls
              className="w-full max-w-2xl"
              onError={(e) => {
                console.error(`Video failed to load: ${video}`, e)
              }}
              onLoadedData={() => {
                console.log(`Video loaded successfully: ${video}`)
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ))}
      </div>
    </div>
  )
}