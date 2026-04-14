import { z } from 'zod'

export const leadSchema = z.object({
  event_id: z.string().uuid().nullable(),
  source: z.enum(['whatsapp', 'phone', 'email', 'manual', 'other']),
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().nullable().or(z.literal('')),
  adults_count: z.number().int().min(1).default(1),
  children_count: z.number().int().min(0).default(0),
  babies_count: z.number().int().min(0).default(0),
})

export type LeadFormData = z.infer<typeof leadSchema>
