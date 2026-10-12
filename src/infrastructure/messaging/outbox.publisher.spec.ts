import { lerMessagingConfig } from './messaging.config';
import { OutboxPublisher } from './outbox.publisher';

describe('OutboxPublisher (ciclo de vida)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const criar = (enabled: boolean) => {
    const publisher = new OutboxPublisher(
      {} as never,
      {} as never,
      lerMessagingConfig({ MESSAGING_ENABLED: String(enabled) }),
    );
    const publicar = jest.spyOn(publisher, 'publicarPendentes').mockResolvedValue(0);
    return { publisher, publicar };
  };

  it('publica a cada segundo enquanto a aplicação está no ar', async () => {
    const { publisher, publicar } = criar(true);
    publisher.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(3000);
    expect(publicar).toHaveBeenCalledTimes(3);
    publisher.onApplicationShutdown();
    await jest.advanceTimersByTimeAsync(3000);
    expect(publicar).toHaveBeenCalledTimes(3);
  });

  it('não agenda nada com a mensageria desligada', () => {
    const { publisher, publicar } = criar(false);
    publisher.onApplicationBootstrap();
    jest.advanceTimersByTime(3000);
    expect(publicar).not.toHaveBeenCalled();
    publisher.onApplicationShutdown();
  });

  it('erro num ciclo não derruba os próximos', async () => {
    const { publisher, publicar } = criar(true);
    publicar.mockRejectedValueOnce(new Error('sns fora'));
    publisher.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(2000);
    expect(publicar).toHaveBeenCalledTimes(2);
    publisher.onApplicationShutdown();
  });
});
