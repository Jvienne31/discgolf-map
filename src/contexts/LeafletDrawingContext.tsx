
import { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { getElementColor } from '../utils/layers';
import { CourseElement, CourseHole, SnapshottableState, LeafletDrawingState, LeafletDrawingAction, Measurement, Position } from './types';
import * as L from 'leaflet';

// --- INITIAL STATE ---

const initialState: LeafletDrawingState = {
  name: 'Nouveau Parcours',
  holes: [{ number: 1, par: 3, elements: [] }],
  currentHole: 1,
  drawingMode: null,
  selectedElement: null,
  isDrawing: false,
  tempPath: [],
  measurement: null,
  map: null,
  past: [],
  future: [],
};

// --- HELPERS ---

const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const cloneElementShallow = (e: CourseElement): Omit<CourseElement, 'leafletLayer'> => {
  const { leafletLayer, ...rest } = e;
  return JSON.parse(JSON.stringify(rest));
};

const cloneHoles = (holes: CourseHole[]): CourseHole[] => holes.map(h => ({
  ...h,
  elements: h.elements.map(cloneElementShallow),
}));

export const serializeState = (state: LeafletDrawingState): Partial<LeafletDrawingState> => {
  const { map, leafletLayer, measurement, ...rest } = state as any;
  return {
    ...rest,
    name: state.name,
    holes: cloneHoles(state.holes),
    past: [], 
    future: [],
  };
};

const snapshot = (state: LeafletDrawingState): SnapshottableState => {
  const { past, future, map, measurement, ...rest } = state;
  return { ...rest, name: state.name, holes: cloneHoles(rest.holes) };
};

const pushHistory = (state: LeafletDrawingState, snapshotablePart: SnapshottableState): LeafletDrawingState => {
  const newPast = [...state.past, snapshotablePart].slice(-100);
  return { ...state, past: newPast, future: [] };
};

const getPolygonCenter = (coordinates: Position[]): Position => {
    let lat = 0;
    let lng = 0;
    coordinates.forEach(coord => {
        lat += coord.lat;
        lng += coord.lng;
    });
    return { lat: lat / coordinates.length, lng: lng / coordinates.length };
}

const getTeePosition = (tee: CourseElement): Position | undefined => {
    if (tee.position) return tee.position;
    if (tee.coordinates) return getPolygonCenter(tee.coordinates);
    return undefined;
}

const recomputeHoleDistance = (hole: CourseHole): CourseHole => {
    const tee = hole.elements.find(e => e.type === 'tee');
    const basket = hole.elements.find(e => e.type === 'basket' && e.position);

    if (tee && basket) {
      const teePosition = getTeePosition(tee);
      if (teePosition && basket.position) {
        const toRad = (d: number) => d * Math.PI / 180;
        const R = 6371000;
        const dLat = toRad(basket.position.lat - teePosition.lat);
        const dLng = toRad(basket.position.lng - teePosition.lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(teePosition.lat)) * Math.cos(toRad(basket.position.lat)) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...hole, distance: Math.round(R * c) };
      }
    }
    return { ...hole, distance: undefined };
};

