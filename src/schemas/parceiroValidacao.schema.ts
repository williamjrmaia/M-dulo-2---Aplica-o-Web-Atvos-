import { z } from 'zod';

const uuidFormato = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const enviarParceiroValidacaoSchema = z.object({
  atualizado_por: z.string().regex(uuidFormato, 'atualizado_por deve ser um UUID válido'),
  comentario: z.string().min(1, 'comentario não pode ser vazio').optional(),
});

export type EnviarParceiroValidacaoSchemaInput = z.infer<typeof enviarParceiroValidacaoSchema>;
