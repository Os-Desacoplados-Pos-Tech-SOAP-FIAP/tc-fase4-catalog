/** Comandos que o Catalog recebe do orquestrador (OS Service). */
export const CATALOG_COMMANDS = {
  RESERVAR_INSUMOS: 'catalog.reservar-insumos.v1',
  LIBERAR_RESERVAS: 'catalog.liberar-reservas.v1',
  BAIXAR_RESERVAS: 'catalog.baixar-reservas.v1',
} as const;

/** Eventos que o Catalog publica no tópico oficina-catalog-events.fifo. */
export const CATALOG_EVENTS = {
  INSUMOS_RESERVADOS: 'catalog.insumos-reservados.v1',
  RESERVA_INSUMOS_FALHOU: 'catalog.reserva-insumos-falhou.v1',
  RESERVAS_LIBERADAS: 'catalog.reservas-liberadas.v1',
  ESTOQUE_BAIXADO: 'catalog.estoque-baixado.v1',
} as const;

export interface ItemReservaPayload {
  insumoId: string;
  quantidade: number;
}

export interface ReservarInsumosPayload {
  itens: ItemReservaPayload[];
}

export interface InsumosReservadosPayload {
  osId: string;
  reservaId: string;
  itens: ItemReservaPayload[];
}

export interface ReservaInsumosFalhouPayload {
  osId: string;
  motivo: string;
  mensagem: string;
}

export interface ReservasLiberadasPayload {
  osId: string;
}

export interface EstoqueBaixadoPayload {
  osId: string;
  itens: ItemReservaPayload[];
}
