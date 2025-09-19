import { useState, useEffect } from 'react';
import { MapContainer } from 'react-leaflet';
import { Box, ButtonGroup, Button } from '@mui/material';
import { Satellite, Map as MapIcon, Terrain, Layers, HighQuality, Public } from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';
import '../styles/leaflet-tiles.css';
import '../styles/drawing-tools.css';
import '../utils/leaflet-config';
import { LayerSelector } from './LayerSelector';
import { initializeTileEnhancements } from '../utils/tile-enhancements';

type LayerType = 'osm' | 'satellite' | 'satellite-hd' | 'satellite-labels' | 'satellite-hybrid' | 'topo';

const MapComponent = () => {
  const position: [number, number] = [46.2276, 2.2137]; // Centre de la France par défaut
  const [currentLayer, setCurrentLayer] = useState<LayerType>('osm');

  // Initialiser les améliorations de tuiles au montage du composant
  useEffect(() => {
    initializeTileEnhancements();
  }, []);

  const layerNames = {
    osm: 'OpenStreetMap (Zoom max: 19)',
    satellite: 'Vue Satellite Esri (Zoom max: 22 avec scaling)',
    'satellite-hd': 'Satellite HD Google (Zoom max: 21)',
    'satellite-labels': 'Satellite + Labels (Zoom max: 22 avec scaling)',
    'satellite-hybrid': 'Google Hybrid (Zoom max: 21)',
    topo: 'Topographique (Zoom max: 17)'
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={position}
        zoom={13}
        minZoom={1}
        maxZoom={22}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        doubleClickZoom={true}
        scrollWheelZoom={true}
        maxBoundsViscosity={0.8}
        // Paramètres pour améliorer le rendu des tuiles
        preferCanvas={false}
        // Optimisations pour le scaling
        whenReady={() => {
          // Force le rendu pixelated sur tous les éléments
          const container = document.querySelector('.leaflet-container');
          if (container) {
            (container as HTMLElement).style.imageRendering = 'pixelated';
          }
        }}
      >
        {/* Composant qui gère les couches dynamiquement */}
        <LayerSelector selectedLayer={currentLayer} />
      </MapContainer>

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
        <strong>Couche actuelle:</strong> {layerNames[currentLayer as keyof typeof layerNames]}
        <br />
        <em style={{ color: '#666', fontSize: '0.75rem' }}>
          💡 <strong>Zoom ultra-précis :</strong> Les couches HD permettent un zoom jusqu'à 21-22 !
          <br />
          🔍 <strong>Scaling intelligent :</strong> Plus d'écran gris ! L'image est automatiquement agrandie.
          <br />
          🎯 <strong>Pixellisation :</strong> Normal à très haut zoom - permet une précision maximale !
          <br />
          ⚡ <strong>Tip :</strong> "Satellite HD Google" offre la meilleure résolution.
        </em>
      </Box>
    </Box>
  );
};

export default MapComponent;