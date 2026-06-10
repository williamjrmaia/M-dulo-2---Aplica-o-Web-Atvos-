import { z } from 'zod';

export const uuidFormato =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const vincularTerraAoParceiroSchema = z.object({
  terra_id: z.string().regex(uuidFormato, 'terra_id deve ser um UUID válido'),
  tipo_vinculo: z.string().min(1, 'tipo_vinculo não pode ser vazio').optional(),
  tipo_parceiro: z.enum(['arrendador', 'fornecedor'], {
    message: 'tipo_parceiro deve ser arrendador ou fornecedor',
  }).optional(),
  modalidade_contrato: z.string().min(1, 'modalidade_contrato não pode ser vazia').optional(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data_inicio deve usar o formato YYYY-MM-DD').optional(),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data_fim deve usar o formato YYYY-MM-DD').optional(),
  observacoes: z.string().min(1, 'observacoes não pode ser vazia').optional(),
});

export type VincularTerraAoParceiroInput = z.infer<typeof vincularTerraAoParceiroSchema>;
