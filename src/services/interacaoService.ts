import { InteracaoRepository } from '../repositories/interacaoRepository';
import { CriarInteracaoDTO, Interacao } from '../models/interacao.model';

export class InteracaoService {
  constructor(private readonly interacaoRepository: InteracaoRepository) {}

  async registrarInteracao(parceiro_id: string, dados: CriarInteracaoDTO): Promise<Interacao> {
    console.log(`[SERVICE] registrarInteracao para parceiro: ${parceiro_id}`);

    // RN01 — verificar se parceiro existe
    const parceiroExiste = await this.interacaoRepository.verificarExistenciaParceiro(parceiro_id);
    if (!parceiroExiste) {
      throw new Error('Parceiro não localizado para registro');
    }

    // RN02 — salvar interação
    console.log('[SERVICE] Salvando interação...');
    const interacao = await this.interacaoRepository.salvar(parceiro_id, dados);
    console.log('[SERVICE] Interação registrada com sucesso');
    return interacao;
  }
}