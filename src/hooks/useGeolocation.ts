import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export const useGeolocation = (
  enabled: boolean = false,
  options: UseGeolocationOptions = {}
) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    if (!enabled) {
      setState({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: null,
        loading: false,
      });
      return;
    }

    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'La géolocalisation n\'est pas supportée par votre navigateur',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    const geoOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 10000,
      maximumAge: options.maximumAge ?? 0,
    };

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = 'Erreur de géolocalisation';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permission de géolocalisation refusée';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Position indisponible';
          break;
        case error.TIMEOUT:
          errorMessage = 'Délai de géolocalisation dépassé';
          break;
      }

      setState({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: errorMessage,
        loading: false,
      });
    };

    // Suivi en temps réel
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, options.enableHighAccuracy, options.timeout, options.maximumAge]);

  return state;
};
