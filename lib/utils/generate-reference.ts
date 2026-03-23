export function generateFileReference(eventSlug: string, year: number, number: number): string {
  const prefix = eventSlug.substring(0, 3).toUpperCase()
  const paddedNumber = String(number).padStart(4, '0')
  return `${prefix}-${year}-${paddedNumber}`
}

// Exemple: generateFileReference('maurice-decembre-2026', 2026, 42)
// Résultat: 'MAU-2026-0042'
