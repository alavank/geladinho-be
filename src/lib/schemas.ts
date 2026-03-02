import { z } from 'zod';
import { normalizeBelgianPhone } from './phone';

export const OrderItemSchema = z.object({
  flavorName: z.string().min(1, 'Nome do sabor obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
});

export const CreateOrderSchema = z.object({
  customerName: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(150),
  customerPhone: z.string().refine(
    (val) => normalizeBelgianPhone(val) !== null,
    'Número de telefone belga inválido'
  ),
  addressStreet: z.string().min(1, 'Rua obrigatória').max(200),
  addressNumber: z.string().min(1, 'Número obrigatório').max(20),
  addressUnit: z.string().max(50).optional(),
  addressPostalCode: z
    .string()
    .regex(/^\d{4}$/, 'CEP belga deve ter 4 dígitos'),
  addressCity: z.string().min(1, 'Cidade obrigatória').max(100),
  paymentMethod: z.enum(['dinheiro', 'cartao', 'transferencia']),
  notes: z.string().max(500).optional(),
  items: z
    .array(OrderItemSchema)
    .min(1, 'Ao menos um sabor deve ser selecionado'),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(['novo', 'em_preparo', 'em_rota', 'entregue', 'cancelado']),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
