import { useEffect } from 'react';
import { Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapContext } from '../contexts/MapContext';
import { useGeolocation } from '../hooks/useGeolocation';

// Icône personnalisée pour la position de l'utilisateur
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #4285F4;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(66, 133, 244, 0.5);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(66, 133, 244, 0);
          }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export const UserLocationMarker = () => {
  const map = useMap();
  const { userLocation, fieldMode } = useMapContext();
  const geoState = useGeolocation(fieldMode);

  useEffect(() => {
    if (userLocation && fieldMode) {
      // Centrer la carte sur la position de l'utilisateur la première fois
      map.setView([userLocation.lat, userLocation.lng], map.getZoom());
    }
  }, [userLocation, fieldMode, map]);

  if (!userLocation || !fieldMode) {
    return null;
  }

  // Utiliser la précision réelle du GPS (en mètres)
  const accuracyRadius = geoState.accuracy || 50;

  return (
    <>
      {/* Marqueur bleu pour la position */}
      <Marker
        position={[userLocation.lat, userLocation.lng]}
        icon={createUserLocationIcon()}
        zIndexOffset={1000}
      />
      
      {/* Cercle de précision dynamique basé sur l'accuracy GPS */}
      <Circle
        center={[userLocation.lat, userLocation.lng]}
        radius={accuracyRadius}
        pathOptions={{
          color: accuracyRadius < 10 ? '#34A853' : accuracyRadius < 30 ? '#4285F4' : '#FBBC05',
          fillColor: accuracyRadius < 10 ? '#34A853' : accuracyRadius < 30 ? '#4285F4' : '#FBBC05',
          fillOpacity: 0.1,
          weight: 2,
          opacity: 0.5,
        }}
      />
    </>
  );
};
