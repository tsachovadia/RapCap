export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full bg-spotify-dark">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-spotify-gray-700 border-t-spotify-green rounded-full animate-spin" />
        <span className="text-spotify-gray-400 text-sm">RapCap</span>
      </div>
    </div>
  )
}
