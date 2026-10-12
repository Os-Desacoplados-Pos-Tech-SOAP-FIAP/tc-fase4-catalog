import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AtualizarServicoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorPadrao?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
