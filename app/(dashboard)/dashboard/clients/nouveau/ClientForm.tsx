'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ClientFormProps {
  userId?: string
  client?: any
}

export default function ClientForm({ userId, client }: ClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nom: client?.nom || '',
    type_client: client?.type_client || 'entreprise',
    secteur_activite: client?.secteur_activite || '',
    site_web: client?.site_web || '',
    telephone: client?.telephone || '',
    email: client?.email || '',
    adresse_ligne1: client?.adresse_ligne1 || '',
    adresse_ligne2: client?.adresse_ligne2 || '',
    ville: client?.ville || '',
    code_postal: client?.code_postal || '',
    pays: client?.pays || 'France',
    statut: client?.statut || 'prospect',
    source: client?.source || '',
    nombre_employes: client?.nombre_employes || '',
    chiffre_affaires: client?.chiffre_affaires || '',
    notes: client?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const data = {
        ...formData,
        nombre_employes: formData.nombre_employes ? parseInt(formData.nombre_employes) : null,
        chiffre_affaires: formData.chiffre_affaires ? parseFloat(formData.chiffre_affaires) : null,
        cree_par: userId,
        modifie_par: userId,
      }

      if (client) {
        // Update
        const { error: updateError } = await supabase
          .from('clients')
          .update(data)
          .eq('id', client.id)

        if (updateError) throw updateError
      } else {
        // Create
        const { error: insertError } = await supabase
          .from('clients')
          .insert(data)

        if (insertError) throw insertError
      }

      router.push('/dashboard/clients')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Informations générales */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du client *
            </label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <select
              name="type_client"
              value={formData.type_client}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            >
              <option value="entreprise">Entreprise</option>
              <option value="individu">Individu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut *
            </label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            >
              <option value="prospect">Prospect</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secteur d'activité
            </label>
            <input
              type="text"
              name="secteur_activite"
              value={formData.secteur_activite}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site web
            </label>
            <input
              type="url"
              name="site_web"
              value={formData.site_web}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source
            </label>
            <input
              type="text"
              name="source"
              value={formData.source}
              onChange={handleChange}
              placeholder="Ex: Site web, Recommandation, Salon..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              name="adresse_ligne1"
              value={formData.adresse_ligne1}
              onChange={handleChange}
              placeholder="Adresse ligne 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>
          <div>
            <input
              type="text"
              name="adresse_ligne2"
              value={formData.adresse_ligne2}
              onChange={handleChange}
              placeholder="Adresse ligne 2 (optionnel)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                name="code_postal"
                value={formData.code_postal}
                onChange={handleChange}
                placeholder="Code postal"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
              />
            </div>
            <div>
              <input
                type="text"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                placeholder="Ville"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
              />
            </div>
            <div>
              <input
                type="text"
                name="pays"
                value={formData.pays}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Informations complémentaires */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations complémentaires</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre d'employés
            </label>
            <input
              type="number"
              name="nombre_employes"
              value={formData.nombre_employes}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chiffre d'affaires (€)
            </label>
            <input
              type="number"
              step="0.01"
              name="chiffre_affaires"
              value={formData.chiffre_affaires}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-turquoise-600 text-white rounded-lg hover:bg-turquoise-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : (client ? 'Mettre à jour' : 'Créer le client')}
        </button>
      </div>
    </form>
  )
}
