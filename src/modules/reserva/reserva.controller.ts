import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ListarReservasUseCase } from '../../application/reserva/listar-reservas/ListarReservasUseCase';
import { PerfilAcesso } from '../../common/auth/perfil';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiAuthResponses } from '../../common/decorators/swagger';
import { ReservaResponseDto } from './dto/reserva-response.dto';

@ApiTags('Reservas')
@ApiBearerAuth()
@Roles(PerfilAcesso.ADMINISTRADOR, PerfilAcesso.ATENDENTE, PerfilAcesso.MECANICO)
@Controller('reservas')
export class ReservaController {
  constructor(private readonly listar: ListarReservasUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Reservas de insumos de uma OS',
    description: 'Mostra o histórico ATIVA → LIBERADA (compensação) ou BAIXADA (execução).',
  })
  @ApiQuery({ name: 'osId', required: true })
  @ApiResponse({ status: 200, type: ReservaResponseDto, isArray: true })
  @ApiAuthResponses()
  async list(@Query('osId') osId: string): Promise<ReservaResponseDto[]> {
    return (await this.listar.execute(osId)).map((r) => ReservaResponseDto.fromDomain(r));
  }
}
