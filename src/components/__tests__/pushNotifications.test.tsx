import { routeFromResponse } from '@/features/push/route';

const mockNavigate = jest.fn();
const mockIsReady = jest.fn(() => true);
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockIsReady(),
    navigate: (...a: unknown[]) => mockNavigate(...a),
  },
}));

function resp(data: Record<string, unknown> = {}) {
  return { notification: { request: { content: { data } } } } as never;
}

describe('routeFromResponse', () => {
  afterEach(() => jest.clearAllMocks());

  it('routes a teacher bus push to BusScreen under Main > Home', () => {
    routeFromResponse(resp({ kind: 'trip_started', trip_id: 't1' }), 'teacher');
    expect(mockNavigate).toHaveBeenCalledWith('Main', {
      screen: 'Home',
      params: { screen: 'BusScreen' },
    });
  });

  it('routes a principal bus push to BusScreen under Principal > PHome', () => {
    routeFromResponse(resp(), 'principal');
    expect(mockNavigate).toHaveBeenCalledWith('Principal', {
      screen: 'PHome',
      params: { screen: 'BusScreen' },
    });
  });

  it('does nothing when the response is null', () => {
    routeFromResponse(null, 'teacher');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does nothing when navigation is not ready', () => {
    mockIsReady.mockReturnValueOnce(false);
    routeFromResponse(resp(), 'teacher');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