const synchronizeFlightPaths = (holes: CourseHole[]): CourseHole[] => {
  return holes.map(hole => {
    const tee = hole.elements.find(e => e.type === 'tee');
    const basket = hole.elements.find(e => e.type === 'basket');
    const flightPath = hole.elements.find(e => e.type === 'flight-path');
    
    const teePos = tee ? getTeePosition(tee) : undefined;
    const basketPos = basket?.position;

    let updatedElements = [...hole.elements];

    if (teePos && basketPos) {
      if (!flightPath) {
        // CREATE: Add flight path if it's missing
        const midPoint = {
          lat: (teePos.lat + basketPos.lat) / 2,
          lng: (teePos.lng + basketPos.lng) / 2
        };
        const newFlightPath: CourseElement = {
          id: generateId(),
          type: 'flight-path',
          holeNumber: hole.number,
          path: [teePos, midPoint, basketPos],
          properties: { color: getElementColor({type: 'flight-path'} as CourseElement) },
        };
        updatedElements.push(newFlightPath);

      } else {
        // UPDATE: Sync flight path ends with tee/basket position
        const teeChanged = flightPath.path[0].lat !== teePos.lat || flightPath.path[0].lng !== teePos.lng;
        const basketChanged = flightPath.path[flightPath.path.length - 1].lat !== basketPos.lat || flightPath.path[flightPath.path.length - 1].lng !== basketPos.lng;
        
        if (teeChanged || basketChanged) {
          const newPath = [...flightPath.path];
          newPath[0] = teePos;
          newPath[newPath.length - 1] = basketPos;
          
          updatedElements = updatedElements.map(el => 
            el.id === flightPath.id ? { ...flightPath, path: newPath } : el
          );
        }
      }
    } else {
      // DELETE: Remove flight path if tee or basket is missing
      if (flightPath) {
        updatedElements = updatedElements.filter(el => el.type !== 'flight-path');
      }
    }

    if (updatedElements.length !== hole.elements.length) {
      return { ...hole, elements: updatedElements };
    }
    // Check if deep equals, otherwise return the original hole
    if (JSON.stringify(hole.elements) !== JSON.stringify(updatedElements)) {
         return { ...hole, elements: updatedElements };
    }

    return hole;
  });
};

const recalcAllDistances = (holes: CourseHole[]) => holes.map(recomputeHoleDistance);

const calculateDistance = (points: {lat: number, lng: number}[]): number => {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = L.latLng(points[i].lat, points[i].lng);
        const p2 = L.latLng(points[i + 1].lat, points[i + 1].lng);
        totalDistance += p1.distanceTo(p2);
    }
    return Math.round(totalDistance);
}

// --- REDUCER ---

