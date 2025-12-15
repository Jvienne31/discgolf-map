import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, Button, IconButton, TextField, Slider, CircularProgress, Stack } from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon, Print as PrintIcon } from '@mui/icons-material';
import { CourseHole } from '../contexts/types';
import { LeafletDrawingState } from '../contexts/LeafletDrawingContext';
import domtoimage from 'dom-to-image-more';
import { lineString, bezierSpline, length as turfLength } from '@turf/turf';

interface PDFEditorPagedProps {
  state: LeafletDrawingState;
  mapElement: any;
  onClose: () => void;
}

interface HoleImageData {
  holeNumber: number;
  imageData: string;
  rotation: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const PDFEditorPaged: React.FC<PDFEditorPagedProps> = ({ state, mapElement, onClose }) => {
  const [title, setTitle] = useState(state.name || 'Parcours Disc Golf');
  const [loading, setLoading] = useState(true);
  const [overviewImage, setOverviewImage] = useState<string | null>(null);
  const [holeImages, setHoleImages] = useState<HoleImageData[]>([]);
  const [selectedHole, setSelectedHole] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    captureImages();
  }, []);

  const captureImages = async () => {
    try {
      setLoading(true);
      const mapInstance = mapElement;
      const mapContainer = mapInstance.getContainer();
      
      // Vue d'ensemble
      const overviewDataUrl = await captureMapView(mapInstance, mapContainer, null, state.holes);
      setOverviewImage(overviewDataUrl);
      
      // Chaque trou
      const captured: HoleImageData[] = [];
      for (const hole of state.holes) {
        const dataUrl = await captureMapView(mapInstance, mapContainer, hole, state.holes);
        captured.push({
          holeNumber: hole.number,
          imageData: dataUrl,
          rotation: 0,
          zoom: 100,
          offsetX: 0,
          offsetY: 0
        });
      }
      
      setHoleImages(captured);
      if (captured.length > 0) {
        setSelectedHole(captured[0].holeNumber);
      }
    } catch (error) {
      console.error('Erreur capture:', error);
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
      const allPoints: [number, number][] = [];
      
      for (const h of allHoles) {
        const tee = h.elements.find(el => el.type === 'tee');
        const basket = h.elements.find(el => el.type === 'basket');
        
        if (tee && tee.position) allPoints.push([tee.position.lat, tee.position.lng]);
        if (basket && basket.position) allPoints.push([basket.position.lat, basket.position.lng]);
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
      height: mapContainer.offsetHeight
    });
    
    return dataUrl;
  };

  const calculateHoleStats = (hole: CourseHole) => {
    const tee = hole.elements.find(el => el.type === 'tee');
    const basket = hole.elements.find(el => el.type === 'basket');
    
    let straightDistance = 0;
    let flightPathDistance = 0;
    
    if (tee && basket && tee.position && basket.position) {
      const line = lineString([
        [tee.position.lng, tee.position.lat],
        [basket.position.lng, basket.position.lat]
      ]);
      straightDistance = turfLength(line, { units: 'meters' });
      
      const flightPath = hole.elements.find(el => el.type === 'flight-path' && el.path && el.path.length >= 2);
      if (flightPath && flightPath.path) {
        const pathLine = lineString(flightPath.path.map(p => [p.lng, p.lat]));
        const curved = bezierSpline(pathLine);
        flightPathDistance = turfLength(curved, { units: 'meters' });
      }
    }
    
    return {
      straightDistance: Math.round(straightDistance),
      flightPathDistance: Math.round(flightPathDistance)
    };
  };

  const updateHoleImage = (holeNumber: number, updates: Partial<HoleImageData>) => {
    setHoleImages(prev => prev.map(img =>
      img.holeNumber === holeNumber ? { ...img, ...updates } : img
    ));
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedImage = holeImages.find(img => img.holeNumber === selectedHole);

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
    <>
      {/* Toolbar - Hidden on print */}
      <Box
        className="no-print"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2
        }}
      >
        <Typography variant="h6">Éditeur PDF - {title}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Imprimer / PDF
          </Button>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Editor Panel - Hidden on print */}
      {selectedImage && (
        <Paper
          className="no-print"
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            zIndex: 2000,
            p: 2,
            borderTop: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="subtitle1" gutterBottom>Trou {selectedHole}</Typography>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption">Rotation</Typography>
              <Slider
                value={selectedImage.rotation}
                onChange={(_, val) => updateHoleImage(selectedHole!, { rotation: val as number })}
                min={-180}
                max={180}
                valueLabelDisplay="auto"
                marks={[
                  { value: -180, label: '-180°' },
                  { value: 0, label: '0°' },
                  { value: 180, label: '180°' }
                ]}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption">Zoom (%)</Typography>
              <Slider
                value={selectedImage.zoom}
                onChange={(_, val) => updateHoleImage(selectedHole!, { zoom: val as number })}
                min={50}
                max={150}
                valueLabelDisplay="auto"
              />
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Print Content */}
      <Box
        ref={contentRef}
        sx={{
          bgcolor: 'grey.200',
          minHeight: '100vh',
          pt: '60px',
          pb: '200px',
          '@media print': {
            bgcolor: 'white',
            pt: 0,
            pb: 0
          }
        }}
      >
        {/* Page 1: Overview */}
        <Paper
          className="page"
          sx={{
            width: '210mm',
            minHeight: '297mm',
            margin: '20px auto',
            p: '15mm',
            boxShadow: 3,
            '@media print': {
              margin: 0,
              boxShadow: 'none',
              pageBreakAfter: 'always'
            }
          }}
        >
          <Typography
            variant="h3"
            contentEditable
            suppressContentEditableWarning
            sx={{
              textAlign: 'center',
              mb: 2,
              outline: 'none',
              '&:focus': { bgcolor: 'action.hover' }
            }}
            onBlur={(e) => setTitle(e.currentTarget.textContent || '')}
          >
            {title}
          </Typography>

          {overviewImage && (
            <Box sx={{ textAlign: 'center', my: 3 }}>
              <img
                src={overviewImage}
                alt="Vue d'ensemble"
                style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ddd' }}
              />
            </Box>
          )}

          <Typography
            variant="body1"
            contentEditable
            suppressContentEditableWarning
            sx={{
              mt: 2,
              outline: 'none',
              '&:focus': { bgcolor: 'action.hover' }
            }}
          >
            Parcours de {state.holes.length} trous
          </Typography>
        </Paper>

        {/* Hole Pages */}
        {holeImages.map((holeImg) => {
          const hole = state.holes.find(h => h.number === holeImg.holeNumber);
          if (!hole) return null;
          
          const stats = calculateHoleStats(hole);

          return (
            <Paper
              key={holeImg.holeNumber}
              className="page"
              onClick={() => setSelectedHole(holeImg.holeNumber)}
              sx={{
                width: '210mm',
                minHeight: '297mm',
                margin: '20px auto',
                p: '15mm',
                boxShadow: 3,
                cursor: 'pointer',
                border: selectedHole === holeImg.holeNumber ? '3px solid' : 'none',
                borderColor: 'primary.main',
                '@media print': {
                  margin: 0,
                  boxShadow: 'none',
                  pageBreakAfter: 'always',
                  cursor: 'default',
                  border: 'none'
                }
              }}
            >
              <Typography
                variant="h4"
                contentEditable
                suppressContentEditableWarning
                sx={{
                  mb: 2,
                  outline: 'none',
                  '&:focus': { bgcolor: 'action.hover' }
                }}
              >
                Trou {holeImg.holeNumber}
              </Typography>

              <Typography variant="body1" sx={{ mb: 1 }}>
                Par: {hole.par || 3} | Vol d'oiseau: {stats.straightDistance}m | Trajectoire: {stats.flightPathDistance}m
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '200mm',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={holeImg.imageData}
                  alt={`Trou ${holeImg.holeNumber}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200mm',
                    transform: `rotate(${holeImg.rotation}deg) scale(${holeImg.zoom / 100})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.2s'
                  }}
                />
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Print Styles */}
      <style>{`
        @media print {
          body, html {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
};
