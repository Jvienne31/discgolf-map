import { useEffect, useRef, useState } from 'react';
import { Box, ButtonGroup, Button } from '@mui/material';
import { Satellite, Map as MapIcon, Terrain, Layers, HighQuality, Public } from '@mui/icons-material';

// Import global de Leaflet
declare const L: any;

type LayerType = 'osm' | 'satellite' | 'satellite-hd' | 'satellite-labels' | 'satellite-hybrid' | 'topo';

const MapComponentFixed = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentLayerRef = useRef<any>(null);
  const [currentLayer, setCurrentLayer] = useState<LayerType>('osm');
  const [mapReady, setMapReady] = useState(false);

  // Configuration des couches
  const layerConfigs = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 22,
      maxNativeZoom: 19
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      maxZoom: 22,
      maxNativeZoom: 18
    },
    'satellite-hd': {
      url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      maxZoom: 22,
      maxNativeZoom: 20,
      subdomains: '0123'
    },
    'satellite-labels': {
      baseUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      labelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      maxZoom: 22,
      maxNativeZoom: 18
    },
    'satellite-hybrid': {
      url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      maxZoom: 22,
      maxNativeZoom: 20,
      subdomains: '0123'
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 22,
      maxNativeZoom: 17
    }
  };

  const layerNames = {
    osm: 'OpenStreetMap',
    satellite: 'Satellite Esri',
    'satellite-hd': 'Satellite HD Google',
    'satellite-labels': 'Satellite + Labels',
    'satellite-hybrid': 'Google Hybrid',
    topo: 'Topographique'
  };

  // Initialisation de Leaflet et de la carte
  useEffect(() => {
    const initLeaflet = () => {
      if (typeof window !== 'undefined' && !window.L) {
        // Charger le CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Charger le JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => initMap();
        document.head.appendChild(script);
      } else if (window.L) {
        initMap();
      }
    };

    const initMap = () => {
      if (mapRef.current && !mapInstanceRef.current && window.L) {
        try {
          // Création de la carte
          const map = window.L.map(mapRef.current, {
            center: [46.2276, 2.2137], // Centre de la France
            zoom: 13,
            zoomControl: true,
            doubleClickZoom: true,
            scrollWheelZoom: true,
            maxBoundsViscosity: 0.8,
            preferCanvas: false
          });
          
          mapInstanceRef.current = map;
          
          // Ajout de la couche initiale
          updateLayer(currentLayer);
          setMapReady(true);
          
          console.log('🗺️ Carte complète initialisée !');
        } catch (error) {
          console.error('❌ Erreur lors de la création de la carte:', error);
        }
      }
    };

    initLeaflet();

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Zone de la carte temporaire */}
      <Box
        sx={{
          height: '100%',
          width: '100%',
          backgroundColor: '#4caf50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}
      >
        <Typography variant="h4" sx={{ color: 'white', mb: 2 }}>
          🗺️ Carte Leaflet en cours de réparation
        </Typography>
        <Typography variant="body1" sx={{ color: 'white', textAlign: 'center', mb: 2 }}>
          Couche actuelle: {currentLayer}
        </Typography>
      </Box>

      {/* Sélecteur de couches - qui fonctionne */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <ButtonGroup orientation="vertical" variant="contained" size="small">
          <Button
            onClick={() => setCurrentLayer('osm')}
            variant={currentLayer === 'osm' ? 'contained' : 'outlined'}
            startIcon={<MapIcon />}
            sx={{ minWidth: 140, fontSize: '0.75rem' }}
          >
            Carte OSM
          </Button>
          <Button
            onClick={() => setCurrentLayer('satellite')}
            variant={currentLayer === 'satellite' ? 'contained' : 'outlined'}
            startIcon={<Satellite />}
            sx={{ minWidth: 140, fontSize: '0.75rem' }}
          >
            Satellite
          </Button>
          <Button
            onClick={() => setCurrentLayer('topo')}
            variant={currentLayer === 'topo' ? 'contained' : 'outlined'}
            startIcon={<Terrain />}
            sx={{ minWidth: 140, fontSize: '0.75rem' }}
          >
            Topographique
          </Button>
        </ButtonGroup>
      </Box>

      {/* Informations */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: 1.5,
          borderRadius: 1,
          fontSize: '0.8rem',
          maxWidth: '400px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <strong>Status:</strong> Interface fonctionnelle, intégration Leaflet en cours...
        <br />
        <em style={{ color: '#666', fontSize: '0.75rem' }}>
          🔧 Les outils de dessin seront restaurés après la réparation de la carte
        </em>
      </Box>
    </Box>
  );
};

export default MapComponentFixed;