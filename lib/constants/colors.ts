export const STATUS_COLORS: Record<string, string> = {
  // CRM Status (match DB values)
  lead: 'bg-gray-100 text-gray-700 border-gray-300',
  inscription_en_cours: 'bg-blue-100 text-blue-700 border-blue-300',
  bulletin_pret: 'bg-purple-100 text-purple-700 border-purple-300',
  valide: 'bg-green-100 text-green-700 border-green-300',
  paiement_en_attente: 'bg-orange-100 text-orange-700 border-orange-300',
  paye: 'bg-green-200 text-green-800 border-green-400',
  annule: 'bg-red-100 text-red-700 border-red-300',

  // Payment Status
  pending: 'bg-orange-100 text-orange-700 border-orange-300',
  partial: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  paid: 'bg-green-100 text-green-700 border-green-300',
  refunded: 'bg-purple-100 text-purple-700 border-purple-300',

  // Invoice Status
  not_sent: 'bg-gray-100 text-gray-600 border-gray-300',
  sent: 'bg-orange-100 text-orange-700 border-orange-300',

  // Lead Status
  nouveau: 'bg-blue-100 text-blue-700 border-blue-300',
  en_cours: 'bg-orange-100 text-orange-700 border-orange-300',
  converti: 'bg-green-100 text-green-700 border-green-300',
  perdu: 'bg-red-100 text-red-700 border-red-300',

  // Event Status
  draft: 'bg-gray-100 text-gray-600 border-gray-300',
  upcoming: 'bg-blue-100 text-blue-700 border-blue-300',
  active: 'bg-green-100 text-green-700 border-green-300',
  completed: 'bg-green-200 text-green-800 border-green-400',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
}
