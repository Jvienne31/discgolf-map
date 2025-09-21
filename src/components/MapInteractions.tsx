
import { useMapEvents, Marker, Polygon, Polyline, Circle, Tooltip } from 'react-leaflet';
import * as L from 'leaflet';
import { useLeafletDrawing, CourseElement } from '../contexts/LeafletDrawingContext';
import React, { useMemo, useEffect, useRef } from 'react';

type Position = { lat: number, lng: number };

// --- Helper pour créer les icônes ---
const createCustomIcon = (type: 'tee' | 'basket' | 'mandatory', color: string = '#3388ff', rotation: number = 0) => {
  let iconHtml: string;
  const iconSize: [number, number] = [28, 28];

  switch(type) {
      case 'tee':
          iconHtml = `<div style="background: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`;
          break;
      case 'basket':
          iconHtml = `<div style="background: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 4px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4); display:flex; justify-content:center; align-items:center; font-size: 12px; font-weight: bold; color: white;">B</div>`;
          break;
      case 'mandatory':
          iconHtml = `<div style="transform: rotate(${rotation}deg); width: 24px; height: 24px; font-size: 30px; color: ${color}; text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;">⬆️</div>`;
          break;
  }

  return L.divIcon({
    html: iconHtml,
    className: `custom-${type}-icon`,
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2]
  });
};

// --- Composants spécialisés pour la gestion de l'opacité ---

const FadingMarker = (props: any) => {
    const { isDisabled, ...markerProps } = props;
    const markerRef = useRef<L.Marker>(null);

    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.setOpacity(isDisabled ? 0.35 : 1);
        }
    }, [isDisabled]);

    return <Marker ref={markerRef} {...markerProps} />;
};

const FadingPolygon = (props: any) => {
    const { isDisabled, isSelected, element, ...polygonProps } = props;
    const polygonRef = useRef<L.Polygon>(null);

    useEffect(() => {
        if (polygonRef.current) {
            const isOb = element.type === 'ob-zone';
            polygonRef.current.setStyle({
                opacity: isDisabled ? 0.5 : 1,
                fillOpacity: isDisabled ? (isOb ? 0.1 : 0.05) : (isOb ? 0.4 : 0.2),
                weight: isSelected && !isDisabled ? 4 : 2,
            });
        }
    }, [isDisabled, isSelected, element.type]);
    
    return <Polygon ref={polygonRef} {...polygonProps} />;
};


// --- Composant pour le rendu d'un élément ---

const ElementRenderer = React.memo(({ element, isDisabled }: { element: CourseElement, isDisabled: boolean }) => {
  const { state, dispatch } = useLeafletDrawing();
  const isSelected = state.selectedElement === element.id;

  const handleClick = (e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e);
    if (!isDisabled) {
      dispatch({ type: 'SELECT_ELEMENT', payload: element.id });
    }
  };

  const eventHandlers = { click: handleClick };

  switch (element.type) {
    case 'tee':
    case 'basket':
    case 'mandatory':
      return element.position ? (
        <FadingMarker 
          isDisabled={isDisabled}
          position={[element.position.lat, element.position.lng]} 
          icon={createCustomIcon(element.type, element.properties?.color, element.properties?.rotation)} 
          eventHandlers={eventHandlers}
        />
      ) : null;
    case 'ob-zone':
    case 'hazard':
      if (!element.path || element.path.length < 3) return null;
      return (
        <FadingPolygon
          isDisabled={isDisabled}
          isSelected={isSelected}
          element={element}
          positions={element.path.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: element.properties?.color,
            fillColor: element.properties?.color,
            dashArray: element.type === 'hazard' ? '5, 5' : undefined,
          }}
          eventHandlers={eventHandlers}
        />
      );
    default: return null;
  }
});

// --- Composant pour le rendu temporaire (dessin en cours) ---
const TempRenderer = () => {
    const { state } = useLeafletDrawing();
    const { isDrawing, drawingMode, tempPath, measurement } = state;
  
    if (isDrawing && drawingMode && tempPath.length > 0) {
      const isPolygon = ['ob-zone', 'hazard'].includes(drawingMode);
      const color = drawingMode === 'ob-zone' ? '#f44336' : drawingMode === 'hazard' ? '#2196f3' : '#607d8b';
      return (
        <>
          {tempPath.map((pos, i) => <Circle key={i} center={[pos.lat, pos.lng]} radius={3} pathOptions={{ color, fillOpacity: 1 }} />)}
          {tempPath.length > 1 && ( isPolygon ? 
              <Polygon positions={tempPath.map(p => [p.lat, p.lng])} pathOptions={{ color, weight: 2, dashArray: '5,5', fillOpacity: 0.1 }} /> :
              <Polyline positions={tempPath.map(p => [p.lat, p.lng])} pathOptions={{ color, weight: 3, dashArray: '5,5' }} />
          )}
        </>
      );
    }
  
    if (measurement && measurement.points.length > 0) {
      return (
        <>
          <Polyline positions={measurement.points.map(p => [p.lat, p.lng])} pathOptions={{ color: 'orange', weight: 3, dashArray: '5,5' }} />
          {measurement.points.map((p, i) => <Circle key={`m-${i}`} center={[p.lat, p.lng]} radius={4} pathOptions={{ color: 'orange', fillOpacity: 1 }} />)}
          {measurement.distance > 0 && measurement.points.length > 1 && (
            <Tooltip position={measurement.points[measurement.points.length - 1]} permanent direction="right" offset={[10, 0]}>
              {measurement.distance} m
            </Tooltip>
          )}
        </>
      );
    }
  
    return null;
  };


// --- Composant principal gérant les interactions ---
export const MapInteractions = () => {
  const { state, dispatch } = useLeafletDrawing();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isDrawing) {
        dispatch({ type: 'CANCEL_DRAWING' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.isDrawing, dispatch]);

  useMapEvents({
    click: (e) => {
      if ((e.originalEvent.target as HTMLElement).closest('.leaflet-interactive')) {
        return;
      }
      if (state.drawingMode) {
        const pos: Position = { lat: e.latlng.lat, lng: e.latlng.lng };
        const isPointElement = ['tee', 'basket', 'mandatory'].includes(state.drawingMode);
        
        const actionType = state.drawingMode === 'measure'
          ? state.isDrawing ? 'CONTINUE_DRAWING' : 'START_DRAWING'
          : isPointElement
            ? 'ADD_ELEMENT'
            : state.isDrawing ? 'CONTINUE_DRAWING' : 'START_DRAWING';

        const payload = actionType === 'ADD_ELEMENT' 
            ? { type: state.drawingMode as 'tee' | 'basket' | 'mandatory', position: pos } 
            : pos;

        dispatch({ type: actionType, payload: payload as any });
      } else {
        dispatch({ type: 'SELECT_ELEMENT', payload: null });
      }
    },
    dblclick: (e) => {
      L.DomEvent.stopPropagation(e);
      if (state.isDrawing) dispatch({ type: 'FINISH_DRAWING' });
    },
  });

  const allElements = useMemo(() => state.holes.flatMap(hole => hole.elements), [state.holes]);
  const holeViewMode = 'current';

  return (
    <>
      {allElements.map(element => (
        <ElementRenderer 
          key={element.id}
          element={element} 
          isDisabled={holeViewMode === 'current' && element.holeNumber !== state.currentHole}
        />
      ))}
      <TempRenderer />
    </>
  );
};
