import { Module } from '@nestjs/common';

import { AtualizarServicoUseCase } from '../../application/servico/atualizar-servico/AtualizarServicoUseCase';
import { BuscarServicoUseCase } from '../../application/servico/buscar-servico/BuscarServicoUseCase';
import { CadastrarServicoUseCase } from '../../application/servico/cadastrar-servico/CadastrarServicoUseCase';
import { ListarServicosUseCase } from '../../application/servico/listar-servicos/ListarServicosUseCase';
import { ServicoController } from './servico.controller';

@Module({
  controllers: [ServicoController],
  providers: [CadastrarServicoUseCase, ListarServicosUseCase, BuscarServicoUseCase, AtualizarServicoUseCase],
})
export class ServicoModule {}
