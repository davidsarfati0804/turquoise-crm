'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Loader2, Image as ImageIcon, Video, FileText, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MediaFile {
  name: string
  path: string
  url: string
  type: string
  size?: number
}

const BUCKET = 'media-library'
const FOLDERS = ['general', 'chambres', 'videos', 'documents']
const MAX_SIZE_MB = 100

export default function MediathequePage() {
  const [folder, setFolder] = useState('general')
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const load = async (f = folder) => {
    setLoading(true)
    const res = await fetch(`/api/whatsapp/media-library?folder=${encodeURIComponent(f)}`)
    const data = await res.json()
    setFiles(data.files ?? [])
    setLoading(false)
  }

  useEffect(() => { load(folder) }, [folder])

  // Upload direct vers Supabase Storage depuis le navigateur (bypass limite 4MB Next.js)
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    setError(null)
    setUploading(true)

    for (const file of Array.from(fileList)) {
      const sizeMB = file.size / 1024 / 1024
      if (sizeMB > MAX_SIZE_MB) {
        setError(`${file.name} dépasse ${MAX_SIZE_MB}MB`)
        continue
      }

      setUploadProgress(`${file.name} (${sizeMB.toFixed(1)} Mo)…`)

      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const path = `${folder}/${safeName}`

      // Upload direct depuis le navigateur — pas de limite Next.js
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        setError(`Erreur upload : ${uploadError.message}`)
      }
    }

    setUploadProgress(null)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    await load(folder)
  }

  const handleDelete = async (path: string) => {
    if (!confirm('Supprimer ce fichier ?')) return
    setDeleting(path)
    await fetch(`/api/whatsapp/media-library?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    setFiles(prev => prev.filter(f => f.path !== path))
    setDeleting(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleUpload(e.dataTransfer.files)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-teal-600" /> Médiathèque
        </h1>
        <p className="text-sm text-gray-500 mt-1">Photos, vidéos et documents à envoyer depuis l'inbox WhatsApp (jusqu'à {MAX_SIZE_MB} Mo)</p>
      </div>

      {/* Dossiers */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FOLDERS.map(f => (
          <button key={f} onClick={() => setFolder(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${folder === f ? 'bg-teal-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            {f === 'videos' ? '🎬' : f === 'chambres' ? '🛏️' : f === 'documents' ? '📄' : '📁'} {f}
          </button>
        ))}
      </div>

      {/* Zone d'upload */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 hover:border-teal-300 rounded-xl p-6 mb-4 text-center cursor-pointer transition-colors"
      >
        <input ref={inputRef} type="file" multiple accept="image/*,video/*,.pdf,.mp4,.mov,.avi,.webm"
          className="hidden" onChange={e => handleUpload(e.target.files)} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-teal-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{uploadProgress || 'Upload en cours…'}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Upload className="w-5 h-5" />
            <span className="text-sm">Glisse ou clique — dossier : <strong>{folder}</strong></span>
            <span className="text-xs text-gray-300">Images, vidéos MP4, PDF · max {MAX_SIZE_MB} Mo</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Grille */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Dossier vide</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map(f => (
            <div key={f.path} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
              {f.type === 'video' ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-800">
                  <Video className="w-8 h-8 text-white" />
                  <span className="text-[10px] text-gray-300 px-2 truncate w-full text-center">{f.name}</span>
                  {f.size && <span className="text-[9px] text-gray-500">{(f.size / 1024 / 1024).toFixed(1)} Mo</span>}
                </div>
              ) : f.type === 'document' ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <span className="text-[10px] text-gray-500 px-2 truncate w-full text-center">{f.name}</span>
                </div>
              ) : (
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button
                  onClick={() => handleDelete(f.path)}
                  disabled={deleting === f.path}
                  className="opacity-0 group-hover:opacity-100 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all"
                >
                  {deleting === f.path ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white truncate">{f.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
