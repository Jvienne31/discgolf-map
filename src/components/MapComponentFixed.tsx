import { useEffect, useRef, useState } from 'react';
import { Box, ButtonGroup, Button, Typography } from '@mui/material';
import { Satellite, Map as MapIcon, Terrain } from '@mui/icons-material';

declare const L: any;

type LayerType = 'osm' | 'satellite' | 'satellite-hd' | 'satellite-labels' | 'satellite-hybrid' | 'topo';

const MapComponentFixed = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentLayerRef = useRef<any>(null);
  const [currentLayer, setCurrentLayer] = useState<LayerType>('osm');
  const [mapReady, setMapReady] = useState(false);

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

  const updateLayer = (layerId: LayerType) => {
    if (!mapInstanceRef.current) return;

    if (currentLayerRef.current) {
        mapInstanceRef.current.removeLayer(currentLayerRef.current);
    }

    const config = layerConfigs[layerId];
    if (!config) return;

    if (layerId === 'satellite-labels' && 'baseUrl' in config) {
        const baseLayer = L.tileLayer((config as any).baseUrl, { ...config, attribution: '' });
        const labelsLayer = L.tileLayer((config as any).labelsUrl, { ...config, attribution: config.attribution });
        const groupLayer = L.layerGroup([baseLayer, labelsLayer]);
        currentLayerRef.current = groupLayer;
    } else if ('url' in config) {
        currentLayerRef.current = L.tileLayer(config.url, config);
    }

    if (currentLayerRef.current) {
        mapInstanceRef.current.addLayer(currentLayerRef.current);
    }
  };

  useEffect(() => {
    if (mapReady) {
      updateLayer(currentLayer);
    }
  }, [currentLayer, mapReady]);

  useEffect(() => {
    const initLeaflet = () => {
      if (typeof window !== 'undefined' && !window.L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initMap();
        document.head.appendChild(script);
      } else if (window.L) {
        initMap();
      }
    };

    const initMap = () => {
      if (mapRef.current && !mapInstanceRef.current && window.L) {
        try {
          const map = window.L.map(mapRef.current, {
            center: [46.2276, 2.2137],
            zoom: 13,
            zoomControl: true,
            doubleClickZoom: true,
            scrollWheelZoom: true,
            maxBoundsViscosity: 0.8,
            preferCanvas: false
          });
          
          mapInstanceRef.current = map;
          
          updateLayer(currentLayer);
          setMapReady(true);
          
          console.log('🗺️ Carte complète initialisée !');
        } catch (error) {
          console.error('❌ Erreur lors de la création de la carte:', error);
        }
      }
    };

    initLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <Box ref={mapRef} sx={{ height: '100%', width: '100%' }} />

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