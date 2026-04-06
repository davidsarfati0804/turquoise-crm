'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Une erreur est survenue</h1>
        <p className="text-gray-700 mb-6">
          {error.message || 'Quelque chose s\'est mal passé. Veuillez réessayer.'}
        </p>
        <button
          onClick={() => reset()}
          className="bg-turquoise-600 hover:bg-turquoise-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
