import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  IconButton,
  TextField,
  Stack,
  Divider,
  Slider,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import { 
  Save as SaveIcon,
  Close as CloseIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Crop as CropIcon,
  CropFree as CropFreeIcon
} from '@mui/icons-material';
import { CourseHole } from '../contexts/types';
import { LeafletDrawingState } from '../contexts/LeafletDrawingContext';
import domtoimage from 'dom-to-image-more';

interface PDFEditorProps {
  state: LeafletDrawingState;
  mapElement: any;
  onClose: () => void;
  onExport: (config: PDFConfig) => void;
}

interface HoleImageConfig {
  holeNumber: number;
  imageData: string;
  rotation: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  included: boolean;
}

interface PDFConfig {
  title: string;
  includeOverview: boolean;
  overviewImage: string | null;
  holes: HoleImageConfig[];
}

export const PDFEditor: React.FC<PDFEditorProps> = ({ state, mapElement, onClose, onExport }) => {
  const [title, setTitle] = useState(state.name || 'Parcours Disc Golf');
  const [includeOverview, setIncludeOverview] = useState(true);
  const [selectedHole, setSelectedHole] = useState<number | null>(null);
  const [holeConfigs, setHoleConfigs] = useState<HoleImageConfig[]>([]);
  const [overviewImage, setOverviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
  const [cropCurrent, setCropCurrent] = useState<{x: number, y: number} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    captureImages();
  }, []);

  const captureImages = async () => {
    try {
      setLoading(true);
      
      const mapInstance = mapElement;
      const mapContainer = mapInstance.getContainer();
      
      // Capturer la vue d'ensemble
      console.log('Capture vue d\'ensemble...');
      const overviewDataUrl = await captureMapView(mapInstance, mapContainer, null, state.holes);
      setOverviewImage(overviewDataUrl);
      
      // Capturer chaque trou
      const capturedHoles: HoleImageConfig[] = [];
      for (const hole of state.holes) {
        console.log(`Capture trou ${hole.number}...`);
        const dataUrl = await captureMapView(mapInstance, mapContainer, hole, state.holes);
        capturedHoles.push({
          holeNumber: hole.number,
          imageData: dataUrl,
          rotation: 0,
          crop: null,
          included: true
        });
      }
      
      setHoleConfigs(capturedHoles);
      if (capturedHoles.length > 0) {
        setSelectedHole(capturedHoles[0].holeNumber);
      }
    } catch (error) {
      console.error('Erreur capture images:', error);
      alert('Erreur lors de la capture des images');
    } finally {
      setLoading(false);
    }
  };

  const captureMapView = async (
    mapInstance: any,
    mapContainer: HTMLElement,
    hole: CourseHole | null,
    allHoles: CourseHole[]
  ): Promise<string> => {
    // Si un trou est spécifié, zoomer dessus
    if (hole) {
      const tee = hole.elements.find(el => el.type === 'tee');
      const basket = hole.elements.find(el => el.type === 'basket');
      
      if (tee && basket && tee.position && basket.position) {
        const allPoints: [number, number][] = [
          [tee.position.lat, tee.position.lng],
          [basket.position.lat, basket.position.lng]
        ];
        
        const flightPath = hole.elements.find(el => el.type === 'flight-path');
        if (flightPath && flightPath.path) {
          flightPath.path.forEach(p => allPoints.push([p.lat, p.lng]));
        }
        
        const lats = allPoints.map(p => p[0]);
        const lngs = allPoints.map(p => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        const marginMeters = 3;
        const marginLat = marginMeters / 111000;
        const marginLng = marginMeters / (111000 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
        
        const bounds: [[number, number], [number, number]] = [
          [minLat - marginLat, minLng - marginLng],
          [maxLat + marginLat, maxLng + marginLng]
        ];
        
        mapInstance.fitBounds(bounds, { padding: [0, 0], animate: false });
      }
    } else {
      // Vue d'ensemble
      const allPoints: [number, number][] = [];
      
      for (const h of allHoles) {
        const tee = h.elements.find(el => el.type === 'tee');
        const basket = h.elements.find(el => el.type === 'basket');
        
        if (tee && tee.position) allPoints.push([tee.position.lat, tee.position.lng]);
        if (basket && basket.position) allPoints.push([basket.position.lat, basket.position.lng]);
        
        const flightPath = h.elements.find(el => el.type === 'flight-path');
        if (flightPath && flightPath.path) {
          flightPath.path.forEach(p => allPoints.push([p.lat, p.lng]));
        }
      }
      
      if (allPoints.length > 0) {
        const lats = allPoints.map(p => p[0]);
        const lngs = allPoints.map(p => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        const marginMeters = 2;
        const marginLat = marginMeters / 111000;
        const marginLng = marginMeters / (111000 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
        
        const bounds: [[number, number], [number, number]] = [
          [minLat - marginLat, minLng - marginLng],
          [maxLat + marginLat, maxLng + marginLng]
        ];
        
        mapInstance.fitBounds(bounds, { padding: [0, 0], animate: false });
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    mapInstance.invalidateSize();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const dataUrl = await domtoimage.toJpeg(mapContainer, {
      quality: 0.95,
      bgcolor: '#f5f5f5',
      width: mapContainer.offsetWidth,
      height: mapContainer.offsetHeight,
      style: { transform: 'none', transformOrigin: 'top left' }
    });
    
    return dataUrl;
  };

  const handleRotationChange = (holeNumber: number, rotation: number) => {
    setHoleConfigs(prev => prev.map(config => 
      config.holeNumber === holeNumber 
        ? { ...config, rotation }
        : config
    ));
  };

  const handleToggleHole = (holeNumber: number) => {
    setHoleConfigs(prev => prev.map(config => 
      config.holeNumber === holeNumber 
        ? { ...config, included: !config.included }
        : config
    ));
  };

  const handleStartCrop = () => {
    setCropMode(true);
    setCropStart(null);
    setCropCurrent(null);
  };

  const handleCancelCrop = () => {
    setCropMode(false);
    setCropStart(null);
    setCropCurrent(null);
  };

  const handleApplyCrop = () => {
    if (!selectedHole || !cropStart || !cropCurrent) return;
    
    const x = Math.min(cropStart.x, cropCurrent.x);
    const y = Math.min(cropStart.y, cropCurrent.y);
    const width = Math.abs(cropCurrent.x - cropStart.x);
    const height = Math.abs(cropCurrent.y - cropStart.y);
    
    setHoleConfigs(prev => prev.map(config =>
      config.holeNumber === selectedHole
        ? { ...config, crop: { x, y, width, height } }
        : config
    ));
    
    setCropMode(false);
    setCropStart(null);
    setCropCurrent(null);
  };

  const handleImageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log('Crop start:', { x, y });
    setCropStart({ x, y });
    setCropCurrent({ x, y });
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode || !cropStart || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropCurrent({ x, y });
  };

  const handleImageMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode || !cropStart || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log('Crop end:', { x, y });
    setCropCurrent({ x, y });
  };

  const handleExport = () => {
    const config: PDFConfig = {
      title,
      includeOverview,
      overviewImage,
      holes: holeConfigs
    };
    onExport(config);
  };

  const selectedConfig = holeConfigs.find(c => c.holeNumber === selectedHole);

  if (loading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="white">
          Capture des images en cours...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Paper
        sx={{
          width: '95%',
          height: '95%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">Éditeur PDF - {holeConfigs.filter(h => h.included).length} trous</Typography>
          <Box>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleExport}
              sx={{ mr: 1 }}
            >
              Générer PDF
            </Button>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel - Settings */}
          <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', p: 2, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Configuration</Typography>
            
            <TextField
              fullWidth
              label="Titre du parcours"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              margin="normal"
              size="small"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={includeOverview}
                  onChange={(e) => setIncludeOverview(e.target.checked)}
                />
              }
              label="Inclure vue d'ensemble"
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom fontWeight="bold">Trous</Typography>
            
            <Stack spacing={1}>
              {state.holes.map(hole => {
                const config = holeConfigs.find(c => c.holeNumber === hole.number);
                if (!config) return null;

                return (
                  <Paper
                    key={hole.number}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      bgcolor: selectedHole === hole.number ? 'primary.light' : 'background.paper',
                      border: selectedHole === hole.number ? 2 : 1,
                      borderColor: selectedHole === hole.number ? 'primary.main' : 'divider',
                      '&:hover': { bgcolor: selectedHole === hole.number ? 'primary.light' : 'action.hover' }
                    }}
                    onClick={() => setSelectedHole(hole.number)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          checked={config.included}
                          onChange={() => handleToggleHole(hole.number)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
                        <Typography fontWeight={selectedHole === hole.number ? 'bold' : 'normal'}>
                          Trou {hole.number}
                        </Typography>
                      </Box>
                    </Box>
                    {(config.rotation !== 0 || config.crop) && (
                      <Box sx={{ ml: 4 }}>
                        {config.rotation !== 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Rotation: {config.rotation}°
                          </Typography>
                        )}
                        {config.crop && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Rognée
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Box>

          {/* Right Panel - Preview & Edit */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedConfig ? (
              <>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6">Trou {selectedConfig.holeNumber}</Typography>
                  
                  {/* Rotation */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Rotation</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleRotationChange(selectedConfig.holeNumber, selectedConfig.rotation - 15)}
                      >
                        <RotateLeftIcon />
                      </IconButton>
                      <Slider
                        value={selectedConfig.rotation}
                        onChange={(_, value) => handleRotationChange(selectedConfig.holeNumber, value as number)}
                        min={-180}
                        max={180}
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ flex: 1 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRotationChange(selectedConfig.holeNumber, selectedConfig.rotation + 15)}
                      >
                        <RotateRightIcon />
                      </IconButton>
                      <Button
                        size="small"
                        onClick={() => handleRotationChange(selectedConfig.holeNumber, 0)}
                      >
                        Reset
                      </Button>
                    </Box>
                  </Box>

                  {/* Crop */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Rognage</Typography>
                    {!cropMode ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          startIcon={<CropIcon />}
                          variant="outlined"
                          size="small"
                          onClick={handleStartCrop}
                        >
                          Rogner l'image
                        </Button>
                        {selectedConfig.crop && (
                          <Button
                            size="small"
                            onClick={() => setHoleConfigs(prev => prev.map(c =>
                              c.holeNumber === selectedConfig.holeNumber ? { ...c, crop: null } : c
                            ))}
                          >
                            Annuler le rognage
                          </Button>
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleApplyCrop}
                          disabled={!cropStart || !cropCurrent || (cropStart.x === cropCurrent.x && cropStart.y === cropCurrent.y)}
                        >
                          Appliquer
                        </Button>
                        <Button
                          size="small"
                          onClick={handleCancelCrop}
                        >
                          Annuler
                        </Button>
                        {cropStart && cropCurrent && (
                          <Typography variant="caption" color="text.secondary">
                            {Math.abs(cropCurrent.x - cropStart.x)} × {Math.abs(cropCurrent.y - cropStart.y)}px
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Image Preview */}
                <Box 
                  sx={{ 
                    flex: 1, 
                    p: 2, 
                    overflow: 'auto', 
                    bgcolor: 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-block',
                      cursor: cropMode ? 'crosshair' : 'default',
                      userSelect: 'none'
                    }}
                    onMouseDown={handleImageMouseDown}
                    onMouseMove={handleImageMouseMove}
                    onMouseUp={handleImageMouseUp}
                    onMouseLeave={() => {
                      if (cropMode && cropStart && !cropCurrent) {
                        setCropStart(null);
                      }
                    }}
                  >
                    <img
                      ref={imageRef}
                      src={selectedConfig.imageData}
                      alt={`Trou ${selectedConfig.holeNumber}`}
                      style={{
                        maxWidth: '90vw',
                        maxHeight: '70vh',
                        display: 'block',
                        transform: `rotate(${selectedConfig.rotation}deg)`,
                        transformOrigin: 'center'
                      }}
                      draggable={false}
                    />
                    {cropMode && cropStart && cropCurrent && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: Math.min(cropStart.x, cropCurrent.x),
                          top: Math.min(cropStart.y, cropCurrent.y),
                          width: Math.abs(cropCurrent.x - cropStart.x),
                          height: Math.abs(cropCurrent.y - cropStart.y),
                          border: '3px dashed',
                          borderColor: 'primary.main',
                          bgcolor: 'rgba(25, 118, 210, 0.2)',
                          pointerEvents: 'none',
                          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">
                  Sélectionnez un trou pour le modifier
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
