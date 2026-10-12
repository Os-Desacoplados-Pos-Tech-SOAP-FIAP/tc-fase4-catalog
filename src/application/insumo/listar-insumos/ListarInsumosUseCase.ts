import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { Insumo } from '../../../domain/insumo/entities/Insumo';
import { IInsumoRepository } from '../../../domain/insumo/repositories/IInsumoRepository';

@Injectable()
export class ListarInsumosUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.INSUMO_REPOSITORY)
    private readonly insumoRepository: IInsumoRepository,
  ) {}

  async execute(): Promise<Insumo[]> {
    return this.insumoRepository.listar();
  }
}
