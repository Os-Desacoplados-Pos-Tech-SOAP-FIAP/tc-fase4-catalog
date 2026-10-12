import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';

import { criarEnvelope } from '../../application/ports/message-envelope';
import { SnsSqsTransport } from './sns-sqs.transport';

describe('SnsSqsTransport', () => {
  const sns = mockClient(SNSClient);
  const sqs = mockClient(SQSClient);
  const transporte = new SnsSqsTransport(new SNSClient({}), new SQSClient({}));
  const envelope = criarEnvelope('catalog.x.v1', 'os-1', { a: 1 });

  beforeEach(() => {
    sns.reset();
    sqs.reset();
  });

  it('publica no tópico FIFO com grupo = OS e deduplicação = messageId', async () => {
    await transporte.enviar('arn:aws:sns:us-east-1:1:oficina-catalog-events.fifo', envelope);
    const chamada = sns.commandCalls(PublishCommand)[0].args[0].input;
    expect(chamada).toMatchObject({
      TopicArn: 'arn:aws:sns:us-east-1:1:oficina-catalog-events.fifo',
      MessageGroupId: 'os-1',
      MessageDeduplicationId: envelope.messageId,
      MessageAttributes: { type: { DataType: 'String', StringValue: 'catalog.x.v1' } },
    });
    expect(JSON.parse(chamada.Message!)).toEqual(envelope);
    expect(sqs.commandCalls(SendMessageCommand)).toHaveLength(0);
  });

  it('envia direto para uma fila quando o destino é URL', async () => {
    await transporte.enviar('https://sqs.us-east-1.amazonaws.com/1/fila.fifo', envelope);
    expect(sqs.commandCalls(SendMessageCommand)[0].args[0].input).toMatchObject({
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/1/fila.fifo',
      MessageGroupId: 'os-1',
    });
  });
});
