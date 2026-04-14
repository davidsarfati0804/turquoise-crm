'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Mail, FileText, Eye, RefreshCw, FileDown, PenTool, CheckCircle, Clock, XCircle } from 'lucide-react'

function deduplicateParticipants(participants: any[]): any[] {
  const seen = new Set<string>()
  return participants.filter(p => {
    const key = `${(p.first_name || '').toLowerCase().trim()}|${(p.last_name || '').toLowerCase().trim()}|${p.date_of_birth || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

interface BIGeneratorProps {
  clientFile: any
}

export function BIGenerator({ clientFile }: BIGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [generatedBI, setGeneratedBI] = useState<any>(null)
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [googleDocUrl, setGoogleDocUrl] = useState<string | null>(null)
  const [requestingSignature, setRequestingSignature] = useState(false)
  const [signatureStatus, setSignatureStatus] = useState<string | null>(null)
  const [signerUrl, setSignerUrl] = useState<string | null>(null)

  // Charger le dernier BI existant au montage
  useEffect(() => {
    const loadExistingBI = async () => {
      const supabase = createClient()
      const { data: existingBI } = await supabase
        .from('bulletin_inscriptions')
        .select('*')
        .eq('client_file_id', clientFile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingBI) {
        setGeneratedBI(existingBI)
        // Charger le statut de signature si existant
        if (existingBI.client_signature_status) {
          setSignatureStatus(existingBI.client_signature_status)
        }
        if (existingBI.yousign_signer_url) {
          setSignerUrl(existingBI.yousign_signer_url)
        }
      }
    }
    loadExistingBI()
  }, [clientFile.id])

  const generateBI = async () => {
    setGenerating(true)
    setPdfUrl(null)
    setGoogleDocUrl(null)
    try {
      const supabase = createClient()

      // 1. Récupérer toutes les données nécessaires
      const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('client_file_id', clientFile.id)

      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', clientFile.event_id)
        .maybeSingle()

      let roomType = null
      let pricing = null

      if (clientFile.selected_room_type_id) {
        const { data: rt } = await supabase
          .from('room_types')
          .select('*')
          .eq('id', clientFile.selected_room_type_id)
          .maybeSingle()
        roomType = rt

        const { data: pr } = await supabase
          .from('event_room_pricing')
          .select('*')
          .eq('event_id', clientFile.event_id)
          .eq('room_type_id', clientFile.selected_room_type_id)
          .maybeSingle()
        pricing = pr
      }

      // 2. Générer le numéro de BI
      const biNumber = `BI-${clientFile.file_reference}`

      // 3. Créer le snapshot des données
      const biData = {
        bi_number: biNumber,
        file_reference: clientFile.file_reference,
        generated_at: new Date().toISOString(),
        
        client: {
          first_name: clientFile.primary_contact_first_name,
          last_name: clientFile.primary_contact_last_name,
          phone: clientFile.primary_contact_phone,
          email: clientFile.primary_contact_email,
          country: 'FRANCE',
        },

        event: {
          name: event?.name,
          type: event?.event_type,
          destination: event?.destination_label,
          arrival_date: event?.arrival_date,
          departure_date: event?.departure_date,
          nights_count: event?.nights_count,
          check_in_time: event?.check_in_time,
          check_out_time: event?.check_out_time,
          pension_type: event?.pension_type,
          pension_details: event?.pension_details,
          nounou_included: event?.nounou_included,
          nounou_details: event?.nounou_details,
        },

        participants: deduplicateParticipants(participants || []),
        total_participants: clientFile.total_participants,
        adults_count: clientFile.adults_count,
        children_count: clientFile.children_count,
        babies_count: clientFile.babies_count,

        room_type: {
          name: roomType?.name,
          description: roomType?.description,
        },
        pricing: {
          price_per_night: pricing?.price_per_night,
          currency: pricing?.currency || 'EUR',
        },

        quoted_price: clientFile.quoted_price,
        amount_paid: clientFile.amount_paid,
        balance_due: clientFile.balance_due,

        insurance_included: clientFile.insurance_included || false,
        insurance_accepted: clientFile.insurance_accepted,
        insurance_refused: clientFile.insurance_refused,

        included_services: clientFile.included_services || ['Transferts aéroport/hôtel/aéroport'],
        observations: clientFile.observations,
      }

      // 4. Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()

      // 5. Supprimer l'ancien BI s'il existe (même bi_number)
      await supabase
        .from('bulletin_inscriptions')
        .delete()
        .eq('client_file_id', clientFile.id)
        .eq('bi_number', biNumber)

      // 6. Sauvegarder le nouveau BI
      const { data: savedBI, error } = await supabase
        .from('bulletin_inscriptions')
        .insert({
          client_file_id: clientFile.id,
          bi_number: biNumber,
          data: biData,
          generated_by: user?.id || null,
        })
        .select()
        .maybeSingle()

      if (error) {
        console.error('Error saving BI:', JSON.stringify(error))
        alert(`Erreur lors de la sauvegarde du BI: ${error.message || JSON.stringify(error)}`)
        return
      }

      setGeneratedBI(savedBI)

      // 7. Générer le PDF via Google Docs (ton vrai template)
      const pdfRes = await fetch('/api/bulletin-inscriptions/generate-google-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bi_id: savedBI.id }),
      })

      if (!pdfRes.ok) {
        const errData = await pdfRes.json().catch(() => ({ error: 'Erreur serveur' }))
        throw new Error(errData.error || `Erreur ${pdfRes.status}`)
      }

      // Récupérer le lien Google Doc depuis le header ou refetch le BI
      const { data: updatedBI } = await supabase
        .from('bulletin_inscriptions')
        .select('google_doc_url')
        .eq('id', savedBI.id)
        .maybeSingle()

      if (updatedBI?.google_doc_url) {
        setGoogleDocUrl(updatedBI.google_doc_url)
      }

      // Créer le blob URL pour l'aperçu PDF
      const blob = await pdfRes.blob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setShowPreview(true)

    } catch (error) {
      console.error('Error generating BI:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors de la génération du BI')
    } finally {
      setGenerating(false)
    }
  }

  // Télécharger le PDF déjà généré
  const downloadPdf = () => {
    if (!pdfUrl || !generatedBI) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `BI_${generatedBI.data.file_reference || 'document'}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Ouvrir le Google Doc dans un nouvel onglet
  const openGoogleDoc = () => {
    if (googleDocUrl) {
      window.open(googleDocUrl, '_blank')
    }
  }

  const sendViaWhatsApp = async () => {
    if (!generatedBI) return

    setSendingWhatsApp(true)
    try {
      const biData = generatedBI.data

      const res = await fetch(`/api/bulletin-inscriptions/${generatedBI.id}/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: biData.client.phone,
          clientName: `${biData.client.first_name} ${biData.client.last_name}`,
          eventName: biData.event.name,
          biNumber: biData.bi_number,
          fileReference: biData.file_reference,
        }),
      })

      const result = await res.json()

      if (!result.success && !result.whatsappUrl) {
        throw new Error(result.error || 'Erreur lors de l\'envoi WhatsApp')
      }

      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank')
      }

      alert('✅ Message WhatsApp préparé !')
    } catch (error) {
      console.error('Error sending via WhatsApp:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi WhatsApp')
    } finally {
      setSendingWhatsApp(false)
    }
  }

  const requestSignature = async () => {
    if (!generatedBI) return

    const biData = generatedBI.data
    if (!biData.client.email) {
      alert('❌ Email client requis pour la signature électronique')
      return
    }

    if (!confirm(`Envoyer le BI en signature électronique à ${biData.client.email} ?`)) return

    setRequestingSignature(true)
    try {
      const res = await fetch(`/api/bulletin-inscriptions/${generatedBI.id}/request-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()

      if (!res.ok) {
        // Si déjà en cours, récupérer le lien existant
        if (res.status === 409 && result.signerUrl) {
          setSignatureStatus('ongoing')
          setSignerUrl(result.signerUrl)
          alert('⚠️ Une demande de signature est déjà en cours')
          return
        }
        throw new Error(result.error || 'Erreur lors de la demande de signature')
      }

      setSignatureStatus('ongoing')
      setSignerUrl(result.signerUrl)
      alert('✅ Demande de signature envoyée ! Le client peut signer via le lien.')
    } catch (error) {
      console.error('Error requesting signature:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors de la demande de signature')
    } finally {
      setRequestingSignature(false)
    }
  }

  const sendViaEmail = async () => {
    if (!generatedBI) return

    setSendingEmail(true)
    try {
      const biData = generatedBI.data

      if (!biData.client.email) {
        alert('❌ Aucune adresse email renseignée pour ce client')
        return
      }

      const res = await fetch(`/api/bulletin-inscriptions/${generatedBI.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: biData.client.email,
          clientName: `${biData.client.first_name} ${biData.client.last_name}`,
          eventName: biData.event.name,
          biNumber: biData.bi_number,
          fileReference: biData.file_reference,
        }),
      })

      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi email')
      }

      alert('✅ Email envoyé à ' + biData.client.email)
    } catch (error) {
      console.error('Error sending via Email:', error)
      alert('⚠️ Infrastructure Email prête mais API non connectée.\nConnectez Resend/SendGrid dans lib/services/email.service.ts')
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">📄 Bulletin d&apos;Inscription</h2>
        <p className="text-turquoise-100">
          Générez le BI depuis votre modèle Google Docs Club Turquoise
        </p>
      </div>

      {/* Generate Button */}
      {!generatedBI && (
        <div className="text-center py-8">
          <button
            onClick={generateBI}
            disabled={generating}
            className="px-8 py-4 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-semibold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-6 h-6 inline-block mr-2 -mt-1" />
            {generating ? 'Génération en cours (Google Docs)...' : 'Générer le Bulletin d\'Inscription'}
          </button>
          <p className="text-sm text-gray-600 mt-3">
            Votre modèle Google Docs sera copié et rempli automatiquement avec les données du dossier
          </p>
        </div>
      )}

      {/* Generated BI */}
      {generatedBI && (
        <div className="space-y-4">
          {/* Status bar */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-800">
                ✅ BI généré : {generatedBI.data.bi_number}
              </p>
              <p className="text-sm text-green-600">
                Réf. {generatedBI.data.file_reference} — {generatedBI.data.client.first_name} {generatedBI.data.client.last_name}
              </p>
            </div>
            <div className="flex gap-2">
              {pdfUrl && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? 'Masquer' : 'Aperçu'}
                </button>
              )}
              <button
                onClick={generateBI}
                disabled={generating}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Génération...' : 'Régénérer'}
              </button>
            </div>
          </div>

          {/* PDF Preview from Google Docs */}
          {showPreview && pdfUrl && (
            <div className="border-2 border-turquoise-300 rounded-lg overflow-hidden shadow-xl">
              <div className="bg-turquoise-50 px-4 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-turquoise-700">
                  📄 Aperçu du BI (généré depuis votre modèle Google Docs)
                </span>
                {googleDocUrl && (
                  <button
                    onClick={openGoogleDoc}
                    className="text-xs text-turquoise-600 hover:text-turquoise-800 underline"
                  >
                    Ouvrir dans Google Docs ↗
                  </button>
                )}
              </div>
              <iframe
                src={pdfUrl}
                className="w-full bg-white"
                style={{ height: '800px' }}
                title="Aperçu BI PDF"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={downloadPdf}
              disabled={!pdfUrl}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg transition-all disabled:opacity-50"
            >
              <FileDown className="w-5 h-5" />
              Télécharger PDF
            </button>

            {googleDocUrl && (
              <button
                onClick={openGoogleDoc}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-all"
              >
                <FileText className="w-5 h-5" />
                Ouvrir Google Doc
              </button>
            )}

            <button
              onClick={sendViaWhatsApp}
              disabled={sendingWhatsApp}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-lg transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {sendingWhatsApp ? 'Envoi...' : 'WhatsApp'}
            </button>

            <button
              onClick={sendViaEmail}
              disabled={sendingEmail}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg transition-all disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              {sendingEmail ? 'Envoi...' : 'Email'}
            </button>

            <button
              onClick={requestSignature}
              disabled={requestingSignature || signatureStatus === 'signed'}
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-lg transition-all disabled:opacity-50"
            >
              <PenTool className="w-5 h-5" />
              {requestingSignature ? 'Envoi...' : signatureStatus === 'ongoing' ? 'Signature en cours' : signatureStatus === 'signed' ? 'Signé ✓' : 'Signature électronique'}
            </button>
          </div>

          {/* Signature Status */}
          {signatureStatus && (
            <div className={`rounded-lg p-4 flex items-center justify-between ${
              signatureStatus === 'signed' ? 'bg-green-50 border border-green-200' :
              signatureStatus === 'refused' ? 'bg-red-50 border border-red-200' :
              signatureStatus === 'expired' ? 'bg-gray-50 border border-gray-200' :
              'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                {signatureStatus === 'signed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {signatureStatus === 'ongoing' && <Clock className="w-5 h-5 text-amber-600" />}
                {signatureStatus === 'refused' && <XCircle className="w-5 h-5 text-red-600" />}
                {signatureStatus === 'expired' && <Clock className="w-5 h-5 text-gray-500" />}
                <div>
                  <p className={`font-semibold ${
                    signatureStatus === 'signed' ? 'text-green-800' :
                    signatureStatus === 'refused' ? 'text-red-800' :
                    signatureStatus === 'expired' ? 'text-gray-700' :
                    'text-amber-800'
                  }`}>
                    {signatureStatus === 'signed' && '✅ Document signé électroniquement'}
                    {signatureStatus === 'ongoing' && '⏳ En attente de signature du client'}
                    {signatureStatus === 'refused' && '❌ Signature refusée par le client'}
                    {signatureStatus === 'expired' && '⏰ Demande de signature expirée'}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    via Yousign (signature électronique certifiée eIDAS)
                  </p>
                </div>
              </div>
              {signerUrl && signatureStatus === 'ongoing' && (
                <button
                  onClick={() => { navigator.clipboard.writeText(signerUrl); alert('Lien de signature copié !') }}
                  className="text-sm px-3 py-1.5 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 text-amber-700 font-medium"
                >
                  Copier le lien
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
