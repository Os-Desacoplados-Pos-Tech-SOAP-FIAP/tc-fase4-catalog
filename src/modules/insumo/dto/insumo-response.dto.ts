import { ApiProperty } from '@nestjs/swagger';

import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';

export class InsumoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() codigo!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ enum: TipoInsumo }) tipo!: TipoInsumo;
  @ApiProperty() valorUnitario!: number;
  @ApiProperty() quantidadeEstoque!: number;
  @ApiProperty() quantidadeReservada!: number;
  @ApiProperty() quantidadeDisponivel!: number;
  @ApiProperty() criadoEm!: Date;
  @ApiProperty() atualizadoEm!: Date;

  static fromDomain(p: Insumo): InsumoResponseDto {
    return {
      id: p.id.toValue(),
      codigo: p.codigo.value,
      nome: p.nome,
      tipo: p.tipo,
      valorUnitario: p.valorUnitario.value,
      quantidadeEstoque: p.estoque.quantidade,
      quantidadeReservada: p.estoque.quantidadeReservada,
      quantidadeDisponivel: p.estoque.disponivel,
      criadoEm: p.criadoEm,
      atualizadoEm: p.atualizadoEm,
    };
  }
}
