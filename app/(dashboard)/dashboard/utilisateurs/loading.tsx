export default function UtilisateursLoading() {
  return (
    <div className="p-8">
      <div className="h-8 w-44 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mb-8" />
      <div className="bg-white rounded-lg shadow">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 px-6 py-4 border-b border-gray-100 last:border-0">
            <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-36 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-5 w-16 bg-teal-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
