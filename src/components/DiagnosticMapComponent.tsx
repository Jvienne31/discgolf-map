
import { useEffect, useRef, useState } from 'react';
import { Box, ButtonGroup, Button, Slider } from '@mui/material';
import { Satellite, Map as MapIcon, Terrain, Layers, HighQuality, Public } from '@mui/icons-material';
import { useLeafletDrawing } from '../contexts/LeafletDrawingContext';
import { CourseElement, CourseHole } from '../contexts/types';
import { layerConfigs, layerNames, BaseLayerKey, getElementColor, getPathOptions } from '../utils/layers';
import { debugLog } from '../utils/debug';

const DiagnosticMapComponent = () => {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const initializingRef = useRef(false);
  const [currentLayer, setCurrentLayer] = useState<BaseLayerKey>('osm');

  const { state: drawingState, dispatch: drawingDispatch } = useLeafletDrawing();

  const selectedMandatory = drawingState.selectedElement
    ? drawingState.holes.flatMap(h => h.elements).find(e => e.id === drawingState.selectedElement && e.type === 'mandatory')
    : null;
  const angleValue = selectedMandatory?.properties?.angle ?? 0;

  const drawingStateRef = useRef(drawingState);
  useEffect(() => { drawingStateRef.current = drawingState; }, [drawingState]);
  
  const tempShapeRef = useRef<any>(null);
  const elementLayersRef = useRef<Record<string, any>>({});
  const vertexMarkersRef = useRef<any[]>([]);
  const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);

  const updateLayer = async (layerType: BaseLayerKey) => {
    if (!mapInstanceRef.current) return;
    const L = await import('leaflet');
    
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    const config = layerConfigs[layerType];
    if ('baseUrl' in config && 'labelsUrl' in config) {
      const baseLayer = L.tileLayer(config.baseUrl, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        maxNativeZoom: config.maxNativeZoom || config.maxZoom
      });
      const labelsLayer = L.tileLayer(config.labelsUrl, {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: config.maxZoom
      });
      baseLayer.addTo(mapInstanceRef.current);
      labelsLayer.addTo(mapInstanceRef.current);
    } else {
      const layerOptions: any = {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        maxNativeZoom: config.maxNativeZoom
      };
      if ('subdomains' in config && config.subdomains) {
        layerOptions.subdomains = config.subdomains;
      }
      const layer = L.tileLayer(config.url, layerOptions);
      layer.addTo(mapInstanceRef.current);
    }
  };

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current || initializingRef.current) return;
      initializingRef.current = true;

      try {
        const L = await import('leaflet');
        const map = L.map(mapRef.current, {
          center: [43.568375, 1.518657],
          zoom: 13,
          zoomControl: true,
          doubleClickZoom: false,
        });
        mapInstanceRef.current = map;
        drawingDispatch({ type: 'SET_MAP', payload: map });
        await updateLayer(currentLayer);
        setMapReady(true);
        
        map.on('click', (e: any) => {
          const ds = drawingStateRef.current;
          const { lat, lng } = e.latlng;
          
          if (ds.drawingMode === 'tee' || ds.drawingMode === 'basket' || ds.drawingMode === 'mandatory') {
            drawingDispatch({ type: 'ADD_ELEMENT', payload: { type: ds.drawingMode, position: { lat, lng } } });
          } else if (ds.drawingMode === 'ob-zone' || ds.drawingMode === 'hazard') {
            if (!ds.isDrawing) {
              drawingDispatch({ type: 'START_DRAWING', payload: { lat, lng } });
            } else {
              drawingDispatch({ type: 'CONTINUE_DRAWING', payload: { lat, lng } });
            }
          }
        });

      } catch (err) {
        debugLog('❌ Erreur init carte:', err);
      } finally {
        initializingRef.current = false;
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    vertexMarkersRef.current.forEach(m => mapInstanceRef.current?.removeLayer(m));
    vertexMarkersRef.current = [];
    if (!mapInstanceRef.current || !drawingState.selectedElement) return;

    const el = drawingState.holes.flatMap(h => h.elements).find(e => e.id === drawingState.selectedElement);
    if (!el || !el.path || el.path.length < 2) return;

    (async () => {
      const L = (window as any).L || await import('leaflet');
      el.path?.forEach((pt, idx) => {
        const isSelected = idx === selectedVertexIdx;
        const icon = L.divIcon({
          html: `<svg width='18' height='18'><circle cx='9' cy='9' r='7' fill='${isSelected ? '#ffcdd2' : '#fff'}' stroke='${isSelected ? '#d32f2f' : '#1976d2'}' stroke-width='3'/></svg>`,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        const marker = L.marker([pt.lat, pt.lng], { icon, draggable: isSelected }).addTo(mapInstanceRef.current);
        
        marker.on('mousedown', L.DomEvent.stopPropagation);
        marker.on('click', (ev: any) => {
            L.DomEvent.stopPropagation(ev);
            setSelectedVertexIdx(idx);
        });
        if (isSelected) {
          marker.on('dragend', () => {
            const ll = marker.getLatLng();
            const newPath = el.path!.map((p, i) => i === idx ? { lat: ll.lat, lng: ll.lng } : p);
            drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { path: newPath } } });
            setSelectedVertexIdx(idx);
          });
        }
        marker.on('contextmenu', (ev: any) => {
          L.DomEvent.stop(ev);
          if (el.path!.length > 3) {
            const newPath = el.path!.filter((_, i) => i !== idx);
            drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { path: newPath } } });
            setSelectedVertexIdx(null);
          }
        });
        vertexMarkersRef.current.push(marker);
      });
    })();
  }, [drawingState.selectedElement, drawingState.holes, drawingDispatch, selectedVertexIdx]);

  useEffect(() => {
    const run = async () => {
      if (!mapInstanceRef.current) return;
      const L = await import('leaflet');

      if (!drawingState.isDrawing || !drawingState.drawingMode || drawingState.tempPath.length === 0) {
        if (tempShapeRef.current) {
          mapInstanceRef.current.removeLayer(tempShapeRef.current);
          tempShapeRef.current = null;
        }
        return;
      }
      
      const pts = drawingState.tempPath.map(p => [p.lat, p.lng] as [number, number]);
      const pathOptions = getPathOptions({ type: drawingState.drawingMode } as CourseElement);

      if (!tempShapeRef.current) {
        tempShapeRef.current = L.polyline(pts, { ...pathOptions, dashArray: '5, 5' });
        tempShapeRef.current.addTo(mapInstanceRef.current);
      } else {
        tempShapeRef.current.setLatLngs(pts);
      }
    };
    run();
  }, [drawingState.isDrawing, drawingState.tempPath, drawingState.drawingMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drawingDispatch({ type: 'CANCEL_DRAWING' });
        setSelectedVertexIdx(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawingDispatch]);

  useEffect(() => {
    if (!mapReady) return;
    const sync = async () => {
        const L = (window as any).L || await import('leaflet');
        const currentIds = new Set<string>(drawingState.holes.flatMap(h => h.elements.map(e => e.id)));

        Object.keys(elementLayersRef.current).forEach(id => {
            if (!currentIds.has(id)) {
                mapInstanceRef.current?.removeLayer(elementLayersRef.current[id]);
                delete elementLayersRef.current[id];
            }
        });

        drawingState.holes.forEach(hole => {
            hole.elements.forEach(el => {
                const existingLayer = elementLayersRef.current[el.id];
                const pathOptions = getPathOptions(el);

                if (!existingLayer) {
                    let newLayer: any;
                    if (el.position) { // Tee, Basket, Mandatory
                        const icon = createDivIcon(L, el);
                        newLayer = L.marker([el.position.lat, el.position.lng], { icon, draggable: true });
                        newLayer.on('dragend', () => {
                            const ll = newLayer.getLatLng();
                            drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { position: { lat: ll.lat, lng: ll.lng } } } });
                        });
                    } else if (el.path) { // OB Zone, Hazard
                        newLayer = L.polygon(el.path, pathOptions);
                    }

                    if (newLayer) {
                        newLayer.on('click', (ev: any) => {
                            L.DomEvent.stopPropagation(ev);
                            drawingDispatch({ type: 'SELECT_ELEMENT', payload: el.id });
                            setSelectedVertexIdx(null);
                        });
                        newLayer.on('contextmenu', (ev: any) => {
                            L.DomEvent.stop(ev);
                            drawingDispatch({ type: 'DELETE_ELEMENT', payload: el.id });
                        });
                        newLayer.addTo(mapInstanceRef.current);
                        elementLayersRef.current[el.id] = newLayer;
                    }
                } else { // Update existing layer
                    if (existingLayer.setLatLng && el.position) {
                        existingLayer.setLatLng(el.position);
                    }
                    if (existingLayer.setLatLngs && el.path) {
                        existingLayer.setLatLngs(el.path);
                    }
                    if (existingLayer.setIcon) {
                        existingLayer.setIcon(createDivIcon(L, el));
                    }
                    if (existingLayer.setStyle) {
                        existingLayer.setStyle(pathOptions);
                    }
                }
            });
        });
    };
    sync();
}, [drawingState.holes, mapReady, drawingDispatch]);


  const createDivIcon = (L: any, el: CourseElement) => {
    const color = getElementColor(el.type);
    let html = '';

    if (el.type === 'tee' || el.type === 'basket') {
      const glyph = el.type === 'tee' ? 'T' : 'B';
      html = `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background-color:${color};color:white;font-weight:bold;font-size:16px;border: 2px solid white;">${glyph}</div>`;
    } else if (el.type === 'mandatory') {
      const angle = el.properties?.angle ?? 0;
      html = `<div style="transform:rotate(${angle}deg);"><svg width='30' height='30' viewBox='0 0 30 30'><circle cx='15' cy='15' r='15' fill='${color}'/><polygon points='12,12 18,12 18,18 24,18 15,27 6,18 12,18' fill='white'/></svg></div>`;
    }
    
    return L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
  };


  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <Box
        ref={mapRef}
        sx={{
          height: '100%',
          width: '100%',
          cursor: drawingState.drawingMode ? 'crosshair' : 'grab',
        }}
      />
      
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
        <ButtonGroup orientation="vertical" variant="contained" size="small">
          {Object.keys(layerConfigs).map(key => (
            <Button
              key={key}
              onClick={() => {
                setCurrentLayer(key as BaseLayerKey);
                updateLayer(key as BaseLayerKey);
              }}
              variant={currentLayer === key ? 'contained' : 'outlined'}
            >
              {layerNames[key as BaseLayerKey]}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {selectedMandatory && (
        <Box sx={{ position:'absolute', top:80, left:10, zIndex:1200, background:'#fff', p:2, borderRadius:2, boxShadow:2, minWidth:220 }}>
          <strong>Rotation de la flèche</strong>
          <Slider
            value={angleValue}
            min={0}
            max={359}
            step={1}
            onChange={(_, v) => {
              drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: selectedMandatory.id, updates: { properties: { ...selectedMandatory.properties, angle: Number(v) } } } });
            }}
            valueLabelDisplay="auto"
          />
        </Box>
      )}
    </Box>
  );
};

export default DiagnosticMapComponent;
