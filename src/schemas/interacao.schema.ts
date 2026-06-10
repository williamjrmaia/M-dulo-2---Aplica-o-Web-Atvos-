import { z } from 'zod';
import { textoObrigatorio, uuidSchema } from './common.schema';

export const criarInteracaoSchema = z.object({
  registrado_por: uuidSchema('registrado_por'),
  tipo: textoObrigatorio('tipo'),
  descricao: textoObrigatorio('descricao'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve usar o formato YYYY-MM-DD'),
});

export type CriarInteracaoSchemaInput = z.infer<typeof criarInteracaoSchema>;
