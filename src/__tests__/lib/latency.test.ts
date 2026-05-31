import { simulateLatency, maybeFail } from '@/lib/latency';
import { AppError } from '@/lib/errors';

describe('latency helpers', () => {
  it('simulateLatency resolves', async () => {
    await expect(simulateLatency(0)).resolves.toBeUndefined();
  });
  it('maybeFail(1) always throws AppError', () => {
    expect(() => maybeFail(1)).toThrow(AppError);
  });
  it('maybeFail(0) never throws', () => {
    expect(() => maybeFail(0)).not.toThrow();
  });
});
