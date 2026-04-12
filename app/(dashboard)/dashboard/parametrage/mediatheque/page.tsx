'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Loader2, Image as ImageIcon, Video, FileText, FolderOpen, Plus } from 'lucide-react'

interface MediaFile {
  name: string
  path: string
  url: string
  type: string
  size?: number
}

const FOLDERS = ['general', 'chambres', 'videos', 'documents']

export default function MediathequePage() {
  const [folder, setFolder] = useState('general')
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (f = folder) => {
    setLoading(true)
    const res = await fetch(`/api/whatsapp/media-library?folder=${encodeURIComponent(f)}`)
    const data = await res.json()
    setFiles(data.files ?? [])
    setLoading(false)
  }

  useEffect(() => { load(folder) }, [folder])

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', folder)
      await fetch('/api/whatsapp/media-library', { method: 'POST', body: form })
    }
    await load(folder)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDelete = async (path: string) => {
    if (!confirm('Supprimer ce fichier ?')) return
    setDeleting(path)
    await fetch(`/api/whatsapp/media-library?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    setFiles(prev => prev.filter(f => f.path !== path))
    setDeleting(null)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-teal-600" /> Médiathèque
        </h1>
        <p className="text-sm text-gray-500 mt-1">Photos et vidéos à envoyer directement depuis l'inbox WhatsApp</p>
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

      {/* Upload */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 hover:border-teal-300 rounded-xl p-6 mb-6 text-center cursor-pointer transition-colors"
      >
        <input ref={inputRef} type="file" multiple accept="image/*,video/*,.pdf" className="hidden"
          onChange={e => handleUpload(e.target.files)} />
        {uploading
          ? <div className="flex items-center justify-center gap-2 text-teal-600"><Loader2 className="w-5 h-5 animate-spin" /> Upload en cours...</div>
          : <div className="flex items-center justify-center gap-2 text-gray-400"><Upload className="w-5 h-5" /> <span className="text-sm">Glisse des fichiers ou clique pour uploader dans <strong>{folder}</strong></span></div>
        }
      </div>

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
                </div>
              ) : f.type === 'document' ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <span className="text-[10px] text-gray-500 px-2 truncate w-full text-center">{f.name}</span>
                </div>
              ) : (
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
              )}
              {/* Hover overlay */}
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
