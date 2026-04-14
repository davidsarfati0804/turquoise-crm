'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react'

interface Template {
  id: string
  name: string
  category: string
  content: string
}

const CATEGORIES = ['invitation', 'devis', 'relance', 'confirmation', 'general']
const VARIABLES = [
  { key: '{{nom_maries}}', desc: 'Nom des mariés / événement' },
  { key: '{{date_debut}}', desc: 'Date d\'arrivée' },
  { key: '{{date_fin}}', desc: 'Date de départ' },
  { key: '{{date_ceremonie}}', desc: 'Date de cérémonie' },
  { key: '{{mois_sejour}}', desc: 'Mois du séjour (ex: Février 2026)' },
  { key: '{{composition}}', desc: 'Composition (ex: 2 adultes et 1 enfant)' },
  { key: '{{type_chambre}}', desc: 'Chambre sélectionnée du dossier' },
  { key: '{{prix_nuit}}', desc: 'Prix/nuit de la chambre principale' },
  { key: '{{liste_chambres}}', desc: 'Liste complète des chambres avec prix' },
  { key: '{{options_chambres}}', desc: 'Options d\'upgrades avec supplément' },
  { key: '{{surface_chambre}}', desc: 'Surface en m² de la chambre sélectionnée' },
  { key: '{{prix_total}}', desc: 'Montant total du dossier (quoted_price)' },
  { key: '{{nom_agent}}', desc: 'Nom de l\'agent (Aurélia)' },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Template> | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/whatsapp/templates')
    const data = await res.json()
    setTemplates(data.templates ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!editing?.name || !editing?.content) return
    setSaving(true)
    await fetch('/api/whatsapp/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    await load()
    setEditing(null)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce template ?')) return
    setDeleting(id)
    await fetch(`/api/whatsapp/templates?id=${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  const insertVar = (key: string) => {
    setEditing(prev => ({ ...prev, content: (prev?.content || '') + key }))
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-500" /> Templates WhatsApp
          </h1>
          <p className="text-sm text-gray-500 mt-1">Messages pré-rédigés avec variables auto-remplies depuis le dossier client</p>
        </div>
        <button onClick={() => setEditing({ name: '', category: 'general', content: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nouveau template
        </button>
      </div>

      {/* Variables disponibles */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-orange-700 mb-2">Variables disponibles (auto-remplies depuis le dossier lié) :</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map(v => (
            <span key={v.key} className="text-[11px] bg-white border border-orange-200 text-orange-700 px-2 py-1 rounded-md font-mono" title={v.desc}>
              {v.key} <span className="text-gray-400 font-sans">— {v.desc}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Éditeur */}
      {editing && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">{editing.id ? 'Modifier le template' : 'Nouveau template'}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nom du template</label>
              <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Invitation mariage — chambres"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Catégorie</label>
              <select value={editing.category || 'general'} onChange={e => setEditing(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500">Contenu</label>
              <div className="flex gap-1 flex-wrap justify-end">
                {VARIABLES.map(v => (
                  <button key={v.key} onClick={() => insertVar(v.key)}
                    className="text-[10px] bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-mono">
                    {v.key}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={editing.content || ''} onChange={e => setEditing(p => ({ ...p, content: e.target.value }))}
              rows={12} placeholder="Contenu du message..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 resize-y font-mono" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">
              <X className="w-4 h-4" /> Annuler
            </button>
            <button onClick={handleSave} disabled={saving || !editing.name || !editing.content}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Aucun template — crée ton premier message type</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{t.name}</span>
                  <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">{t.category}</span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 font-mono">{t.content.slice(0, 150)}...</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setEditing(t)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  {deleting === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