const leafletDrawingReducer = (state: LeafletDrawingState, action: LeafletDrawingAction): LeafletDrawingState => {
  
  const shouldPushHistory = [
    'ADD_ELEMENT', 'UPDATE_ELEMENT', 'DELETE_ELEMENT',
    'ADD_HOLE', 'DELETE_HOLE', 'UPDATE_HOLE',
    'UPDATE_COURSE_NAME'
  ].includes(action.type);

  const stateWithHistory = shouldPushHistory ? pushHistory(state, snapshot(state)) : state;

  switch (action.type) {
    case 'SET_MAP':
      return { ...state, map: action.payload };

    case 'SET_DRAWING_MODE':
      const measurement = action.payload === 'measure' ? state.measurement : null;
      return { ...state, drawingMode: action.payload, selectedElement: null, isDrawing: false, tempPath: [], measurement };

    case 'SET_CURRENT_HOLE':
      return { ...state, currentHole: action.payload, selectedElement: null, drawingMode: null };

    case 'UPDATE_COURSE_NAME':
        return { ...stateWithHistory, name: action.payload };
        
    case 'ADD_ELEMENT': {
      const { type, position, path, properties, coordinates } = action.payload;
      const newElement: CourseElement = {
        id: generateId(),
        type: type!,
        holeNumber: state.currentHole,
        position,
        path,
        coordinates,
        properties: { ...properties, color: properties?.color || getElementColor({type} as CourseElement) },
      };

      const updatedHoles = stateWithHistory.holes.map(h =>
        h.number === state.currentHole ? { ...h, elements: [...h.elements, newElement] } : h
      );

      const holesWithFlightPaths = synchronizeFlightPaths(updatedHoles);
      
      return {
        ...stateWithHistory,
        holes: recalcAllDistances(holesWithFlightPaths),
        isDrawing: false, tempPath: [], drawingMode: null,
      };
    }

    case 'UPDATE_ELEMENT': {
        const { id, updates } = action.payload;
        const updatedHoles = stateWithHistory.holes.map(h => ({
            ...h,
            elements: h.elements.map(el => (el.id === id ? { ...el, ...updates } : el)),
        }));
        
        const holesWithFlightPaths = synchronizeFlightPaths(updatedHoles);
        return { ...stateWithHistory, holes: recalcAllDistances(holesWithFlightPaths) };
    }

    case 'DELETE_ELEMENT': {
        const updatedHoles = stateWithHistory.holes.map(h => ({
            ...h,
            elements: h.elements.filter(el => el.id !== action.payload),
        }));

        const holesWithFlightPaths = synchronizeFlightPaths(updatedHoles);

        return {
            ...stateWithHistory,
            holes: recalcAllDistances(holesWithFlightPaths),
            selectedElement: state.selectedElement === action.payload ? null : state.selectedElement,
        };
    }

    case 'ADD_HOLE': {
        const newHole: CourseHole = { number: action.payload, par: 3, elements: [] };
        return {
          ...stateWithHistory,
          holes: [...stateWithHistory.holes, newHole].sort((a,b) => a.number - b.number)
        };
    }

    case 'DELETE_HOLE': {
        if (state.holes.length <= 1) return state;
        const filteredHoles = stateWithHistory.holes.filter(h => h.number !== action.payload);
        const newCurrentHole = state.currentHole === action.payload ? filteredHoles[0]?.number || 1 : state.currentHole;
        return { ...stateWithHistory, holes: filteredHoles, currentHole: newCurrentHole };
    }
    
    case 'UPDATE_HOLE': {
        const updatedHoles = stateWithHistory.holes.map(h => 
            h.number === action.payload.number ? { ...h, ...action.payload.updates } : h
        );
        return { ...stateWithHistory, holes: recalcAllDistances(updatedHoles) };
    }

    case 'SELECT_ELEMENT':
      return { ...state, selectedElement: action.payload, drawingMode: null };

    case 'START_DRAWING':
        if (state.drawingMode === 'measure') {
            return { ...state, isDrawing: true, measurement: { points: [action.payload], distance: 0 }};
        }
        return { ...state, isDrawing: true, tempPath: [action.payload] };

    case 'CONTINUE_DRAWING':
      if (!state.isDrawing) return state;

      if (state.drawingMode === 'measure' && state.measurement) {
        const newPoints = [...state.measurement.points, action.payload];
        return { ...state, measurement: { points: newPoints, distance: calculateDistance(newPoints) }};
      }
      
      if (state.drawingMode === 'tee') {
          if (state.tempPath.length === 1) {
              const newTempPath = [...state.tempPath, action.payload];
              return leafletDrawingReducer({ ...state, tempPath: newTempPath }, { type: 'FINISH_DRAWING' });
          }
      }

      if (['ob-zone', 'hazard'].includes(state.drawingMode || '')) {
        const firstPoint = state.tempPath[0];
        const lastPoint = action.payload;
        if (state.map && state.tempPath.length > 1) {
            const firstLatLng = state.map.options.crs.project(L.latLng(firstPoint));
            const lastLatLng = state.map.options.crs.project(L.latLng(lastPoint));
            const distance = firstLatLng.distanceTo(lastLatLng);
            if (distance < 10) { 
                return leafletDrawingReducer(state, { type: 'FINISH_DRAWING' });
            }
        }
        return { ...state, tempPath: [...state.tempPath, action.payload] };
      }
      return state;

    case 'FINISH_DRAWING':
      if (!state.isDrawing) return { ...state, isDrawing: false, tempPath: [] };

      if (state.drawingMode === 'measure') {
          return { ...state, isDrawing: false, drawingMode: null };
      }

      if (state.drawingMode === 'tee') {
          if (state.tempPath.length !== 2) return { ...state, isDrawing: false, tempPath: [] };
          const [p1, p2] = state.tempPath;
          const teeWidth = 1.5; // in meters
          if (!state.map) return state;

          const point1 = state.map.latLngToLayerPoint(p1);
          const point2 = state.map.latLngToLayerPoint(p2);
          
          const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x);
          
          const perpAngle = angle + Math.PI / 2;

          const dx = (teeWidth / 2) * Math.cos(perpAngle);
          const dy = (teeWidth / 2) * Math.sin(perpAngle);

          const c1 = state.map.layerPointToLatLng(L.point(point1.x + dx, point1.y + dy));
          const c2 = state.map.layerPointToLatLng(L.point(point1.x - dx, point1.y - dy));
          const c3 = state.map.layerPointToLatLng(L.point(point2.x - dx, point2.y - dy));
          const c4 = state.map.layerPointToLatLng(L.point(point2.x + dx, point2.y + dy));
          
          const newElementAction: LeafletDrawingAction = {
              type: 'ADD_ELEMENT',
              payload: {
                  type: 'tee',
                  coordinates: [c1, c2, c3, c4],
              }
          };
          return leafletDrawingReducer(state, newElementAction);
      }

      if (state.drawingMode && ['ob-zone', 'hazard'].includes(state.drawingMode)) {
        if (state.tempPath.length < 3) {
            return { ...state, isDrawing: false, tempPath: [], drawingMode: null };
        }
        const newElementAction: LeafletDrawingAction = {
            type: 'ADD_ELEMENT',
            payload: {
                type: state.drawingMode as 'ob-zone' | 'hazard',
                path: [...state.tempPath, state.tempPath[0]],
            }
        };
        return leafletDrawingReducer(state, newElementAction);
      }
      
      return { ...state, isDrawing: false, tempPath: [] };

    case 'CANCEL_DRAWING':
      if (state.drawingMode === 'measure') {
          return { ...state, isDrawing: false, drawingMode: null, measurement: null };
      }
      return { ...state, isDrawing: false, tempPath: [], drawingMode: null };

    case 'LOAD_DATA': {
        const data = action.payload;
        if (!data) return initialState;
        const sanitizedHoles = (data.holes || []).map(hole => ({
          ...(hole as CourseHole),
          elements: (hole.elements || []).map(el => ({
            ...el,
            properties: { ...el.properties, color: el.properties?.color || getElementColor(el.type) },
          })),
        }));
        const holesWithFlightPaths = synchronizeFlightPaths(sanitizedHoles);
        return {
          ...initialState,
          ...data,
          name: data.name || 'Parcours sans nom',
          holes: recalcAllDistances(holesWithFlightPaths),
          currentHole: data.currentHole || 1,
          past: [],
          future: [],
          map: state.map,
        };
    }

    case 'UNDO': {
        const present = snapshot(state);
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);
        return { ...state, ...previous, past: newPast, future: [present, ...state.future] };
    }

    case 'REDO': {
        const present = snapshot(state);
        if (state.future.length === 0) return state;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        return { ...state, ...next, past: [...state.past, present], future: newFuture };
    }

    default:
      return state;
  }
};

