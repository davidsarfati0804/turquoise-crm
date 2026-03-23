export const CRM_STATUSES = {
  NEW_LEAD: 'new_lead',
  QUALIFICATION_IN_PROGRESS: 'qualification_in_progress',
  INSCRIPTION_IN_PROGRESS: 'inscription_in_progress',
  BULLETIN_READY: 'bulletin_ready',
  WAITING_INTERNAL_VALIDATION: 'waiting_internal_validation',
  VALIDATED: 'validated',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export const PAYMENT_STATUSES = {
  NOT_SENT: 'not_sent',
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const

export const INVOICE_STATUSES = {
  NOT_CREATED: 'not_created',
  PENDING: 'pending',
  CREATED: 'created',
  SENT: 'sent',
  PAID: 'paid',
} as const

export const CRM_STATUS_LABELS: Record<string, string> = {
  new_lead: 'Nouveau lead',
  qualification_in_progress: 'Qualification en cours',
  inscription_in_progress: 'Inscription en cours',
  bulletin_ready: 'Bulletin prêt',
  waiting_internal_validation: 'Validation en attente',
  validated: 'Validé',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_sent: 'Non envoyé',
  pending: 'En attente',
  partially_paid: 'Partiellement payé',
  paid: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  not_created: 'Non créée',
  pending: 'En attente',
  created: 'Créée',
  sent: 'Envoyée',
  paid: 'Payée',
}
