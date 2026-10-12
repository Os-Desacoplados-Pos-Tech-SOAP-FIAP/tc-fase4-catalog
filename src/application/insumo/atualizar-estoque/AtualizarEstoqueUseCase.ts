import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { ensureFound } from '../../ensure-found';
import { Insumo } from '../../../domain/insumo/entities/Insumo';
import { IInsumoLockingRepository } from '../../../domain/insumo/repositories/IInsumoLockingRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { ITransactionManager } from '../../ports/transaction-manager';

interface AtualizarEstoqueInput {
  id: string;
  quantidade: number;
}

@Injectable()
export class AtualizarEstoqueUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.TRANSACTION_MANAGER)
    private readonly transacao: ITransactionManager,
    @Inject(INJECTION_TOKENS.INSUMO_REPOSITORY)
    private readonly insumoRepository: IInsumoLockingRepository,
  ) {}

  async execute(input: AtualizarEstoqueInput): Promise<Insumo> {
    return this.transacao.run(async () => {
      const [encontrado] = await this.insumoRepository.buscarParaAtualizacao([
        new UniqueID(input.id),
      ]);
      const insumo = ensureFound(encontrado ?? null, 'Peça/insumo');
      insumo.atualizarEstoque(input.quantidade);
      await this.insumoRepository.salvar(insumo);
      return insumo;
    });
  }
}
