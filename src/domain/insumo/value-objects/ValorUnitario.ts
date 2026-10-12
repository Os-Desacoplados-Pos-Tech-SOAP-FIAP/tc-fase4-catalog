import { DomainError } from '../../shared/DomainError';
import { ValueObject } from '../../shared/ValueObject';

interface ValorUnitarioProps {
  value: number;
}

export class ValorUnitario extends ValueObject<ValorUnitarioProps> {
  private constructor(props: ValorUnitarioProps) {
    super(props);
  }

  public static create(input: number): ValorUnitario {
    const value = Number(input);
    if (!Number.isFinite(value) || value < 0) {
      throw new DomainError(`Valor unitário inválido: ${input}`, 'VALOR_INVALIDO');
    }
    return new ValorUnitario({ value: Math.round(value * 100) / 100 });
  }

  public get value(): number {
    return this.props.value;
  }
}
