export default function NouveauLeadLoading() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="h-5 w-24 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
        <div className="h-10 w-32 bg-teal-200 rounded-lg animate-pulse mt-4" />
      </div>
    </div>
  )
}
