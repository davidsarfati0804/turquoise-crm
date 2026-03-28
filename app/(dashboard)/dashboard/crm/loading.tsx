export default function CRMLoading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="flex space-x-2">
          <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="flex space-x-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-80 bg-gray-50 rounded-lg border-2 border-gray-200 min-h-[400px]">
            <div className="p-4 bg-white rounded-t-lg border-b">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="p-3 space-y-3">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="bg-white rounded-lg shadow border p-4">
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-3" />
                  <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
