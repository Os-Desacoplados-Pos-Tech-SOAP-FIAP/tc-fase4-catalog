import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { Servico } from '../../../domain/servico/entities/Servico';
import { IServicoRepository } from '../../../domain/servico/repositories/IServicoRepository';

@Injectable()
export class ListarServicosUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.SERVICO_REPOSITORY)
    private readonly servicoRepository: IServicoRepository,
  ) {}

  async execute(): Promise<Servico[]> {
    return this.servicoRepository.listar();
  }
}
