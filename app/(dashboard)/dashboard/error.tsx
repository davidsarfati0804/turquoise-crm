'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Une erreur est survenue</h2>
        <p className="text-gray-500 mb-6">
          {error.message || 'Impossible de charger cette page.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center px-6 py-3 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
