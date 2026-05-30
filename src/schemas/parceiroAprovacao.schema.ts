import { z } from 'zod';

const uuidFormato = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const aprovarParceiroSchema = z.object({
  aprovado_por: z.string().regex(uuidFormato, 'aprovado_por deve ser um UUID válido'),
  comentario: z.string().min(1, 'comentario não pode ser vazio').optional(),
});

export type AprovarParceiroSchemaInput = z.infer<typeof aprovarParceiroSchema>;
