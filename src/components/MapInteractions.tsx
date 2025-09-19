import { useEffect } from 'react';
import { useMapEvents, Marker, Polygon, Polyline, Circle } from 'react-leaflet';
import * as L from 'leaflet';
import { useDrawing } from '../contexts/DrawingContext';
import { CourseElement, Position } from '../types/course-elements';

// Icônes personnalisées pour les éléments
const createCustomIcon = (type: string, color: string = '#3388ff') => {
  const iconSize = type === 'basket' ? [32, 32] : [24, 24];
  
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: ${iconSize[0]}px;
        height: ${iconSize[1]}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: ${type === 'basket' ? '16px' : '12px'};
      ">
        ${type === 'tee' ? 'T' : type === 'basket' ? 'P' : '●'}
      </div>
    `,
    className: `custom-${type}-icon`,
    iconSize: iconSize as [number, number],
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2] as [number, number]
  });
};

// Composant pour afficher un élément
const ElementRenderer = ({ element }: { element: CourseElement }) => {
  const { state, selectElements } = useDrawing();
  const isSelected = state.selectedElements.includes(element.id);
  
  const handleClick = () => {
    selectElements([element.id]);
  };

  switch (element.type) {
    case 'tee':
      return element.position ? (
        <Marker
          position={[element.position.lat, element.position.lng]}
          icon={createCustomIcon('tee', '#4caf50')}
          eventHandlers={{ click: handleClick }}
        />
      ) : null;

    case 'basket':
      return element.position ? (
        <Marker
          position={[element.position.lat, element.position.lng]}
          icon={createCustomIcon('basket', '#ff9800')}
          eventHandlers={{ click: handleClick }}
        />
      ) : null;

    case 'ob-zone':
      return element.coordinates && element.coordinates.length > 2 ? (
        <Polygon
          positions={element.coordinates.map(pos => [pos.lat, pos.lng])}
          pathOptions={{
            color: '#f44336',
            fillColor: '#f44336',
            fillOpacity: 0.3,
            weight: isSelected ? 4 : 2
          }}
          eventHandlers={{ click: handleClick }}
        />
      ) : null;

    case 'hazard':
      return element.coordinates && element.coordinates.length > 2 ? (
        <Polygon
          positions={element.coordinates.map(pos => [pos.lat, pos.lng])}
          pathOptions={{
            color: '#2196f3',
            fillColor: '#2196f3',
            fillOpacity: 0.2,
            weight: isSelected ? 4 : 2,
            dashArray: '5, 5'
          }}
          eventHandlers={{ click: handleClick }}
        />
      ) : null;

    case 'mandatory':
      return element.coordinates && element.coordinates.length > 1 ? (
        <Polyline
          positions={element.coordinates.map(pos => [pos.lat, pos.lng])}
          pathOptions={{
            color: '#9c27b0',
            weight: isSelected ? 6 : 4,
            dashArray: '10, 5'
          }}
          eventHandlers={{ click: handleClick }}
        />
      ) : null;

    case 'measurement':
      return element.coordinates && element.coordinates.length > 1 ? (
        <Polyline
          positions={element.coordinates.map(pos => [pos.lat, pos.lng])}
          pathOptions={{
            color: '#607d8b',
            weight: isSelected ? 4 : 2,
            dashArray: '2, 2'
          }}
          eventHandlers={{ click: handleClick }}
        />
      ) : null;

    default:
      return null;
  }
};

// Composant pour les coordonnées temporaires pendant le dessin
const TempRenderer = () => {
  const { state } = useDrawing();
  
  if (state.tempCoordinates.length === 0) return null;

  // Pour les polygones (ob-zone, hazard)
  if (['ob-zone', 'hazard'].includes(state.mode) && state.tempCoordinates.length > 2) {
    const color = state.mode === 'ob-zone' ? '#f44336' : '#2196f3';
    return (
      <Polygon
        positions={state.tempCoordinates.map(pos => [pos.lat, pos.lng])}
        pathOptions={{
          color,
          fillColor: color,
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '5, 5'
        }}
      />
    );
  }

  // Pour les lignes (mandatory, measurement)
  if (['mandatory', 'measurement'].includes(state.mode) && state.tempCoordinates.length > 1) {
    const color = state.mode === 'mandatory' ? '#9c27b0' : '#607d8b';
    return (
      <Polyline
        positions={state.tempCoordinates.map(pos => [pos.lat, pos.lng])}
        pathOptions={{
          color,
          weight: 3,
          dashArray: '5, 5'
        }}
      />
    );
  }

  // Pour les points individuels
  return (
    <>
      {state.tempCoordinates.map((pos, index) => (
        <Circle
          key={index}
          center={[pos.lat, pos.lng]}
          radius={2}
          pathOptions={{
            color: '#ff5722',
            fillColor: '#ff5722',
            fillOpacity: 0.8
          }}
        />
      ))}
    </>
  );
};

export const MapInteractions = () => {
  const { 
    state, 
    addElement, 
    addTempCoordinate, 
    clearTempCoordinates,
    stopDrawing,
    getCurrentHoleElements
  } = useDrawing();

  // Gestion des clics sur la carte
  useMapEvents({
    click: (e: any) => {
      const position: Position = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };

      switch (state.mode) {
        case 'tee':
        case 'basket':
          // Placement direct des éléments ponctuels
          const pointElement: CourseElement = {
            id: `${state.mode}-${Date.now()}-${Math.random()}`,
            type: state.mode,
            position,
            properties: {
              name: state.mode === 'tee' ? `Tee ${state.currentHole}` : `Panier ${state.currentHole}`,
              color: state.mode === 'tee' ? '#4caf50' : '#ff9800'
            },
            holeNumber: state.currentHole
          };
          addElement(pointElement);
          break;

        case 'ob-zone':
        case 'hazard':
        case 'mandatory':
        case 'measurement':
          // Mode dessin pour les éléments multi-points
          if (!state.isDrawing) {
            // Commencer le dessin
            addTempCoordinate(position);
          } else {
            // Continuer le dessin
            addTempCoordinate(position);
          }
          break;

        case 'select':
        default:
          // Mode sélection - ne rien faire ici, géré par les éléments individuels
          break;
      }
    },

    dblclick: (_e: any) => {
      // Double-clic pour terminer le dessin des éléments multi-points
      if (state.isDrawing && ['ob-zone', 'hazard', 'mandatory', 'measurement'].includes(state.mode)) {
        if (state.tempCoordinates.length >= 2) {
          const lineElement: CourseElement = {
            id: `${state.mode}-${Date.now()}-${Math.random()}`,
            type: state.mode as any,
            coordinates: state.tempCoordinates,
            properties: {
              name: `${state.mode} ${state.currentHole}`,
              color: '#607d8b' // Couleur par défaut
            },
            holeNumber: state.currentHole
          };
          addElement(lineElement);
          clearTempCoordinates();
          stopDrawing();
        }
      }
    },

    keydown: (e: any) => {
      // Échapper pour annuler le dessin
      if (e.originalEvent.key === 'Escape') {
        clearTempCoordinates();
        stopDrawing();
      }
    }
  });

  // Démarrer automatiquement le dessin pour les éléments multi-points
  useEffect(() => {
    if (['ob-zone', 'hazard', 'mandatory', 'measurement'].includes(state.mode) && !state.isDrawing) {
      // On ne démarre pas automatiquement, on attend le premier clic
    }
  }, [state.mode]);

  const currentElements = getCurrentHoleElements();

  return (
    <>
      {/* Afficher les éléments du trou actuel */}
      {currentElements.map(element => (
        <ElementRenderer key={element.id} element={element} />
      ))}
      
      {/* Afficher les coordonnées temporaires pendant le dessin */}
      <TempRenderer />
    </>
  );
};