import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { ensureFound } from '../../../common/utils/ensure-found';
import { Insumo } from '../../../domain/insumo/entities/Insumo';
import { IInsumoRepository } from '../../../domain/insumo/repositories/IInsumoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';

interface AtualizarEstoqueInput {
  id: string;
  quantidade: number;
}

@Injectable()
export class AtualizarEstoqueUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.INSUMO_REPOSITORY)
    private readonly insumoRepository: IInsumoRepository,
  ) {}

  async execute(input: AtualizarEstoqueInput): Promise<Insumo> {
    const insumo = ensureFound(
      await this.insumoRepository.buscarPorId(new UniqueID(input.id)),
      'Peça/insumo',
    );
    insumo.atualizarEstoque(input.quantidade);
    await this.insumoRepository.salvar(insumo);
    return insumo;
  }
}
