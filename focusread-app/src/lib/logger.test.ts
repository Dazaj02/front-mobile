import { logger } from './logger';

describe('logger', () => {
  it('imprime en desarrollo', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('hola');
    expect(spy).toHaveBeenCalledWith('hola');
    spy.mockRestore();
  });
});
