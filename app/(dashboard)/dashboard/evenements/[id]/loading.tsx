export default function EventDetailLoading() {
  return (
    <div className="p-8">
      {/* Retour */}
      <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-6" />

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-gray-100 rounded-lg animate-pulse" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4">
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-7 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-4 flex space-x-1 overflow-x-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 w-24 bg-gray-100 rounded animate-pulse my-2 flex-shrink-0" />
          ))}
        </div>
        <div className="p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-0">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-16 bg-teal-100 rounded-full animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
