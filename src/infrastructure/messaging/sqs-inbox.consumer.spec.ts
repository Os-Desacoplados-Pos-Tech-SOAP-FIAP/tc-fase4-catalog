import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';

import { MessageHandlerRegistry } from './message-handler.registry';
import { lerMessagingConfig } from './messaging.config';
import { SqsInboxConsumer } from './sqs-inbox.consumer';

const corpo = (messageId: string, correlationId: string) =>
  JSON.stringify({ messageId, type: 'x.v1', occurredAt: 'agora', correlationId, payload: {} });

describe('SqsInboxConsumer', () => {
  const sqs = mockClient(SQSClient);
  let registry: MessageHandlerRegistry;
  let handler: jest.Mock;
  let consumer: SqsInboxConsumer;

  beforeEach(() => {
    sqs.reset();
    registry = new MessageHandlerRegistry();
    handler = jest.fn().mockResolvedValue(undefined);
    registry.registrar('x.v1', handler);
    consumer = new SqsInboxConsumer(
      new SQSClient({}),
      lerMessagingConfig({ CATALOG_INBOX_QUEUE_URL: 'url-fila' }),
      registry,
    );
  });

  const receber = (...mensagens: { id: string; corpo: string; grupo: string }[]) =>
    sqs.on(ReceiveMessageCommand).resolves({
      Messages: mensagens.map((m) => ({
        MessageId: m.id,
        ReceiptHandle: `rh-${m.id}`,
        Body: m.corpo,
        Attributes: { MessageGroupId: m.grupo },
      })),
    });

  it('processa e apaga a mensagem da fila', async () => {
    receber({ id: '1', corpo: corpo('m1', 'os-1'), grupo: 'os-1' });
    await consumer.consumirLote();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(sqs.commandCalls(DeleteMessageCommand)[0].args[0].input).toEqual({
      QueueUrl: 'url-fila',
      ReceiptHandle: 'rh-1',
    });
  });

  it('não apaga mensagem com falha (volta para a fila e vai à DLQ após 3 tentativas)', async () => {
    handler.mockRejectedValueOnce(new Error('boom'));
    receber({ id: '1', corpo: corpo('m1', 'os-1'), grupo: 'os-1' });
    await consumer.consumirLote();
    expect(sqs.commandCalls(DeleteMessageCommand)).toHaveLength(0);
  });

  it('não apaga mensagem fora do contrato', async () => {
    receber({ id: '1', corpo: '{lixo', grupo: 'os-1' });
    await consumer.consumirLote();
    expect(handler).not.toHaveBeenCalled();
    expect(sqs.commandCalls(DeleteMessageCommand)).toHaveLength(0);
  });

  it('após falha, pula as próximas mensagens do mesmo grupo e segue com os outros', async () => {
    handler.mockRejectedValueOnce(new Error('boom'));
    receber(
      { id: '1', corpo: corpo('m1', 'os-1'), grupo: 'os-1' },
      { id: '2', corpo: corpo('m2', 'os-1'), grupo: 'os-1' },
      { id: '3', corpo: corpo('m3', 'os-2'), grupo: 'os-2' },
    );
    await consumer.consumirLote();
    expect(handler.mock.calls.map((c) => c[0].messageId)).toEqual(['m1', 'm3']);
    expect(sqs.commandCalls(DeleteMessageCommand).map((c) => c.args[0].input.ReceiptHandle)).toEqual([
      'rh-3',
    ]);
  });

  it('lote vazio não faz nada', async () => {
    sqs.on(ReceiveMessageCommand).resolves({});
    await consumer.consumirLote();
    expect(handler).not.toHaveBeenCalled();
  });

  it('não inicia o loop com a mensageria desligada', () => {
    const desligado = new SqsInboxConsumer(
      new SQSClient({}),
      lerMessagingConfig({ MESSAGING_ENABLED: 'false' }),
      registry,
    );
    desligado.onApplicationBootstrap();
    expect(sqs.commandCalls(ReceiveMessageCommand)).toHaveLength(0);
  });

  it('com a mensageria ligada consome até o shutdown', async () => {
    sqs.on(ReceiveMessageCommand).callsFake(async () => {
      consumer.onApplicationShutdown();
      return {};
    });
    consumer.onApplicationBootstrap();
    await new Promise((resolve) => setImmediate(resolve));
    expect(sqs.commandCalls(ReceiveMessageCommand).length).toBeGreaterThanOrEqual(1);
  });
});
