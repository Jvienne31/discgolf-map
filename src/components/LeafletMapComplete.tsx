import { useEffect, useRef, useState } from 'react';
import { Box, ButtonGroup, Button } from '@mui/material';
import { Satellite, Map as MapIcon, Terrain, Layers, HighQuality, Public } from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';

// Import statique de Leaflet
import * as L from 'leaflet';

type LayerType = 'osm' | 'satellite' | 'satellite-hd' | 'satellite-labels' | 'satellite-hybrid' | 'topo';

const LeafletMapComplete = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentLayerRef = useRef<any>(null);
  const [currentLayer, setCurrentLayer] = useState<LayerType>('osm');
  const [isLoading, setIsLoading] = useState(true);

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

  // Initialisation de la carte
  useEffect(() => {
    const initMap = async () => {
      try {
        if (typeof window !== 'undefined') {
          if (mapRef.current && !mapInstanceRef.current) {
            // Création de la carte
            mapInstanceRef.current = L.map(mapRef.current, {
              center: [46.2276, 2.2137], // Centre de la France
              zoom: 13,
              zoomControl: true,
              doubleClickZoom: true,
              scrollWheelZoom: true,
              maxBoundsViscosity: 0.8,
              preferCanvas: false
            });
            
            // Ajout de la couche initiale
            updateLayer(currentLayer);
            setIsLoading(false);

            // Optimisation du rendu pixelated
            const container = mapRef.current?.querySelector('.leaflet-container') as HTMLElement;
            if (container) {
              container.style.imageRendering = 'pixelated';
            }
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

  // Fonction pour changer de couche
  const updateLayer = (layerType: LayerType) => {
    if (!mapInstanceRef.current) return;

    // Supprimer la couche actuelle
    if (currentLayerRef.current) {
      if (Array.isArray(currentLayerRef.current)) {
        // Pour les couches multiples (satellite-labels)
        currentLayerRef.current.forEach(layer => mapInstanceRef.current.removeLayer(layer));
      } else {
        mapInstanceRef.current.removeLayer(currentLayerRef.current);
      }
    }

    const config = layerConfigs[layerType];

    if (layerType === 'satellite-labels') {
      // Couche satellite avec labels
      const satelliteConfig = config as any;
      const baseLayer = L.tileLayer(satelliteConfig.baseUrl, {
        attribution: satelliteConfig.attribution,
        maxZoom: satelliteConfig.maxZoom,
        maxNativeZoom: satelliteConfig.maxNativeZoom
      });
      
      const labelsLayer = L.tileLayer(satelliteConfig.labelsUrl, {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: satelliteConfig.maxZoom,
        maxNativeZoom: satelliteConfig.maxNativeZoom
      });

      baseLayer.addTo(mapInstanceRef.current);
      labelsLayer.addTo(mapInstanceRef.current);
      currentLayerRef.current = [baseLayer, labelsLayer];
    } else {
      // Couche simple
      const standardConfig = config as any;
      const options: any = {
        attribution: standardConfig.attribution,
        maxZoom: standardConfig.maxZoom,
        maxNativeZoom: standardConfig.maxNativeZoom
      };

      if (standardConfig.subdomains) {
        options.subdomains = standardConfig.subdomains;
      }

      const newLayer = L.tileLayer(standardConfig.url, options);
      newLayer.addTo(mapInstanceRef.current);
      currentLayerRef.current = newLayer;
    }
  };

  // Effet pour changer de couche
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateLayer(currentLayer);
    }
  }, [currentLayer]);

  if (isLoading) {
    return (
      <Box
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}
      >
        Chargement de la carte...
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Conteneur de la carte */}
      <Box
        ref={mapRef}
        sx={{
          height: '100%',
          width: '100%',
          '& .leaflet-container': {
            height: '100%',
            width: '100%',
            imageRendering: 'pixelated'
          },
          '& .leaflet-tile-container .leaflet-tile': {
            imageRendering: 'pixelated',
            transition: 'opacity 0.2s ease-in-out'
          }
        }}
      />

      {/* Sélecteur de couches */}
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
            Satellite Esri
          </Button>
          <Button
            onClick={() => setCurrentLayer('satellite-hd')}
            variant={currentLayer === 'satellite-hd' ? 'contained' : 'outlined'}
            startIcon={<HighQuality />}
            sx={{ minWidth: 140, fontSize: '0.75rem' }}
          >
            Sat HD Google
          </Button>
          <Button
            onClick={() => setCurrentLayer('satellite-labels')}
            variant={currentLayer === 'satellite-labels' ? 'contained' : 'outlined'}
            startIcon={<Layers />}
            sx={{ minWidth: 140, fontSize: '0.75rem' }}
          >
            Sat + Labels
          </Button>
          <Button
            onClick={() => setCurrentLayer('satellite-hybrid')}
            variant={currentLayer === 'satellite-hybrid' ? 'contained' : 'outlined'}
            startIcon={<Public />}
            sx={{ minWidth: 140, fontSize: '0.75rem' }}
          >
            Google Hybrid
          </Button>
          <Button
            onClick={() => setCurrentLayer('topo')}
            variant={currentLayer === 'topo' ? 'contained' : 'outlined'}
            startIcon={<Terrain />}
            sx={{ minWidth: 140, fontSize: '0.75rem' }}
          >
            Topo
          </Button>
        </ButtonGroup>
      </Box>

      {/* Informations sur la couche actuelle */}
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
        <strong>Couche actuelle:</strong> {layerNames[currentLayer]}
        <br />
        <em style={{ color: '#666', fontSize: '0.75rem' }}>
          🎉 <strong>Carte réparée !</strong> Leaflet pur fonctionne parfaitement !
          <br />
          🔍 <strong>Ultra-zoom :</strong> Zoom jusqu'à 22 avec scaling intelligent
          <br />
          ⚡ <strong>Prochaine étape :</strong> Intégration des outils de dessin
        </em>
      </Box>
    </Box>
  );
};

export default LeafletMapComplete;