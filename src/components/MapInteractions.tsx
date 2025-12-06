import { useMapEvents, Marker, Polygon, Polyline, Circle, Tooltip } from 'react-leaflet';
import * as L from 'leaflet';
import { useLeafletDrawing, CourseElement } from '../contexts/LeafletDrawingContext';
import React, { useMemo, useEffect } from 'react';

type Position = { lat: number, lng: number };

const createCustomIcon = (type: 'basket' | 'mandatory' | 'tee', color: string = '#3388ff', rotation: number = 0, className: string = '', holeNumber?: number) => {
  let iconHtml: string;
  const iconSize: [number, number] = [28, 28];

  switch(type) {
      case 'tee':
          iconHtml = `<div style="transform: rotate(${rotation}deg); width: 20px; height: 30px; background: ${color}; border: 2px solid white; display:flex; justify-content:center; align-items:center; font-weight:bold; color: white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);">${holeNumber}</div>`;
          break;
      case 'basket':
          iconHtml = `<div style="background: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 4px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4); display:flex; justify-content:center; align-items:center; font-size: 12px; font-weight: bold; color: white;">B</div>`;
          break;
      case 'mandatory':
          iconHtml = `<div style="transform: rotate(${rotation}deg); width: 24px; height: 24px; font-size: 30px; color: ${color}; text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;">⬆️</div>`;
          break;
      default:
        iconHtml = '';
        break;
  }

  return L.divIcon({
    html: iconHtml,
    className: `custom-${type}-icon ${className}`,
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2]
  });
};

const getPolygonCenter = (coordinates: Position[] | undefined): Position | null => {
  if (!coordinates || coordinates.length === 0) return null;
    let lat = 0;
    let lng = 0;
    coordinates.forEach(coord => {
        lat += coord.lat;
        lng += coord.lng;
    });
    return { lat: lat / coordinates.length, lng: lng / coordinates.length };
}

const ElementRenderer = ({ element, isDisabled, isSelected }: { element: CourseElement, isDisabled: boolean, isSelected: boolean }) => {
  const { dispatch } = useLeafletDrawing();

  const handleClick = (e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e);
    if (!isDisabled) {
      dispatch({ type: 'SELECT_ELEMENT', payload: element.id });
    }
  };

  const eventHandlers = { click: handleClick };
  const disabledClass = isDisabled ? 'leaflet-element-disabled' : '';

  switch (element.type) {
    case 'tee': {
        const center = element.position || getPolygonCenter(element.coordinates);
        if (!center) return null;
        return (
          <React.Fragment>
            {element.coordinates && element.coordinates.length > 0 && (
              <Polygon
                positions={element.coordinates.map(p => [p.lat, p.lng])}
                pathOptions={{
                  className: disabledClass,
                  color: element.properties?.color,
                  fillColor: element.properties?.color,
                  weight: isSelected && !isDisabled ? 4 : 2,
                  fillOpacity: isDisabled ? 0.1 : 0.4,
                }}
                eventHandlers={eventHandlers}
              />
            )}
            <Marker 
              position={[center.lat, center.lng]} 
              icon={createCustomIcon(element.type, element.properties?.color, element.properties?.angle, disabledClass, element.holeNumber)} 
              eventHandlers={eventHandlers} 
              rotationAngle={element.properties?.angle || 0}
            />
          </React.Fragment>
        )
    }
    case 'basket':
    case 'mandatory':
      return element.position ? (
        <Marker 
          position={[element.position.lat, element.position.lng]} 
          icon={createCustomIcon(element.type, element.properties?.color, element.properties?.angle, disabledClass)} 
          eventHandlers={eventHandlers} 
        />
      ) : null;
    case 'ob-zone':
    case 'hazard': {
      if (!element.path || element.path.length < 3) return null;
      const isOb = element.type === 'ob-zone';
      
      return (
        <Polygon
          positions={element.path.map(p => [p.lat, p.lng])}
          pathOptions={{
            className: disabledClass,
            color: element.properties?.color,
            fillColor: element.properties?.color,
            weight: isSelected && !isDisabled ? 4 : 2,
            dashArray: element.type === 'hazard' ? '5, 5' : undefined,
            fillOpacity: isDisabled ? (isOb ? 0.1 : 0.05) : (isOb ? 0.4 : 0.2),
          }}
          eventHandlers={eventHandlers}
        />
      );
    }
    default: return null;
  }
};

const MemoizedElementRenderer = React.memo(ElementRenderer);

const TempRenderer = () => {
    const { state } = useLeafletDrawing();
    const { isDrawing, drawingMode, tempPath, measurement } = state;
  
    if (isDrawing && drawingMode && tempPath.length > 0) {
      const isPolygon = ['ob-zone', 'hazard', 'tee'].includes(drawingMode);
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
        const isPointElement = ['basket', 'mandatory'].includes(state.drawingMode);
        
        const actionType = state.drawingMode === 'measure'
          ? state.isDrawing ? 'CONTINUE_DRAWING' : 'START_DRAWING'
          : isPointElement
            ? 'ADD_ELEMENT'
            : state.isDrawing ? 'CONTINUE_DRAWING' : 'START_DRAWING';

        const payload = actionType === 'ADD_ELEMENT' 
            ? { type: state.drawingMode as 'basket' | 'mandatory', position: pos } 
            : pos;

        dispatch({ type: actionType, payload: payload as { type: 'basket' | 'mandatory', position: Position } | Position });
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
      {allElements.map(element => {
        const isDisabled = holeViewMode === 'current' && element.holeNumber !== state.currentHole;
        const isSelected = state.selectedElement === element.id;
        return (
          <MemoizedElementRenderer 
            key={element.id}
            element={element} 
            isDisabled={isDisabled}
            isSelected={isSelected}
          />
        );
      })}
      <TempRenderer />
    </> 
  );
};