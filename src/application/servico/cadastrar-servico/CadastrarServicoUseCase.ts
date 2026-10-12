import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { NovoServicoInput, Servico } from '../../../domain/servico/entities/Servico';
import { IServicoRepository } from '../../../domain/servico/repositories/IServicoRepository';

@Injectable()
export class CadastrarServicoUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.SERVICO_REPOSITORY)
    private readonly servicoRepository: IServicoRepository,
  ) {}

  async execute(input: NovoServicoInput): Promise<Servico> {
    const servico = Servico.criar(input);
    await this.servicoRepository.salvar(servico);
    return servico;
  }
}
