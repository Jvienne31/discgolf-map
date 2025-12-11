import { useEffect } from 'react';
import { Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapContext } from '../contexts/MapContext';

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

  useEffect(() => {
    if (userLocation && fieldMode) {
      // Centrer la carte sur la position de l'utilisateur la première fois
      map.setView([userLocation.lat, userLocation.lng], map.getZoom());
    }
  }, [userLocation, fieldMode, map]);

  if (!userLocation || !fieldMode) {
    return null;
  }

  return (
    <>
      {/* Marqueur bleu pour la position */}
      <Marker
        position={[userLocation.lat, userLocation.lng]}
        icon={createUserLocationIcon()}
        zIndexOffset={1000}
      />
      
      {/* Cercle de précision (50m de rayon par exemple) */}
      <Circle
        center={[userLocation.lat, userLocation.lng]}
        radius={50}
        pathOptions={{
          color: '#4285F4',
          fillColor: '#4285F4',
          fillOpacity: 0.1,
          weight: 2,
          opacity: 0.5,
        }}
      />
    </>
  );
};
