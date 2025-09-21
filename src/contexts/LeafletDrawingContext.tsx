
import { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { getElementColor } from '../utils/layers';
import { CourseElement, CourseHole, SnapshottableState, LeafletDrawingState, LeafletDrawingAction } from './types';

// --- INITIAL STATE ---

const initialState: LeafletDrawingState = {
  name: 'Nouveau Parcours',
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
  const { leafletLayer, ...rest } = e;
  return JSON.parse(JSON.stringify(rest));
};

const cloneHoles = (holes: CourseHole[]): CourseHole[] => holes.map(h => ({
  ...h,
  elements: h.elements.map(cloneElementShallow),
}));

export const serializeState = (state: LeafletDrawingState): Partial<LeafletDrawingState> => {
  const { map, leafletLayer, ...rest } = state as any;
  return {
    ...rest,
    name: state.name,
    holes: cloneHoles(state.holes),
    past: [], // On ne sauvegarde plus l'historique pour alléger
    future: [],
  };
};

const snapshot = (state: LeafletDrawingState): SnapshottableState => {
  const { past, future, map, ...rest } = state;
  return { ...rest, name: state.name, holes: cloneHoles(rest.holes) };
};

const pushHistory = (state: LeafletDrawingState, snapshotablePart: SnapshottableState): LeafletDrawingState => {
  const newPast = [...state.past, snapshotablePart].slice(-100);
  return { ...state, past: newPast, future: [] };
};

const recomputeHoleDistance = (hole: CourseHole): CourseHole => {
    const tee = hole.elements.find(e => e.type === 'tee' && e.position);
    const basket = hole.elements.find(e => e.type === 'basket' && e.position);
    if (tee && basket && tee.position && basket.position) {
      const toRad = (d: number) => d * Math.PI / 180;
      const R = 6371000;
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
  
  // History is only pushed for actions that are undoable
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
      return { ...state, drawingMode: action.payload, selectedElement: null, isDrawing: false, tempPath: [] };

    case 'SET_CURRENT_HOLE':
      return { ...state, currentHole: action.payload, selectedElement: null, drawingMode: null };

    case 'UPDATE_COURSE_NAME':
        return { ...stateWithHistory, name: action.payload };
        
    case 'ADD_ELEMENT': {
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
        const { id, updates } = action.payload;
        const updatedHoles = stateWithHistory.holes.map(h => ({
            ...h,
            elements: h.elements.map(el => (el.id === id ? { ...el, ...updates, leafletLayer: el.leafletLayer } : el)),
        }));
        return { ...stateWithHistory, holes: recalcAllDistances(updatedHoles) };
    }

    case 'DELETE_ELEMENT': {
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
      return { ...state, isDrawing: true, tempPath: [action.payload] };

    case 'CONTINUE_DRAWING':
      if (!state.isDrawing) return state;
      if (['ob-zone', 'hazard'].includes(state.drawingMode || '') && state.tempPath.length > 1) {
        const firstPoint = state.tempPath[0];
        const lastPoint = action.payload;
        if (state.map) {
            const firstLatLng = state.map.options.crs.project(firstPoint);
            const lastLatLng = state.map.options.crs.project(lastPoint);
            const distance = firstLatLng.distanceTo(lastLatLng);
            if (distance < 10) { // 10m threshold
                return leafletDrawingReducer(state, { type: 'FINISH_DRAWING' });
            }
        }
      }
      return { ...state, tempPath: [...state.tempPath, action.payload] };

    case 'FINISH_DRAWING':
      if (!state.isDrawing || !state.drawingMode || state.tempPath.length < 1) {
        return { ...state, isDrawing: false, tempPath: [] };
      }
      if (['ob-zone', 'hazard'].includes(state.drawingMode)) {
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
        return {
          ...initialState,
          ...data,
          name: data.name || 'Parcours sans nom',
          holes: recalcAllDistances(sanitizedHoles),
          currentHole: data.currentHole || 1,
          past: [], // Do not load history
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
          // **IMPORTANT**: On ne supprime plus les données en cas d'erreur.
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
    throw new Error('useLeafletDrawing doit être utilisé à l\'intérieur d\'un LeafletDrawingProvider');
  }
  return context;
};
