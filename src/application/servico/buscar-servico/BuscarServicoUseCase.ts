import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { ensureFound } from '../../ensure-found';
import { Servico } from '../../../domain/servico/entities/Servico';
import { IServicoRepository } from '../../../domain/servico/repositories/IServicoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';

@Injectable()
export class BuscarServicoUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.SERVICO_REPOSITORY)
    private readonly servicoRepository: IServicoRepository,
  ) {}

  async execute(id: string): Promise<Servico> {
    return ensureFound(await this.servicoRepository.buscarPorId(new UniqueID(id)), 'Serviço');
  }
}
