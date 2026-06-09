import { z } from 'zod';

const textoOpcional = z.preprocess(
  (value) => {
    const valor = Array.isArray(value) ? value[0] : value;
    if (typeof valor !== 'string') return undefined;
    const texto = valor.trim();
    return texto.length > 0 ? texto : undefined;
  },
  z.string().optional()
);

export const listarParceirosFiltrosSchema = z.object({
  nome: textoOpcional,
  regiao: textoOpcional,
  area: z.preprocess(
    (value) => {
      const valor = Array.isArray(value) ? value[0] : value;
      if (valor === undefined || valor === null || valor === '') return undefined;
      return Number(valor);
    },
    z.number().positive('area deve ser maior que zero').optional()
  ),
  tipo: z.preprocess(
    (value) => {
      const valor = Array.isArray(value) ? value[0] : value;
      if (typeof valor !== 'string') return undefined;
      const texto = valor.trim();
      return texto.length > 0 ? texto : undefined;
    },
    z
      .enum(['fisica', 'juridica', 'arrendador', 'fornecedor'], {
        message: 'tipo deve ser fisica, juridica, arrendador ou fornecedor',
      })
      .optional()
  ),
  status: z.preprocess(
    (value) => {
      const valor = Array.isArray(value) ? value[0] : value;
      if (typeof valor !== 'string') return undefined;
      const texto = valor.trim();
      return texto.length > 0 ? texto : undefined;
    },
    z
      .enum(['rascunho', 'pendente', 'ativo', 'devolvido'], {
        message: 'status deve ser rascunho, pendente, ativo ou devolvido',
      })
      .optional()
  ),
  usina_referencia: textoOpcional,
});

export type ListarParceirosFiltrosSchemaInput = z.infer<typeof listarParceirosFiltrosSchema>;
