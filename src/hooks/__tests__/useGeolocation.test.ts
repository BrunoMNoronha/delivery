import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GEOLOCATION_ERROR_CODES, useGeolocation } from '../useGeolocation';

type GetCurrentPositionArgs = Parameters<Geolocation['getCurrentPosition']>;

const createMockPosition = (latitude: number, longitude: number): GeolocationPosition => ({
  coords: {
    accuracy: 20,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude,
    longitude,
    speed: null,
  } as GeolocationCoordinates,
  timestamp: Date.now(),
}) as GeolocationPosition;

const createMockError = (code: number, message: string): GeolocationPositionError => ({
  code,
  message,
  PERMISSION_DENIED: GEOLOCATION_ERROR_CODES.PERMISSION_DENIED,
  POSITION_UNAVAILABLE: GEOLOCATION_ERROR_CODES.POSITION_UNAVAILABLE,
  TIMEOUT: GEOLOCATION_ERROR_CODES.TIMEOUT,
}) as GeolocationPositionError;

describe('useGeolocation', () => {
  const originalGeolocation = navigator.geolocation;
  let getCurrentPositionSpy: ReturnType<typeof vi.fn>;

  beforeEach((): void => {
    getCurrentPositionSpy = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: getCurrentPositionSpy,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      } as unknown as Geolocation,
      configurable: true,
    });
  });

  afterEach((): void => {
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeolocation,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(navigator, 'geolocation');
    }
    vi.restoreAllMocks();
  });

  it('expõe coordenadas quando a requisição tem sucesso', async (): Promise<void> => {
    const mockPosition = createMockPosition(-23.5505, -46.6333);

    getCurrentPositionSpy.mockImplementation(
      (successCallback: GetCurrentPositionArgs[0], _errorCallback?: GetCurrentPositionArgs[1], options?: GetCurrentPositionArgs[2]): void => {
        expect(options?.maximumAge).toBe(15000);
        successCallback(mockPosition);
      },
    );

    const { result } = renderHook(() => useGeolocation({ maximumAge: 15000 }));

    act((): void => {
      result.current.requestCurrentPosition();
    });

    await waitFor((): void => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.coords).toBe(mockPosition);
    expect(result.current.error).toBeNull();
  });

  it('propaga o erro quando a API falha', async (): Promise<void> => {
    const mockError = createMockError(
      GEOLOCATION_ERROR_CODES.PERMISSION_DENIED,
      'Permissão negada pelo usuário.',
    );

    getCurrentPositionSpy.mockImplementation(
      (_successCallback: GetCurrentPositionArgs[0], errorCallback?: GetCurrentPositionArgs[1]): void => {
        errorCallback?.(mockError);
      },
    );

    const { result } = renderHook(() => useGeolocation());

    act((): void => {
      result.current.requestCurrentPosition();
    });

    await waitFor((): void => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('mantém o estado consistente em erros de timeout', async (): Promise<void> => {
    const mockError = createMockError(GEOLOCATION_ERROR_CODES.TIMEOUT, 'Tempo limite atingido.');

    getCurrentPositionSpy.mockImplementation(
      (
        _successCallback: GetCurrentPositionArgs[0],
        errorCallback?: GetCurrentPositionArgs[1],
        options?: GetCurrentPositionArgs[2],
      ): void => {
        expect(options?.timeout).toBe(2000);
        expect(options?.maximumAge).toBe(5000);
        errorCallback?.(mockError);
      },
    );

    const { result } = renderHook(() => useGeolocation({ timeout: 2000, maximumAge: 5000 }));

    act((): void => {
      result.current.requestCurrentPosition();
    });

    await waitFor((): void => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error?.code).toBe(GEOLOCATION_ERROR_CODES.TIMEOUT);
    expect(result.current.options.timeout).toBe(2000);
    expect(result.current.options.maximumAge).toBe(5000);
  });
});

