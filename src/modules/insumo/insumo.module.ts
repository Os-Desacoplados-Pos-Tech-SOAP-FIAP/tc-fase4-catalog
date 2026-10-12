import { Module } from '@nestjs/common';

import { AtualizarEstoqueUseCase } from '../../application/insumo/atualizar-estoque/AtualizarEstoqueUseCase';
import { BuscarInsumoUseCase } from '../../application/insumo/buscar-insumo/BuscarInsumoUseCase';
import { CadastrarInsumoUseCase } from '../../application/insumo/cadastrar-insumo/CadastrarInsumoUseCase';
import { ListarInsumosUseCase } from '../../application/insumo/listar-insumos/ListarInsumosUseCase';
import { InsumoController } from './insumo.controller';

@Module({
  controllers: [InsumoController],
  providers: [CadastrarInsumoUseCase, ListarInsumosUseCase, BuscarInsumoUseCase, AtualizarEstoqueUseCase],
})
export class InsumoModule {}
