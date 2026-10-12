import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AtualizarEstoqueDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(0)
  quantidade!: number;
}