// --- CONTEXT & PROVIDER ---

interface LeafletDrawingContextType {
  state: LeafletDrawingState;
  dispatch: React.Dispatch<LeafletDrawingAction>;
  saveCourse: () => void;
}

const LeafletDrawingContext = createContext<LeafletDrawingContextType | null>(null);

interface ProviderProps {
    children: ReactNode;
    courseId: string;
}

export const LeafletDrawingProvider = ({ children, courseId }: ProviderProps) => {
  const [state, dispatch] = useReducer(leafletDrawingReducer, initialState);

  useEffect(() => {
    if (typeof window !== 'undefined' && courseId) {
      const savedState = localStorage.getItem(courseId);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          dispatch({ type: 'LOAD_DATA', payload: parsed });
        } catch (error) {
          console.error(`Impossible de charger le parcours ${courseId}. Les données sont peut-être corrompues.`, error);
        }
      } else {
          dispatch({ type: 'LOAD_DATA', payload: { ...initialState, name: 'Nouveau Parcours' }});
      }
    }
  }, [courseId]);

  const saveCourse = useCallback(() => {
    if (courseId && typeof window !== 'undefined') {
      try {
        const stateToSave = serializeState(state);
        localStorage.setItem(courseId, JSON.stringify(stateToSave));
        console.log(`✅ Parcours ${courseId} sauvegardé avec succès !`);
      } catch(e) {
          console.error(`❌ Erreur lors de la sauvegarde du parcours ${courseId}:`, e);
      }
    }
  }, [state, courseId]);

  return (
    <LeafletDrawingContext.Provider value={{ state, dispatch, saveCourse }}>
      {children}
    </LeafletDrawingContext.Provider>
  );
};

// --- HOOK ---

export const useLeafletDrawing = () => {
  const context = useContext(LeafletDrawingContext);
  if (!context) {
    throw new Error("useLeafletDrawing doit être utilisé dans un LeafletDrawingProvider");
  }
  return context;
};
