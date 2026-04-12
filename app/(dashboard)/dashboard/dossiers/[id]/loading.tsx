export default function DossierDetailLoading() {
  return (
    <div className="p-8">
      {/* Retour */}
      <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-6" />

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="h-8 w-56 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-32 bg-teal-100 rounded-full animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-gray-100 rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center space-x-3">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-full bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
