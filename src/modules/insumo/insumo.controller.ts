import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AtualizarEstoqueUseCase } from '../../application/insumo/atualizar-estoque/AtualizarEstoqueUseCase';
import { BuscarInsumoUseCase } from '../../application/insumo/buscar-insumo/BuscarInsumoUseCase';
import { CadastrarInsumoUseCase } from '../../application/insumo/cadastrar-insumo/CadastrarInsumoUseCase';
import { ListarInsumosUseCase } from '../../application/insumo/listar-insumos/ListarInsumosUseCase';
import { PerfilAcesso } from '../../common/auth/perfil';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiAuthResponses, ApiValidationResponses } from '../../common/decorators/swagger';
import { AtualizarEstoqueDto } from './dto/atualizar-estoque.dto';
import { CriarInsumoDto } from './dto/criar-insumo.dto';
import { InsumoResponseDto } from './dto/insumo-response.dto';

const FUNCIONARIOS = [PerfilAcesso.ADMINISTRADOR, PerfilAcesso.ATENDENTE, PerfilAcesso.MECANICO];

@ApiTags('Insumos')
@ApiBearerAuth()
@Roles(PerfilAcesso.ADMINISTRADOR, PerfilAcesso.MECANICO)
@Controller('insumos')
export class InsumoController {
  constructor(
    private readonly cadastrar: CadastrarInsumoUseCase,
    private readonly listar: ListarInsumosUseCase,
    private readonly buscar: BuscarInsumoUseCase,
    private readonly atualizarEstoque: AtualizarEstoqueUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra peça ou insumo' })
  @ApiResponse({ status: 201, description: 'Peça/insumo criado', type: InsumoResponseDto })
  @ApiResponse({ status: 409, description: 'Código já cadastrado' })
  @ApiAuthResponses()
  @ApiValidationResponses()
  async create(@Body() dto: CriarInsumoDto): Promise<InsumoResponseDto> {
    return InsumoResponseDto.fromDomain(await this.cadastrar.execute(dto));
  }

  @Get()
  @Roles(...FUNCIONARIOS)
  @ApiOperation({ summary: 'Lista peças e insumos' })
  @ApiResponse({ status: 200, description: 'Lista retornada', type: InsumoResponseDto, isArray: true })
  @ApiAuthResponses()
  async list(): Promise<InsumoResponseDto[]> {
    return (await this.listar.execute()).map((i) => InsumoResponseDto.fromDomain(i));
  }

  @Get(':id')
  @Roles(...FUNCIONARIOS)
  @ApiOperation({
    summary: 'Busca peça/insumo por id',
    description: 'Usado pelo OS Service para validar e precificar o item da OS.',
  })
  @ApiResponse({ status: 200, description: 'Peça/insumo encontrado', type: InsumoResponseDto })
  @ApiResponse({ status: 404, description: 'Peça/insumo não encontrado' })
  @ApiAuthResponses()
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InsumoResponseDto> {
    return InsumoResponseDto.fromDomain(await this.buscar.execute(id));
  }

  @Patch(':id/estoque')
  @ApiOperation({ summary: 'Atualiza estoque de peça/insumo', description: 'Define nova quantidade em estoque.' })
  @ApiResponse({ status: 200, description: 'Estoque atualizado', type: InsumoResponseDto })
  @ApiResponse({ status: 404, description: 'Peça/insumo não encontrado' })
  @ApiAuthResponses()
  @ApiValidationResponses()
  async updateEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarEstoqueDto,
  ): Promise<InsumoResponseDto> {
    return InsumoResponseDto.fromDomain(await this.atualizarEstoque.execute({ id, ...dto }));
  }
}
