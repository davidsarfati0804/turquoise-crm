export function StatusBadge({ status, type }: { status: string; type: 'crm' | 'payment' | 'invoice' }) {
  if (type === 'crm') {
    const crmStatuses: Record<string, { label: string; class: string }> = {
      lead: { label: 'Lead', class: 'bg-gray-100 text-gray-800' },
      inscription_en_cours: { label: 'Inscription en cours', class: 'bg-blue-100 text-blue-800' },
      bulletin_pret: { label: 'Bulletin prêt', class: 'bg-purple-100 text-purple-800' },
      valide: { label: 'Validé', class: 'bg-green-100 text-green-800' },
      paiement_en_attente: { label: 'Paiement en attente', class: 'bg-yellow-100 text-yellow-800' },
      paye: { label: 'Payé', class: 'bg-turquoise-100 text-turquoise-800' },
      annule: { label: 'Annulé', class: 'bg-red-100 text-red-800' }
    }

    const config = crmStatuses[status] || { label: status, class: 'bg-gray-100 text-gray-800' }

    return (
      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${config.class}`}>
        {config.label}
      </span>
    )
  }

  if (type === 'payment') {
    const paymentStatuses: Record<string, { label: string; class: string }> = {
      not_started: { label: 'Non commencé', class: 'bg-gray-100 text-gray-700' },
      pending: { label: 'En attente', class: 'bg-yellow-100 text-yellow-800' },
      partial: { label: 'Partiel', class: 'bg-orange-100 text-orange-800' },
      paid: { label: 'Payé', class: 'bg-green-100 text-green-800' },
      refunded: { label: 'Remboursé', class: 'bg-red-100 text-red-800' }
    }

    const config = paymentStatuses[status] || { label: status, class: 'bg-gray-100 text-gray-800' }

    return (
      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${config.class}`}>
        💳 {config.label}
      </span>
    )
  }

  return null
}
