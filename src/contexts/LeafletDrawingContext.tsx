
import { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import { getElementColor } from '../utils/layers';
import { CourseElement, CourseHole, SnapshottableState, LeafletDrawingState, LeafletDrawingAction } from './types';

// --- INITIAL STATE ---

const initialState: LeafletDrawingState = {
  holes: [{ number: 1, par: 3, elements: [] }],
  currentHole: 1,
  drawingMode: null,
  selectedElement: null,
  isDrawing: false,
  tempPath: [],
  map: null,
  past: [],
  future: [],
};

// --- HELPERS ---

const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const cloneElementShallow = (e: CourseElement): Omit<CourseElement, 'leafletLayer'> => {
  const { leafletLayer, ...rest } = e; // Exclude non-serializable parts
  return JSON.parse(JSON.stringify(rest)); // Deep clone for safety
};

const cloneHoles = (holes: CourseHole[]): CourseHole[] => holes.map(h => ({
  ...h,
  elements: h.elements.map(cloneElementShallow),
}));

export const serializeState = (state: LeafletDrawingState): Partial<LeafletDrawingState> => {
  const { map, leafletLayer, ...rest } = state as any;
  return {
    ...rest,
    holes: cloneHoles(state.holes),
    past: state.past.map(p => ({ ...p, holes: cloneHoles(p.holes) })),
    future: state.future.map(f => ({ ...f, holes: cloneHoles(f.holes) })),
  };
};

const snapshot = (state: LeafletDrawingState): SnapshottableState => {
  const { past, future, map, ...rest } = state;
  return { ...rest, holes: cloneHoles(rest.holes) };
};

const pushHistory = (state: LeafletDrawingState, snapshotablePart: SnapshottableState): LeafletDrawingState => {
  const newPast = [...state.past, snapshotablePart].slice(-100); // Limit history size
  return { ...state, past: newPast, future: [] };
};

const recomputeHoleDistance = (hole: CourseHole): CourseHole => {
    const tee = hole.elements.find(e => e.type === 'tee' && e.position);
    const basket = hole.elements.find(e => e.type === 'basket' && e.position);
    if (tee && basket && tee.position && basket.position) {
      const toRad = (d: number) => d * Math.PI / 180;
      const R = 6371000; // Earth radius in meters
      const dLat = toRad(basket.position.lat - tee.position.lat);
      const dLng = toRad(basket.position.lng - tee.position.lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(tee.position.lat)) * Math.cos(toRad(basket.position.lat)) * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...hole, distance: Math.round(R * c) };
    }
    return { ...hole, distance: undefined };
};
const recalcAllDistances = (holes: CourseHole[]) => holes.map(recomputeHoleDistance);

// --- REDUCER ---

