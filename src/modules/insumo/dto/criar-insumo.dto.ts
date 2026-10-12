import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator';

import { TipoInsumo } from '../../../domain/insumo/entities/Insumo';

export class CriarInsumoDto {
  @ApiProperty({ example: 'PEC-001' })
  @IsString()
  @MinLength(2)
  codigo!: string;

  @ApiProperty({ example: 'Filtro de óleo' })
  @IsString()
  @MinLength(2)
  nome!: string;

  @ApiProperty({ enum: TipoInsumo, example: TipoInsumo.PECA })
  @IsEnum(TipoInsumo)
  tipo!: TipoInsumo;

  @ApiProperty({ example: 35.9 })
  @IsNumber()
  @Min(0)
  valorUnitario!: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  quantidadeEstoque!: number;
}
