import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AtualizarServicoUseCase } from '../../application/servico/atualizar-servico/AtualizarServicoUseCase';
import { BuscarServicoUseCase } from '../../application/servico/buscar-servico/BuscarServicoUseCase';
import { CadastrarServicoUseCase } from '../../application/servico/cadastrar-servico/CadastrarServicoUseCase';
import { ListarServicosUseCase } from '../../application/servico/listar-servicos/ListarServicosUseCase';
import { PerfilAcesso } from '../../common/auth/perfil';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiAuthResponses, ApiValidationResponses } from '../../common/decorators/swagger';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';
import { ServicoResponseDto } from './dto/servico-response.dto';

const FUNCIONARIOS = [PerfilAcesso.ADMINISTRADOR, PerfilAcesso.ATENDENTE, PerfilAcesso.MECANICO];

@ApiTags('Serviços')
@ApiBearerAuth()
@Roles(PerfilAcesso.ADMINISTRADOR)
@Controller('servicos')
export class ServicoController {
  constructor(
    private readonly cadastrar: CadastrarServicoUseCase,
    private readonly listar: ListarServicosUseCase,
    private readonly buscar: BuscarServicoUseCase,
    private readonly atualizar: AtualizarServicoUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra serviço', description: 'Cria um serviço no catálogo com valor padrão.' })
  @ApiResponse({ status: 201, description: 'Serviço criado', type: ServicoResponseDto })
  @ApiAuthResponses()
  @ApiValidationResponses()
  async create(@Body() dto: CriarServicoDto): Promise<ServicoResponseDto> {
    return ServicoResponseDto.fromDomain(await this.cadastrar.execute(dto));
  }

  @Get()
  @Roles(...FUNCIONARIOS)
  @ApiOperation({ summary: 'Lista serviços do catálogo' })
  @ApiResponse({ status: 200, description: 'Lista retornada', type: ServicoResponseDto, isArray: true })
  @ApiAuthResponses()
  async list(): Promise<ServicoResponseDto[]> {
    return (await this.listar.execute()).map((s) => ServicoResponseDto.fromDomain(s));
  }

  @Get(':id')
  @Roles(...FUNCIONARIOS)
  @ApiOperation({
    summary: 'Busca serviço por id',
    description: 'Usado pelo OS Service para validar e precificar o item da OS.',
  })
  @ApiResponse({ status: 200, description: 'Serviço encontrado', type: ServicoResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  @ApiAuthResponses()
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ServicoResponseDto> {
    return ServicoResponseDto.fromDomain(await this.buscar.execute(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza serviço' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado', type: ServicoResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  @ApiAuthResponses()
  @ApiValidationResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarServicoDto,
  ): Promise<ServicoResponseDto> {
    return ServicoResponseDto.fromDomain(await this.atualizar.execute({ id, ...dto }));
  }
}
