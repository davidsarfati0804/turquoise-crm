export default function PaiementsLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
              <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-0">
            <div className="h-4 w-24 bg-turquoise-100 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-24 bg-blue-100 rounded-full animate-pulse" />
            <div className="h-5 w-20 bg-green-100 rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
