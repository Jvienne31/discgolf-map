import { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';

// Types pour les éléments du parcours
export interface CourseElement {
  id: string;
  type: 'tee' | 'basket' | 'ob-zone' | 'hazard' | 'mandatory';
  holeNumber: number;
  position?: { lat: number; lng: number };
  path?: { lat: number; lng: number }[];
  properties?: {
    name?: string;
    description?: string;
    color?: string;
    strokeWidth?: number;
    fillOpacity?: number;
    angle?: number; // Ajout pour mandatory
  };
  leafletLayer?: any; // Référence vers l'objet Leaflet
}

export interface CourseHole {
  number: number;
  par: number;
  distance?: number; // distance tee -> panier (m)
  elements: CourseElement[];
}

export interface LeafletDrawingState {
  holes: CourseHole[];
  currentHole: number;
  drawingMode: (CourseElement['type'] | 'measure') | null;
  selectedElement: string | null;
  isDrawing: boolean;
  tempPath: { lat: number; lng: number }[];
  map: any; // Référence vers la carte Leaflet
  past: Omit<LeafletDrawingState, 'past' | 'future' | 'map'>[]; // historique (sans recursion)
  future: Omit<LeafletDrawingState, 'past' | 'future' | 'map'>[];
}

// Actions
export type LeafletDrawingAction =
  | { type: 'SET_MAP'; payload: any }
  | { type: 'SET_DRAWING_MODE'; payload: (CourseElement['type'] | 'measure') | null }
  | { type: 'SET_CURRENT_HOLE'; payload: number }
  | { type: 'ADD_ELEMENT'; payload: CourseElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CourseElement> } }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'START_DRAWING'; payload: { lat: number; lng: number } }
  | { type: 'CONTINUE_DRAWING'; payload: { lat: number; lng: number } }
  | { type: 'FINISH_DRAWING' }
  | { type: 'CANCEL_DRAWING' }
  | { type: 'ADD_HOLE'; payload: number }
  | { type: 'DELETE_HOLE'; payload: number }
  | { type: 'UPDATE_HOLE'; payload: { number: number; updates: Partial<CourseHole> } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// État initial
const initialState: LeafletDrawingState = {
  holes: [
    {
      number: 1,
      par: 3,
      elements: []
    }
  ],
  currentHole: 1,
  drawingMode: null,
  selectedElement: null,
  isDrawing: false,
  tempPath: [],
  map: null,
  past: [],
  future: []
};

// --- Helpers de sérialisation & snapshots sans références circulaires ---
const cloneElementShallow = (e: CourseElement) => {
  const { leafletLayer, ...rest } = e; // retirer référence Leaflet
  return {
    ...rest,
    position: rest.position ? { ...rest.position } : undefined,
    path: rest.path ? rest.path.map(p => ({ ...p })) : undefined,
    properties: rest.properties ? { ...rest.properties } : undefined
  } as CourseElement;
};

const cloneHoles = (holes: CourseHole[]): CourseHole[] => holes.map(h => ({
  ...h,
  elements: h.elements.map(cloneElementShallow)
}));

export const serializeState = (state: LeafletDrawingState) => {
  const { holes, currentHole, drawingMode, selectedElement, isDrawing, tempPath } = state;
  return {
    holes: cloneHoles(holes),
    currentHole,
    drawingMode,
    selectedElement,
    isDrawing,
    tempPath,
    past: state.past.map(p => ({ ...p, holes: cloneHoles(p.holes) })),
    future: state.future.map(f => ({ ...f, holes: cloneHoles(f.holes) })),
    map: null
  };
};

// Reducer
const snapshot = (s: LeafletDrawingState) => {
  const { holes, currentHole, drawingMode, selectedElement, isDrawing, tempPath } = s;
  return { holes: cloneHoles(holes), currentHole, drawingMode, selectedElement, isDrawing, tempPath };
};

const pushHistory = (state: LeafletDrawingState): LeafletDrawingState => {
  const pastEntry = snapshot(state);
  return { ...state, past: [...state.past, pastEntry], future: [] };
};

const recomputeHoleDistance = (hole: CourseHole): CourseHole => {
  const tee = hole.elements.find(e => e.type === 'tee' && e.position);
  const basket = hole.elements.find(e => e.type === 'basket' && e.position);
  if (tee && basket && tee.position && basket.position) {
    const toRad = (d: number) => d * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(basket.position.lat - tee.position.lat);
    const dLng = toRad(basket.position.lng - tee.position.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(tee.position.lat))*Math.cos(toRad(basket.position.lat))*Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = Math.round(R * c);
    return { ...hole, distance: dist };
  }
  return { ...hole, distance: undefined };
};

const recalcAllDistances = (holes: CourseHole[]): CourseHole[] => holes.map(h => recomputeHoleDistance(h));

const leafletDrawingReducer = (state: LeafletDrawingState, action: LeafletDrawingAction): LeafletDrawingState => {
  console.log('🔄 Action reçue dans le reducer:', action.type, 'payload' in action ? action.payload : 'pas de payload');
  
  switch (action.type) {
    case 'SET_MAP':
      return { ...state, map: action.payload };

    case 'SET_DRAWING_MODE':
      console.log('🎯 Changement de mode de dessin:', action.payload);
      return {
        ...state,
        drawingMode: action.payload,
        selectedElement: null,
        isDrawing: false,
        tempPath: []
      };

    case 'SET_CURRENT_HOLE':
      return {
        ...state,
        currentHole: action.payload,
        selectedElement: null,
        drawingMode: null,
        isDrawing: false,
        tempPath: []
      };

    case 'ADD_ELEMENT':
      state = pushHistory(state);
      const currentHoleIndex = state.holes.findIndex(h => h.number === state.currentHole);
      if (currentHoleIndex === -1) return state;

      const updatedHoles = [...state.holes];
      updatedHoles[currentHoleIndex] = {
        ...updatedHoles[currentHoleIndex],
        elements: [...updatedHoles[currentHoleIndex].elements, action.payload]
      };
      const holesWithDistance = recalcAllDistances(updatedHoles);

      return {
        ...state,
        holes: holesWithDistance,
        drawingMode: null,
        isDrawing: false,
        tempPath: []
      };

    case 'UPDATE_ELEMENT':
      state = pushHistory(state);
      const holeIndex = state.holes.findIndex(h => 
        h.elements.some(e => e.id === action.payload.id)
      );
      if (holeIndex === -1) return state;

      const updatedHolesForUpdate = [...state.holes];
      const elementIndex = updatedHolesForUpdate[holeIndex].elements.findIndex(
        e => e.id === action.payload.id
      );
      
      updatedHolesForUpdate[holeIndex].elements[elementIndex] = {
        ...updatedHolesForUpdate[holeIndex].elements[elementIndex],
        ...action.payload.updates
      };

      return { ...state, holes: recalcAllDistances(updatedHolesForUpdate) };

    case 'DELETE_ELEMENT':
      state = pushHistory(state);
      const holeWithElement = state.holes.findIndex(h => 
        h.elements.some(e => e.id === action.payload)
      );
      if (holeWithElement === -1) return state;

      const updatedHolesForDelete = [...state.holes];
      updatedHolesForDelete[holeWithElement] = {
        ...updatedHolesForDelete[holeWithElement],
        elements: updatedHolesForDelete[holeWithElement].elements.filter(
          e => e.id !== action.payload
        )
      };

      return { ...state, holes: recalcAllDistances(updatedHolesForDelete), selectedElement: state.selectedElement === action.payload ? null : state.selectedElement };

    case 'SELECT_ELEMENT':
      return {
        ...state,
        selectedElement: action.payload,
        drawingMode: null,
        isDrawing: false,
        tempPath: []
      };

    case 'START_DRAWING':
      return {
        ...state,
        isDrawing: true,
        tempPath: [action.payload]
      };

    case 'CONTINUE_DRAWING':
      return {
        ...state,
        tempPath: [...state.tempPath, action.payload]
      };

    case 'FINISH_DRAWING':
      return {
        ...state,
        isDrawing: false,
        tempPath: []
      };

    case 'CANCEL_DRAWING':
      return {
        ...state,
        drawingMode: null,
        isDrawing: false,
        tempPath: []
      };

    case 'ADD_HOLE':
      state = pushHistory(state);
      const newHole: CourseHole = {
        number: action.payload,
        par: 3,
        elements: []
      };
      
      return {
        ...state,
        holes: [...state.holes, newHole].sort((a, b) => a.number - b.number)
      };

    case 'DELETE_HOLE':
      state = pushHistory(state);
      if (state.holes.length <= 1) return state; // Garder au moins un trou
      
      const filteredHoles = state.holes.filter(h => h.number !== action.payload);
      const newCurrentHole = state.currentHole === action.payload ? 
        (filteredHoles.length > 0 ? filteredHoles[0].number : 1) : 
        state.currentHole;

      return {
        ...state,
        holes: filteredHoles,
        currentHole: newCurrentHole,
        selectedElement: null,
        drawingMode: null,
        isDrawing: false,
        tempPath: []
      };

    case 'UPDATE_HOLE': {
      state = pushHistory(state);
      const idx = state.holes.findIndex(h => h.number === action.payload.number);
      if (idx === -1) return state;
      const holes = [...state.holes];
      holes[idx] = { ...holes[idx], ...action.payload.updates };
      return { ...state, holes };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      const futureEntry = snapshot(state);
      return { ...state, ...prev, map: state.map, past: newPast, future: [futureEntry, ...state.future] } as LeafletDrawingState;
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      const pastEntry = snapshot(state);
      return { ...state, ...next, map: state.map, past: [...state.past, pastEntry], future: rest } as LeafletDrawingState;
    }

    default:
      return state;
  }
};

// Context
const LeafletDrawingContext = createContext<{
  state: LeafletDrawingState;
  dispatch: React.Dispatch<LeafletDrawingAction>;
} | null>(null);

// Provider
interface LeafletDrawingProviderProps {
  children: ReactNode;
}

export const LeafletDrawingProvider = ({ children }: LeafletDrawingProviderProps) => {
  // Charger depuis localStorage si dispo
  const loadedRef = useRef(false);
  const initializer = (): LeafletDrawingState => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('dgmap_state_v1') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.map = null; // Ne jamais restaurer l'objet map (non sérialisable)
        if (!parsed.past) parsed.past = [];
        if (!parsed.future) parsed.future = [];
        // Recalcul distances pour compatibilité ascendante
        parsed.holes = (parsed.holes || []).map((h: CourseHole) => ({ ...h }));
        parsed.holes = parsed.holes.map((h: CourseHole) => {
          // recompute distance
          const tee = h.elements?.find((e: CourseElement) => e.type === 'tee' && e.position);
          const basket = h.elements?.find((e: CourseElement) => e.type === 'basket' && e.position);
            if (tee && basket && tee.position && basket.position) {
              const toRad = (d: number) => d * Math.PI / 180;
              const R = 6371000;
              const dLat = toRad(basket.position.lat - tee.position.lat);
              const dLng = toRad(basket.position.lng - tee.position.lng);
              const a = Math.sin(dLat/2)**2 + Math.cos(toRad(tee.position.lat))*Math.cos(toRad(basket.position.lat))*Math.sin(dLng/2)**2;
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const dist = Math.round(R * c);
              return { ...h, distance: dist };
            }
            return { ...h, distance: undefined };
        });
        return parsed as LeafletDrawingState;
      }
    } catch {}
    return initialState;
  };
  const [state, dispatch] = useReducer(leafletDrawingReducer, undefined, initializer);

  // Sauvegarde
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
    }
    try {
      const toSave = serializeState(state);
      window.localStorage.setItem('dgmap_state_v1', JSON.stringify(toSave));
    } catch {}
  }, [state]);

  return (
    <LeafletDrawingContext.Provider value={{ state, dispatch }}>
      {children}
    </LeafletDrawingContext.Provider>
  );
};

// Hook personnalisé
export const useLeafletDrawing = () => {
  const context = useContext(LeafletDrawingContext);
  if (!context) {
    throw new Error('useLeafletDrawing must be used within a LeafletDrawingProvider');
  }
  return context;
};

// Utilitaires
export const generateElementId = () => {
  return `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getElementColor = (type: CourseElement['type'] | 'measure'): string => {
  switch (type) {
    case 'tee':
      return '#2196f3'; // Bleu
    case 'basket':
      return '#ff9800'; // Orange
    case 'ob-zone':
      return '#f44336'; // Rouge
    case 'hazard':
      return '#ff5722'; // Rouge-orange
    // mandatory-line supprimé
    case 'mandatory':
      return '#009688'; // Cyan foncé pour mandatory
    case 'measure':
      return '#607d8b'; // Gris bleuté
    default:
      return '#000000';
  }
};

export const getElementIcon = (type: CourseElement['type']): string => {
  switch (type) {
    case 'tee':
      return '🎯';
    case 'basket':
      return '🥏';
    case 'ob-zone':
      return '❌';
    case 'hazard':
      return '⚠️';
    // mandatory-line supprimé
    case 'mandatory':
      return '⬆️';
    default:
      return '📍';
  }
};