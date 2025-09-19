import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import 'leaflet/dist/leaflet.css';

// Import dynamique de Leaflet pour éviter les erreurs SSR
let L: any = null;

const LeafletMapBasic = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Import dynamique de Leaflet
    const initMap = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Import dynamique
          const leafletModule = await import('leaflet');
          L = leafletModule;
          
          if (mapRef.current && !mapInstanceRef.current) {
            // Création de la carte basique
            mapInstanceRef.current = L.map(mapRef.current).setView([46.2276, 2.2137], 13);
            
            // Ajout des tuiles OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de Leaflet:', error);
      }
    };

    initMap();

    // Nettoyage
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <Box
      ref={mapRef}
      sx={{
        height: '100%',
        width: '100%',
        '& .leaflet-container': {
          height: '100%',
          width: '100%'
        }
      }}
    />
  );
};

export default LeafletMapBasic;