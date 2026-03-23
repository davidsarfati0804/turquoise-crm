export const STATUS_COLORS: Record<string, string> = {
  // CRM Status
  new_lead: 'bg-gray-100 text-gray-700 border-gray-300',
  qualification_in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  inscription_in_progress: 'bg-turquoise-100 text-turquoise-700 border-turquoise-300',
  bulletin_ready: 'bg-purple-100 text-purple-700 border-purple-300',
  waiting_internal_validation: 'bg-orange-100 text-orange-700 border-orange-300',
  validated: 'bg-green-100 text-green-700 border-green-300',
  completed: 'bg-green-200 text-green-800 border-green-400',
  cancelled: 'bg-red-100 text-red-700 border-red-300',

  // Payment Status
  not_sent: 'bg-gray-100 text-gray-600 border-gray-300',
  pending: 'bg-orange-100 text-orange-700 border-orange-300',
  partially_paid: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  paid: 'bg-green-100 text-green-700 border-green-300',
  failed: 'bg-red-100 text-red-700 border-red-300',
  refunded: 'bg-purple-100 text-purple-700 border-purple-300',

  // Invoice Status
  not_created: 'bg-gray-100 text-gray-600 border-gray-300',
  created: 'bg-purple-100 text-purple-700 border-purple-300',
  sent: 'bg-orange-100 text-orange-700 border-orange-300',
}
