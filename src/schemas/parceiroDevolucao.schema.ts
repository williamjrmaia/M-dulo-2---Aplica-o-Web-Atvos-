import { z } from 'zod';

const uuidFormato = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const devolverParceiroSchema = z.object({
  devolvido_por: z.string().regex(uuidFormato, 'devolvido_por deve ser um UUID válido'),
  comentario: z.string().min(1, 'comentario não pode ser vazio').optional(),
});

export type DevolverParceiroSchemaInput = z.infer<typeof devolverParceiroSchema>;
