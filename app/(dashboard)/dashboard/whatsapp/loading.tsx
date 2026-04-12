export default function WhatsAppLoading() {
  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Liste conversations */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="h-9 w-full bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-3 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Zone message */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-300 text-sm">Sélectionnez une conversation</div>
        </div>
      </div>
    </div>
  )
}
