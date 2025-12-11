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
  const [highAccuracyFailed, setHighAccuracyFailed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setState({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: null,
        loading: false,
      });
      setHighAccuracyFailed(false);
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

    // Essayer d'abord avec haute précision, puis fallback si échec
    const useHighAccuracy = !highAccuracyFailed && (options.enableHighAccuracy ?? true);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: useHighAccuracy,
      timeout: useHighAccuracy ? 15000 : 10000, // Timeout plus court pour fallback
      maximumAge: useHighAccuracy ? 5000 : 30000, // Accepter position plus ancienne en fallback
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
          setState({
            latitude: null,
            longitude: null,
            accuracy: null,
            error: errorMessage,
            loading: false,
          });
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Position indisponible';
          if (!highAccuracyFailed && useHighAccuracy) {
            console.log('Haute précision échouée, tentative en mode basse précision...');
            setHighAccuracyFailed(true);
          } else {
            setState({
              latitude: null,
              longitude: null,
              accuracy: null,
              error: errorMessage,
              loading: false,
            });
          }
          break;
        case error.TIMEOUT:
          if (!highAccuracyFailed && useHighAccuracy) {
            console.log('Timeout haute précision, tentative en mode basse précision...');
            setHighAccuracyFailed(true);
          } else {
            errorMessage = 'Délai de géolocalisation dépassé';
            setState({
              latitude: null,
              longitude: null,
              accuracy: null,
              error: errorMessage,
              loading: false,
            });
          }
          break;
      }
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
  }, [enabled, options.enableHighAccuracy, options.timeout, options.maximumAge, highAccuracyFailed]);

  return state;
};
