import { DomainError } from '../../shared/DomainError';
import { ValueObject } from '../../shared/ValueObject';

interface CodigoPecaProps {
  value: string;
}

export class CodigoPeca extends ValueObject<CodigoPecaProps> {
  private constructor(props: CodigoPecaProps) {
    super(props);
  }

  public static create(input: string): CodigoPeca {
    const value = (input ?? '').trim().toUpperCase();
    if (value.length < 2) {
      throw new DomainError('Código de peça inválido', 'CODIGO_PECA_INVALIDO');
    }
    return new CodigoPeca({ value });
  }

  public get value(): string {
    return this.props.value;
  }
}
