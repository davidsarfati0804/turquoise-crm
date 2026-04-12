'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2, Brain, FileText, Trash2 } from 'lucide-react'

interface ImportResult {
  clientName: string
  imported: number
  messages: number
  fileName: string
  status: 'success' | 'error'
  error?: string
}

export default function IATrainingPage() {
  const [results, setResults] = useState<ImportResult[]>([])
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const importFile = async (file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/whatsapp/import-training', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok || data.error) {
      return { clientName: file.name, imported: 0, messages: 0, fileName: file.name, status: 'error', error: data.error }
    }
    return { clientName: data.clientName, imported: data.imported, messages: data.messages, fileName: file.name, status: 'success' }
  }

  const handleFiles = async (files: FileList | File[]) => {
    const zips = Array.from(files).filter(f => f.name.endsWith('.zip'))
    if (!zips.length) return
    setImporting(true)
    const newResults: ImportResult[] = []
    for (const file of zips) {
      const result = await importFile(file)
      newResults.push(result)
      setResults(prev => [...prev, result])
    }
    setImporting(false)
  }

  const totalImported = results.filter(r => r.status === 'success').reduce((s, r) => s + r.imported, 0)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-7 h-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">Entraînement de l'IA WhatsApp</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Importe tes conversations WhatsApp exportées (.zip) pour apprendre à l'IA ton style de communication.
          Elle utilisera ces exemples pour suggérer des réponses adaptées à tes clients.
        </p>
      </div>

      {/* Zone de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        {importing ? (
          <div className="flex flex-col items-center gap-3 text-teal-600">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="font-medium">Import en cours...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Upload className="w-10 h-10" />
            <div>
              <p className="font-semibold text-gray-600">Glisse tes ZIP ici ou clique pour choisir</p>
              <p className="text-sm mt-1">Plusieurs fichiers acceptés · Format export WhatsApp standard</p>
            </div>
          </div>
        )}
      </div>

      {/* Comment exporter */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 mb-1">Comment exporter depuis WhatsApp</p>
        <p className="text-xs text-blue-600">
          Ouvre une conversation → ⋮ → Plus → Exporter la discussion → <strong>Sans médias</strong> → envoie le ZIP ici
        </p>
      </div>

      {/* Résultats */}
      {results.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Résultats d'import</h2>
            {totalImported > 0 && (
              <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                {totalImported} exemples injectés dans l'IA
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${
                r.status === 'success' ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'
              }`}>
                {r.status === 'success'
                  ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{r.clientName}</p>
                  {r.status === 'success' ? (
                    <p className="text-xs text-gray-500">{r.messages} messages analysés → <strong>{r.imported} exemples</strong> injectés</p>
                  ) : (
                    <p className="text-xs text-red-600">{r.error}</p>
                  )}
                </div>
                <FileText className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>

          {totalImported > 0 && (
            <div className="mt-6 bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
              <Brain className="w-6 h-6 text-teal-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-teal-800">L'IA est prête !</p>
              <p className="text-xs text-teal-600 mt-1">
                Elle utilisera ces exemples dès la prochaine suggestion dans l'inbox WhatsApp.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
