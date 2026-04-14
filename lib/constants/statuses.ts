export const CRM_STATUSES = {
  LEAD: 'lead',
  INSCRIPTION_EN_COURS: 'inscription_en_cours',
  BULLETIN_PRET: 'bulletin_pret',
  VALIDE: 'valide',
  PAIEMENT_EN_ATTENTE: 'paiement_en_attente',
  PAYE: 'paye',
  ANNULE: 'annule',
} as const

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded',
} as const

export const INVOICE_STATUSES = {
  NOT_SENT: 'not_sent',
  SENT: 'sent',
  PAID: 'paid',
} as const

export const CRM_STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  inscription_en_cours: 'Inscription en cours',
  bulletin_pret: 'Bulletin prêt',
  valide: 'Validé',
  paiement_en_attente: 'En cours de paiement',
  paye: 'Payé',
  annule: 'Annulé',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  partial: 'Partiel',
  paid: 'Payé',
  refunded: 'Remboursé',
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  not_sent: 'Non envoyée',
  sent: 'Envoyée',
  paid: 'Payée',
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  converti: 'Converti',
  perdu: 'Perdu',
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  upcoming: 'À venir',
  active: 'Actif',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

export const SOURCE_LABELS: Record<string, string> = {
  whatsapp: '💬 WhatsApp',
  phone: '📞 Téléphone',
  email: '📧 Email',
  manual: '✍️ Manuel',
  other: 'Autre',
}
