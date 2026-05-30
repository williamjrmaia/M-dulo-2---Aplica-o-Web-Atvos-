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

const uuidFormato = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const updateTerraSchema = z
  .object({
    nome: z.string().min(1, 'nome não pode ser vazio').optional(),
    area_contratada_ha: z.coerce
      .number()
      .positive('area_contratada_ha deve ser maior que zero')
      .optional(),
    cidade: z.string().min(1, 'cidade não pode ser vazia').optional(),
    estado: z.string().length(2, 'estado deve ter 2 caracteres').optional(),
    status: z
      .enum(['rascunho', 'pendente', 'ativo', 'devolvido', 'inativo'])
      .optional(),
    atualizado_por: z
      .string()
      .regex(uuidFormato, 'atualizado_por deve ser um UUID válido'),
  })
  .refine(
    (data) =>
      data.nome !== undefined ||
      data.area_contratada_ha !== undefined ||
      data.cidade !== undefined ||
      data.estado !== undefined ||
      data.status !== undefined,
    'pelo menos um campo editável deve ser informado'
  );

export type UpdateTerraSchemaInput = z.infer<typeof updateTerraSchema>;
