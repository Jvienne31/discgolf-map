
import { useEffect, useState, useMemo, useRef, RefObject } from 'react';
import { Box, Button, Slider } from '@mui/material';
import { MapContainer, Marker, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { useLeafletDrawing } from '../contexts/LeafletDrawingContext';
import { CourseElement, Position } from '../contexts/types';
import { layerConfigs, layerNames, BaseLayerKey, getElementColor, getPathOptions, COLORS } from '../utils/layers';
import MeasurementLayer from './MeasurementLayer';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';

// --- Helper Functions ---

const createDivIcon = (el: CourseElement, isSelected: boolean): L.DivIcon => {
  const color = getElementColor(el);
  let html = '';
  let iconSize: L.PointTuple = [30, 30];
  const angle = el.properties?.angle ?? 0;
  const opacity = isSelected ? 1 : 0.9;
  const scale = isSelected ? 1.15 : 1;
  const transformOrigin = (el.type === 'tee' || el.type === 'mandatory') ? 'center' : 'bottom center';
  const commonStyle = `transform-origin: ${transformOrigin}; transform: scale(${scale}); opacity: ${opacity}; transition: transform 0.1s ease, opacity 0.1s ease;`;

  if (el.type === 'tee') {
      iconSize = [24, 34];
      const teeColor = el.properties?.color || COLORS.tee;
      const transform = `rotate(${angle}deg) scale(${scale})`;
      html = `<div style="transform-origin: center; transform: ${transform}; opacity: ${opacity}; transition: transform 0.1s ease, opacity 0.1s ease;"><svg width="24" height="34" viewBox="0 0 24 34"><rect x="0" y="0" width="24" height="34" fill="${teeColor}" stroke="${isSelected ? '#00aaff' : 'white'}" stroke-width="2" rx="4" /><text x="12" y="21" font-size="16" fill="white" text-anchor="middle" font-weight="bold">${el.holeNumber || 'T'}</text></svg></div>`;
  } else if (el.type === 'basket') {
      iconSize = [34, 34];
      html = `<div style="${commonStyle}"><svg viewBox="0 0 24 24" width="34" height="34"><g><circle cx="12" cy="12" r="12" fill="${color}" stroke="${isSelected ? '#00aaff' : 'black'}" stroke-width="${isSelected ? 2 : 0}" /><g fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18v4" /><path d="M6 18h12" /><path d="M6 9c0 3.5 2.5 6 6 6s6-2.5 6-6" /><path d="M7.5 9v6" /><path d="M16.5 9v6" /><path d="M12 9v7" /><path d="M9.5 9v6.5" /><path d="M14.5 9v6.5" /><path d="M6 9h12" /><circle cx="12" cy="5.5" r="1.5" fill="white" stroke="none" /></g></g></svg></div>`;
  } else if (el.type === 'mandatory') {
      iconSize = [30, 30];
      const transform = `rotate(${angle}deg) scale(${scale})`;
      html = `<div style="transform-origin: center; transform: ${transform}; opacity: ${opacity}; transition: transform 0.1s ease, opacity 0.1s ease;"><svg width='30' height='30' viewBox='0 0 30 30'><circle cx='15' cy='15' r='14' fill='${color}' stroke="${isSelected ? '#00aaff' : 'white'}" stroke-width="2"/><polygon points='12,12 18,12 18,18 24,18 15,27 6,18 12,18' fill='white'/></svg></div>`;
  }

  const anchor = (el.type === 'tee' || el.type === 'mandatory') ? L.point(iconSize[0] / 2, iconSize[1] / 2) : L.point(iconSize[0] / 2, iconSize[1]);
  
  return L.divIcon({ html, className: '', iconSize: iconSize, iconAnchor: anchor });
};

// --- Sub-components ---

const DrawingHandler = () => {
  const { state: drawingState, dispatch } = useLeafletDrawing();

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (drawingState.drawingMode === 'basket' || drawingState.drawingMode === 'mandatory' || drawingState.drawingMode === 'tee') {
        dispatch({ type: 'ADD_ELEMENT', payload: { type: drawingState.drawingMode, position: { lat, lng } } });
      } else if (drawingState.drawingMode && ['ob-zone', 'hazard', 'flight-path'].includes(drawingState.drawingMode)) {
        if (!drawingState.isDrawing) {
          dispatch({ type: 'START_DRAWING', payload: { lat, lng } });
        } else {
          dispatch({ type: 'CONTINUE_DRAWING', payload: { lat, lng } });
        }
      } else if (drawingState.drawingMode === 'measure') {
        if (!drawingState.isDrawing) {
          dispatch({ type: 'START_DRAWING', payload: { lat, lng } });
        } else {
          dispatch({ type: 'CONTINUE_DRAWING', payload: { lat, lng } });
        }
      } else {
        dispatch({ type: 'SELECT_ELEMENT', payload: null });
      }
    },
    dblclick(e) {
      L.DomEvent.stopPropagation(e);
      dispatch({ type: 'FINISH_DRAWING' });
    },
  });

  return null;
};

