import { ApiProperty } from '@nestjs/swagger';

import { Servico } from '../../../domain/servico/entities/Servico';

export class ServicoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty() valorPadrao!: number;
  @ApiProperty() ativo!: boolean;
  @ApiProperty() criadoEm!: Date;
  @ApiProperty() atualizadoEm!: Date;

  static fromDomain(s: Servico): ServicoResponseDto {
    return {
      id: s.id.toValue(),
      nome: s.nome,
      descricao: s.descricao,
      valorPadrao: s.valorPadrao.value,
      ativo: s.ativo,
      criadoEm: s.criadoEm,
      atualizadoEm: s.atualizadoEm,
    };
  }
}
