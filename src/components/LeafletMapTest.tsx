import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import 'leaflet/dist/leaflet.css';

const LeafletMapTest = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initMap = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Import dynamique de Leaflet
          const L = await import('leaflet');
          
          if (mapRef.current && !mapInstanceRef.current) {
            // Création de la carte
            const map = L.map(mapRef.current).setView([46.2276, 2.2137], 13);
            
            // Ajout d'une couche de tuiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 22,
              maxNativeZoom: 19
            }).addTo(map);
            
            mapInstanceRef.current = map;
            setIsLoading(false);
            
            console.log('Carte initialisée avec succès !');
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de Leaflet:', error);
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <Box
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          fontSize: '1.2rem'
        }}
      >
        Chargement de la carte de test...
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
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
      
      {/* Message de succès */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000,
          backgroundColor: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
          padding: 2,
          borderRadius: 1,
          fontSize: '0.9rem',
          maxWidth: '300px',
        }}
      >
        🎉 <strong>Carte de test réussie !</strong>
        <br />
        Import dynamique de Leaflet fonctionnel
      </Box>
    </Box>
  );
};

export default LeafletMapTest;