const MapUpdater = ({ currentLayer, setMapReady, containerRef }: { currentLayer: BaseLayerKey, setMapReady: (ready: boolean) => void, containerRef: RefObject<HTMLElement> }) => {
  const map = useMap();
  const { dispatch } = useLeafletDrawing();

  useEffect(() => {
    if (map) {
      dispatch({ type: 'SET_MAP', payload: map });
      map.attributionControl.setPrefix('Disc Golf Companion');
      if (!map.zoomControl) {
        L.control.zoom({ position: 'bottomright' }).addTo(map);
      }
      setMapReady(true);
    }
  }, [map, dispatch, setMapReady]);

  useEffect(() => {
    const config = layerConfigs[currentLayer];
    const newLayer = L.tileLayer(config.url, { ...config });
    
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    newLayer.addTo(map);

  }, [currentLayer, map]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [map, containerRef]);

  return null;
};

const ElementLayer = () => {
  const { state, dispatch } = useLeafletDrawing();

  const eventHandlers = (el: CourseElement) => ({
    click: (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      dispatch({ type: 'SELECT_ELEMENT', payload: el.id });
    },
    contextmenu: (e: L.LeafletMouseEvent) => {
      L.DomEvent.stop(e);
      dispatch({ type: 'DELETE_ELEMENT', payload: el.id });
    },
  });

  return (
    <>
      {state.holes.flatMap(h => h.elements).map(el => {
        const isSelected = state.selectedElement === el.id;
        const pathOptions = getPathOptions(el);
        const highlightOptions = isSelected ? { color: '#00aaff', weight: (pathOptions.weight || 3) + 2 } : {};

        if (el.position) {
          return (
            <Marker
              key={el.id}
              position={el.position}
              icon={createDivIcon(el, isSelected)}
              draggable={true}
              eventHandlers={{
                ...eventHandlers(el),
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { position: { lat, lng } } } });
                },
              }}
            />
          );
        }
        if (el.path) {
          if (el.type === 'flight-path') {
            let positions = el.path.map(p => [p.lat, p.lng] as [number, number]);
            if (el.path.length >= 2) {
                const line = turf.lineString(el.path.map(p => [p.lng, p.lat]));
                const curved = turf.bezierSpline(line, { resolution: 10000, sharpness: 0.85 });
                positions = curved.geometry.coordinates.map(c => [c[1], c[0]] as [number, number]);
            }
            return <Polyline key={el.id} positions={positions} pathOptions={{...pathOptions, ...highlightOptions}} eventHandlers={eventHandlers(el)} />;
          }
          const positions = el.path.map(p => [p.lat, p.lng] as [number, number]);
          return <Polygon key={el.id} positions={positions} pathOptions={{...pathOptions, ...highlightOptions}} eventHandlers={eventHandlers(el)} />;
        }
        return null;
      })}
    </>
  );
};

const TemporaryPath = () => {
  const { state } = useLeafletDrawing();
  if (!state.isDrawing || !state.drawingMode || state.tempPath.length === 0) return null;

  const pathOptions = getPathOptions({ type: state.drawingMode } as CourseElement);
  const pts = state.tempPath.map(p => [p.lat, p.lng] as [number, number]);

  return <Polyline positions={pts} pathOptions={{...pathOptions, dashArray: '5, 5'}} />;
};

