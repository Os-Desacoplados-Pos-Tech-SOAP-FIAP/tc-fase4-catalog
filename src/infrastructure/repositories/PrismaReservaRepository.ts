import { Injectable } from '@nestjs/common';
import {
  Reserva as ReservaRow,
  ReservaItem as ReservaItemRow,
  StatusReserva as StatusReservaRow,
} from '@prisma/client';

import { Reserva, StatusReserva } from '../../domain/reserva/entities/Reserva';
import { IReservaRepository } from '../../domain/reserva/repositories/IReservaRepository';
import { UniqueID } from '../../domain/shared/UniqueID';
import { PrismaTransactionManager } from '../database/prisma-transaction.manager';

type ReservaComItens = ReservaRow & { itens: ReservaItemRow[] };

@Injectable()
export class PrismaReservaRepository implements IReservaRepository {
  constructor(private readonly db: PrismaTransactionManager) {}

  private toDomain(row: ReservaComItens): Reserva {
    return Reserva.restaurar(
      {
        osId: row.osId,
        status: StatusReserva[row.status],
        itens: row.itens.map((item) => ({ insumoId: item.insumoId, quantidade: item.quantidade })),
        criadoEm: row.criadoEm,
        atualizadoEm: row.atualizadoEm,
      },
      new UniqueID(row.id),
    );
  }

  async salvar(reserva: Reserva): Promise<void> {
    // Os itens de uma reserva são imutáveis; só o status muda depois de criada.
    await this.db.client.reserva.upsert({
      where: { id: reserva.id.toValue() },
      create: {
        id: reserva.id.toValue(),
        osId: reserva.osId,
        status: StatusReservaRow[reserva.status],
        itens: { create: reserva.itens },
      },
      update: { status: StatusReservaRow[reserva.status] },
    });
  }

  async buscarAtivaPorOs(osId: string): Promise<Reserva | null> {
    const row = await this.db.client.reserva.findFirst({
      where: { osId, status: StatusReservaRow.ATIVA },
      include: { itens: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async listarPorOs(osId: string): Promise<Reserva[]> {
    const rows = await this.db.client.reserva.findMany({
      where: { osId },
      include: { itens: true },
      orderBy: { criadoEm: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }
}
