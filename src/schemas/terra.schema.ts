import { z } from 'zod';

export const createTerraSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
  area_contratada_ha: z.coerce
    .number()
    .positive('area_contratada_ha deve ser maior que zero'),
  cidade: z.string().min(1, 'cidade é obrigatória'),
  estado: z.string().length(2, 'estado deve ter 2 caracteres'),
  criado_por: z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      'criado_por deve ser um UUID válido'
    ),
  status: z
    .enum(['rascunho', 'pendente', 'ativo', 'devolvido', 'inativo'])
    .optional(),
});

export type CreateTerraSchemaInput = z.infer<typeof createTerraSchema>;