const leafletDrawingReducer = (state: LeafletDrawingState, action: LeafletDrawingAction): LeafletDrawingState => {
  const present = snapshot(state);

  switch (action.type) {
    case 'SET_MAP':
      return { ...state, map: action.payload };

    case 'SET_DRAWING_MODE':
      return { ...state, drawingMode: action.payload, selectedElement: null, isDrawing: false, tempPath: [] };

    case 'SET_CURRENT_HOLE':
      return { ...state, currentHole: action.payload, selectedElement: null, drawingMode: null };

    // Actions that modify history
    case 'ADD_ELEMENT': {
      const stateWithHistory = pushHistory(state, present);
      const { type, position, path, properties } = action.payload;
      const newElement: CourseElement = {
        id: generateId(),
        type,
        holeNumber: state.currentHole,
        position,
        path,
        properties: { ...properties, color: properties?.color || getElementColor(type) },
      };

      const updatedHoles = stateWithHistory.holes.map(h =>
        h.number === state.currentHole ? { ...h, elements: [...h.elements, newElement] } : h
      );

      return {
        ...stateWithHistory,
        holes: recalcAllDistances(updatedHoles),
        isDrawing: false, tempPath: [], drawingMode: null,
      };
    }

    case 'UPDATE_ELEMENT': {
        const stateWithHistory = pushHistory(state, present);
        const { id, updates } = action.payload;
        const updatedHoles = stateWithHistory.holes.map(h => ({
            ...h,
            elements: h.elements.map(el => (el.id === id ? { ...el, ...updates, leafletLayer: el.leafletLayer } : el)),
        }));
        return { ...stateWithHistory, holes: recalcAllDistances(updatedHoles) };
    }

    case 'DELETE_ELEMENT': {
        const stateWithHistory = pushHistory(state, present);
        const updatedHoles = stateWithHistory.holes.map(h => ({
            ...h,
            elements: h.elements.filter(el => el.id !== action.payload),
        }));
        return {
            ...stateWithHistory,
            holes: recalcAllDistances(updatedHoles),
            selectedElement: state.selectedElement === action.payload ? null : state.selectedElement,
        };
    }

    case 'ADD_HOLE': {
        const stateWithHistory = pushHistory(state, present);
        const newHole: CourseHole = { number: action.payload, par: 3, elements: [] };
        return {
          ...stateWithHistory,
          holes: [...stateWithHistory.holes, newHole].sort((a,b) => a.number - b.number)
        };
    }

    case 'DELETE_HOLE': {
        const stateWithHistory = pushHistory(state, present);
        if (state.holes.length <= 1) return state;
        const filteredHoles = stateWithHistory.holes.filter(h => h.number !== action.payload);
        const newCurrentHole = state.currentHole === action.payload ? filteredHoles[0]?.number || 1 : state.currentHole;
        return { ...stateWithHistory, holes: filteredHoles, currentHole: newCurrentHole };
    }
    
    case 'UPDATE_HOLE': {
        const stateWithHistory = pushHistory(state, present);
        const updatedHoles = stateWithHistory.holes.map(h => 
            h.number === action.payload.number ? { ...h, ...action.payload.updates } : h
        );
        return { ...stateWithHistory, holes: recalcAllDistances(updatedHoles) };
    }

    // Actions that DO NOT modify history
    case 'SELECT_ELEMENT':
      return { ...state, selectedElement: action.payload, drawingMode: null };

    case 'START_DRAWING':
      return { ...state, isDrawing: true, tempPath: [action.payload] };

    case 'CONTINUE_DRAWING':
      if (!state.isDrawing) return state;
      // Check if the new point is close to the first point to close the polygon
      if (['ob-zone', 'hazard'].includes(state.drawingMode || '') && state.tempPath.length > 1) {
        const firstPoint = state.tempPath[0];
        const lastPoint = action.payload;
        if (state.map) {
            const firstLatLng = state.map.options.crs.project(firstPoint);
            const lastLatLng = state.map.options.crs.project(lastPoint);
            const distance = firstLatLng.distanceTo(lastLatLng);
            if (distance < 10) { // 10 meters threshold
                // Finish drawing if close to the start
                return leafletDrawingReducer(state, { type: 'FINISH_DRAWING' });
            }
        }
      }
      return { ...state, tempPath: [...state.tempPath, action.payload] };

    case 'FINISH_DRAWING':
      if (!state.isDrawing || !state.drawingMode || state.tempPath.length < 1) {
        return { ...state, isDrawing: false, tempPath: [] };
      }
      // Logic for creating polygons (OB zones, hazards)
      if (['ob-zone', 'hazard'].includes(state.drawingMode)) {
        if (state.tempPath.length < 3) { // A polygon needs at least 3 points
            return { ...state, isDrawing: false, tempPath: [], drawingMode: null };
        }
        const newElementAction: LeafletDrawingAction = {
            type: 'ADD_ELEMENT',
            payload: {
                type: state.drawingMode as 'ob-zone' | 'hazard',
                path: [...state.tempPath, state.tempPath[0]], // Close the polygon by adding the first point at the end
            }
        };
        return leafletDrawingReducer(state, newElementAction);
      }
       // For other drawing types that might finish differently
      return { ...state, isDrawing: false, tempPath: [] };

    case 'CANCEL_DRAWING':
      return { ...state, isDrawing: false, tempPath: [], drawingMode: null };

    case 'LOAD_DATA': {
        const data = action.payload;
        if (!data || !data.holes) return initialState;
        const sanitizedHoles = (data.holes || []).map(hole => ({
          ...(hole as CourseHole),
          elements: (hole.elements || []).map(el => ({
            ...el,
            properties: { ...el.properties, color: el.properties?.color || getElementColor(el.type) },
          })),
        }));
        return {
          ...initialState,
          ...data,
          holes: recalcAllDistances(sanitizedHoles),
          currentHole: data.currentHole || 1,
          past: data.past || [],
          future: data.future || [],
          map: state.map, // Keep current map instance
        };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      return {
          ...state,
          ...previous,
          past: newPast,
          future: [present, ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
          ...state,
          ...next,
          past: [...state.past, present],
          future: newFuture,
      };
    }

    default:
      return state;
  }
};

// --- CONTEXT & PROVIDER ---

const LeafletDrawingContext = createContext<{
  state: LeafletDrawingState;
  dispatch: React.Dispatch<LeafletDrawingAction>;
} | null>(null);

export const LeafletDrawingProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(leafletDrawingReducer, initialState);
  const loaded = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('dgmap_state_v1');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          dispatch({ type: 'LOAD_DATA', payload: parsed });
        } catch (error) {
          console.error("Failed to load from localStorage:", error);
          localStorage.removeItem('dgmap_state_v1');
        }
      }
      loaded.current = true;
    }
  }, []);

  useEffect(() => {
    if (loaded.current && typeof window !== 'undefined') {
      try {
        const stateToSave = serializeState(state);
        localStorage.setItem('dgmap_state_v1', JSON.stringify(stateToSave));
      } catch(e) {
          console.error("Failed to save to localStorage:", e);
      }
    }
  }, [state]);

  return (
    <LeafletDrawingContext.Provider value={{ state, dispatch }}>
      {children}
    </LeafletDrawingContext.Provider>
  );
};

// --- HOOK ---

export const useLeafletDrawing = () => {
  const context = useContext(LeafletDrawingContext);
  if (!context) {
    throw new Error('useLeafletDrawing must be used within a LeafletDrawingProvider');
  }
  return context;
};
