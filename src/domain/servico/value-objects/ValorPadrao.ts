import { DomainError } from '../../shared/DomainError';
import { ValueObject } from '../../shared/ValueObject';

interface ValorPadraoProps {
  value: number;
}

export class ValorPadrao extends ValueObject<ValorPadraoProps> {
  private constructor(props: ValorPadraoProps) {
    super(props);
  }

  public static create(input: number): ValorPadrao {
    const value = Number(input);
    if (!Number.isFinite(value) || value < 0) {
      throw new DomainError(`Valor padrão inválido: ${input}`, 'VALOR_INVALIDO');
    }
    return new ValorPadrao({ value: Math.round(value * 100) / 100 });
  }

  public get value(): number {
    return this.props.value;
  }
}
