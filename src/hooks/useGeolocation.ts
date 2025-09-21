import { useCallback, useMemo, useState } from 'react';

/**
 * Adapter (Object Structural Pattern) translating the browser Geolocation API into
 * a declarative React service with stateful semantics.
 */
export type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error' | 'unsupported';

export type GeolocationAdapterOptions = Pick<
  GeolocationPositionOptions,
  'enableHighAccuracy' | 'timeout' | 'maximumAge'
>;

const DEFAULT_OPTIONS: GeolocationAdapterOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

export const GEOLOCATION_ERROR_CODES = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

type GeolocationErrorCode = (typeof GEOLOCATION_ERROR_CODES)[keyof typeof GEOLOCATION_ERROR_CODES];

const createGeolocationError = (code: GeolocationErrorCode, message: string): GeolocationPositionError => ({
  code,
  message,
  PERMISSION_DENIED: GEOLOCATION_ERROR_CODES.PERMISSION_DENIED,
  POSITION_UNAVAILABLE: GEOLOCATION_ERROR_CODES.POSITION_UNAVAILABLE,
  TIMEOUT: GEOLOCATION_ERROR_CODES.TIMEOUT,
}) as GeolocationPositionError;

export interface GeolocationAdapter {
  status: GeolocationStatus;
  coords: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  options: GeolocationAdapterOptions;
  setOptions: (nextOptions: Partial<GeolocationAdapterOptions>) => void;
  requestCurrentPosition: (overrideOptions?: Partial<GeolocationAdapterOptions>) => void;
  isSupported: boolean;
}

export const useGeolocation = (
  initialOptions?: Partial<GeolocationAdapterOptions>,
): GeolocationAdapter => {
  const isSupported: boolean =
    typeof navigator !== 'undefined' && navigator != null && 'geolocation' in navigator;
  const geolocation: Geolocation | null = isSupported ? navigator.geolocation : null;

  const [status, setStatus] = useState<GeolocationStatus>(isSupported ? 'idle' : 'unsupported');
  const [coords, setCoords] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [options, setOptionsState] = useState<GeolocationAdapterOptions>(() => ({
    ...DEFAULT_OPTIONS,
    ...initialOptions,
  }));

  const setOptions = useCallback((nextOptions: Partial<GeolocationAdapterOptions>): void => {
    setOptionsState((previousOptions) => ({
      ...previousOptions,
      ...nextOptions,
    }));
  }, []);

  const requestCurrentPosition = useCallback(
    (overrideOptions?: Partial<GeolocationAdapterOptions>): void => {
      if (!geolocation) {
        setStatus('unsupported');
        setError(
          createGeolocationError(
            GEOLOCATION_ERROR_CODES.POSITION_UNAVAILABLE,
            'Geolocalização indisponível neste dispositivo.',
          ),
        );
        return;
      }

      setStatus('loading');
      setError(null);
      setCoords(null);

      const resolvedOptions: GeolocationAdapterOptions = {
        ...options,
        ...overrideOptions,
      };
      setOptionsState(resolvedOptions);

      try {
        geolocation.getCurrentPosition(
          (position: GeolocationPosition): void => {
            setCoords(position);
            setStatus('success');
          },
          (positionError: GeolocationPositionError): void => {
            setError(positionError);
            setStatus('error');
          },
          resolvedOptions,
        );
      } catch (requestError: unknown) {
        const fallbackError: GeolocationPositionError = createGeolocationError(
          GEOLOCATION_ERROR_CODES.POSITION_UNAVAILABLE,
          requestError instanceof Error
            ? requestError.message
            : 'Falha inesperada ao solicitar localização.',
        );
        setError(fallbackError);
        setStatus('error');
      }
    },
    [geolocation, options],
  );

  const adapter: GeolocationAdapter = useMemo(
    (): GeolocationAdapter => ({
      status,
      coords,
      error,
      options,
      setOptions,
      requestCurrentPosition,
      isSupported,
    }),
    [status, coords, error, options, setOptions, requestCurrentPosition, isSupported],
  );

  return adapter;
};

