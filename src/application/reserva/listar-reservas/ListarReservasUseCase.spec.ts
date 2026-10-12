import { Reserva } from '../../../domain/reserva/entities/Reserva';
import { InMemoryReservaRepository } from '../../../../test/fakes/in-memory-reserva.repository';
import { ListarReservasUseCase } from './ListarReservasUseCase';

describe('ListarReservasUseCase', () => {
  it('lista as reservas da OS', async () => {
    const repo = new InMemoryReservaRepository();
    await repo.salvar(Reserva.criar('os-1', []));
    await repo.salvar(Reserva.criar('os-2', []));
    const resultado = await new ListarReservasUseCase(repo).execute('os-1');
    expect(resultado.map((r) => r.osId)).toEqual(['os-1']);
  });
});