const VertexMarkers = ({ element, dispatch }: { element: CourseElement | null, dispatch: any }) => {
  if (!element || !element.path) return null;

  const handleVertexDrag = (index: number, newPos: Position) => {
    if (!element.path) return;
    const newPath = element.path.map((p, i) => i === index ? newPos : p);
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id: element.id, updates: { path: newPath } } });
  };

  const handleVertexDelete = (index: number) => {
    if (!element.path) return;
    const isPolyline = element.type === 'flight-path' || element.type === 'fairway';
    if (element.path.length <= (isPolyline ? 2 : 3)) return;
    const newPath = element.path.filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id: element.id, updates: { path: newPath } } });
  };

  const handleMidpointClick = (index: number, newPos: Position) => {
    if (!element.path) return;
    const newPath = [...element.path];
    newPath.splice(index + 1, 0, newPos);
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id: element.id, updates: { path: newPath } } });
  };

  const vertexIcon = (isEndPoint: boolean) => L.divIcon({
    html: `<svg width='16' height='16' viewBox='0 0 16 16'><circle cx='8' cy='8' r='6' fill='#fff' stroke='${isEndPoint ? '#aaa' : '#3388ff'}' stroke-width='3'/></svg>`,
    className: isEndPoint ? 'leaflet-vertex-icon-disabled' : 'leaflet-vertex-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  const midPointIcon = L.divIcon({
    html: `<svg width='12' height='12' viewBox='0 0 12 12'><circle cx='6' cy='6' r='4' fill='#3388ff' fill-opacity='0.6'/></svg>`,
    className: 'leaflet-midpoint-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  return (
    <>
      {element.path.map((pt, idx) => {
        const isFlightPath = element.type === 'flight-path';
        const isEndPoint = isFlightPath && (idx === 0 || idx === element.path!.length - 1);
        return (
          <Marker
            key={`vertex-${element.id}-${idx}`}
            position={pt}
            icon={vertexIcon(isEndPoint)}
            draggable={!isEndPoint}
            eventHandlers={{
              dragend: (e) => handleVertexDrag(idx, e.target.getLatLng()),
              contextmenu: (e) => {
                L.DomEvent.stop(e);
                handleVertexDelete(idx);
              },
            }}
          />
        );
      })}
      {element.path.map((pt, idx) => {
        if (!element.path) return null;
        
        const isClosed = element.type !== 'flight-path';
        const isLastSegment = idx === element.path.length - 1;

        if (!isClosed && isLastSegment) {
          return null; // No midpoint after the last vertex of a polyline
        }

        const nextPt = isLastSegment ? element.path[0] : element.path[idx + 1];
        const midLatLng = L.latLng((pt.lat + nextPt.lat) / 2, (pt.lng + nextPt.lng) / 2);

        return (
          <Marker
            key={`midpoint-${element.id}-${idx}`}
            position={midLatLng}
            icon={midPointIcon}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                handleMidpointClick(idx, midLatLng);
              },
            }}
          />
        );
      })}
    </>
  );
};


// --- Main Component ---

const DiagnosticMapComponent = () => {
  const mapContainerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<BaseLayerKey>('satellite-hd');
  const { state: drawingState, dispatch: drawingDispatch } = useLeafletDrawing();

  const selectedElement = useMemo(() => 
    drawingState.selectedElement
      ? drawingState.holes.flatMap(h => h.elements).find(e => e.id === drawingState.selectedElement)
      : null
  , [drawingState.selectedElement, drawingState.holes]);

  const selectedRotatableElement = useMemo(() => 
    selectedElement && (selectedElement.type === 'mandatory' || selectedElement.type === 'tee')
      ? selectedElement
      : null
  , [selectedElement]);

  const angleValue = selectedRotatableElement?.properties?.angle ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') drawingDispatch({ type: 'CANCEL_DRAWING' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawingDispatch]);

  return (
    <Box ref={mapContainerRef} sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer 
        center={[43.568375, 1.518657]} 
        zoom={18} 
        style={{ height: '100%', width: '100%', cursor: drawingState.drawingMode ? 'crosshair' : 'grab' }} 
        zoomControl={false}
        doubleClickZoom={false}
      >
        <MapUpdater currentLayer={currentLayer} setMapReady={setMapReady} containerRef={mapContainerRef} />
        <DrawingHandler />
        <ElementLayer />
        <TemporaryPath/>
        <VertexMarkers element={selectedElement} dispatch={drawingDispatch} />
        {mapReady && <MeasurementLayer />}
      </MapContainer>

      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Object.keys(layerConfigs).map(key => (
          <Button
            key={key}
            onClick={() => setCurrentLayer(key as BaseLayerKey)}
            variant={currentLayer === key ? 'contained' : 'outlined'}
            size="small"
            sx={{
              background: currentLayer === key ? 'primary.main' : 'rgba(255,255,255,0.8)',
              color: currentLayer === key ? 'white' : 'black',
              '&:hover': {
                background: currentLayer === key ? 'primary.dark' : 'rgba(255,255,255,1)',
              }
            }}
          >
            {layerNames[key as BaseLayerKey]}
          </Button>
        ))}
      </Box>

      {selectedRotatableElement && (
        <Box sx={{ position:'absolute', top:16, left:16, zIndex:1000, background:'rgba(255,255,255,0.9)', p: '8px 16px', borderRadius:2, boxShadow:3, minWidth:220 }}>
          <strong>Rotation: {angleValue}°</strong>
          <Slider
            value={angleValue}
            min={0}
            max={359}
            step={1}
            onChange={(_, v) => {
              if (!selectedRotatableElement) return;
              drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: selectedRotatableElement.id, updates: { properties: { ...selectedRotatableElement.properties, angle: Number(v) } } } });
            }}
            valueLabelDisplay="auto"
          />
        </Box>
      )}
    </Box>
  );
};

export default DiagnosticMapComponent;
