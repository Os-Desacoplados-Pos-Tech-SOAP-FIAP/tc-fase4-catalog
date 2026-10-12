import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { Insumo, NovoInsumoInput } from '../../../domain/insumo/entities/Insumo';
import { IInsumoRepository } from '../../../domain/insumo/repositories/IInsumoRepository';

@Injectable()
export class CadastrarInsumoUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.INSUMO_REPOSITORY)
    private readonly insumoRepository: IInsumoRepository,
  ) {}

  async execute(input: NovoInsumoInput): Promise<Insumo> {
    const insumo = Insumo.criar(input);
    const existente = await this.insumoRepository.buscarPorCodigo(insumo.codigo.value);
    if (existente) {
      throw new ConflictException('Já existe peça/insumo com este código');
    }
    await this.insumoRepository.salvar(insumo);
    return insumo;
  }
}
