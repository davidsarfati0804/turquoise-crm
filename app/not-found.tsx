import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-turquoise-200">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mt-4">Page introuvable</h2>
        <p className="text-gray-500 mt-2 mb-8">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-6 py-3 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors"
        >
          ← Retour au dashboard
        </Link>
      </div>
    </div>
  )
}
