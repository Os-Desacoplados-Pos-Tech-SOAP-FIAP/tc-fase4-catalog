import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { ensureFound } from '../../../common/utils/ensure-found';
import { Insumo } from '../../../domain/insumo/entities/Insumo';
import { IInsumoRepository } from '../../../domain/insumo/repositories/IInsumoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';

@Injectable()
export class BuscarInsumoUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.INSUMO_REPOSITORY)
    private readonly insumoRepository: IInsumoRepository,
  ) {}

  async execute(id: string): Promise<Insumo> {
    return ensureFound(await this.insumoRepository.buscarPorId(new UniqueID(id)), 'Peça/insumo');
  }
}
