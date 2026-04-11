import { z } from 'zod';

export const OrderItemSchema = z.object({
  flavorId: z.string(),
  flavorName: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  customerName: z.string().min(2).max(150),
  customerPhone: z.string().min(1, 'Telefone obrigatório'),
  phoneCountry: z.string().length(2).default('BE'),
  addressStreet: z.string().min(1).max(200),
  addressNumber: z.string().min(1).max(20),
  addressPostalCode: z.string().regex(/^\d{4}$/, 'Código postal deve ter 4 dígitos'),
  addressCommune: z.string().min(1).max(100),
  needsChange: z.boolean(),
  changeAmountEurCents: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(OrderItemSchema).min(1),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(['novo', 'em_preparo', 'em_rota', 'entregue', 'cancelado']),
});

export const UpdateFreightSchema = z.object({
  freightEurCents: z.number().int().min(0),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
