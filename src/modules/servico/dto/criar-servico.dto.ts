import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CriarServicoDto {
  @ApiProperty({ example: 'Troca de óleo' })
  @IsString()
  @MinLength(2)
  nome!: string;

  @ApiProperty({ example: 'Troca completa de óleo do motor e filtro' })
  @IsString()
  descricao!: string;

  @ApiProperty({ example: 120.5 })
  @IsNumber()
  @Min(0)
  valorPadrao!: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
