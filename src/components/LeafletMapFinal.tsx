import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

// Import global de Leaflet
declare const L: any;

const LeafletMapFinal = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const initMap = () => {
      // Charger Leaflet directement via CDN si pas disponible
      if (typeof window !== 'undefined' && !window.L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initLeafletMap();
        document.head.appendChild(script);
      } else {
        initLeafletMap();
      }
    };

    const initLeafletMap = () => {
      if (mapRef.current && !mapInstanceRef.current && window.L) {
        try {
          // Création de la carte
          const map = window.L.map(mapRef.current).setView([46.2276, 2.2137], 13);
          
          // Ajout d'une couche de tuiles
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 22,
            maxNativeZoom: 19
          }).addTo(map);
          
          mapInstanceRef.current = map;
          console.log('✅ Carte créée avec succès via CDN !');
        } catch (error) {
          console.error('❌ Erreur lors de la création de la carte:', error);
        }
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
      
      {/* Message de statut */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000,
          backgroundColor: 'rgba(33, 150, 243, 0.95)',
          color: 'white',
          padding: 2,
          borderRadius: 1,
          fontSize: '0.9rem',
          maxWidth: '350px',
        }}
      >
        🚀 <strong>Carte via CDN Leaflet</strong>
        <br />
        📍 Chargement direct depuis unpkg.com
        <br />
        <em style={{ fontSize: '0.8rem' }}>
          Cette approche évite tous les problèmes d'import
        </em>
      </Box>
    </Box>
  );
};

export default LeafletMapFinal;