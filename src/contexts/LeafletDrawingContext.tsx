import { createContext, useContext, useReducer, ReactNode } from 'react';

// Types pour les éléments du parcours
export interface CourseElement {
  id: string;
  type: 'tee' | 'basket' | 'ob-zone' | 'hazard' | 'mandatory-line';
  holeNumber: number;
  position?: { lat: number; lng: number };
  path?: { lat: number; lng: number }[];
  properties?: {
    name?: string;
    description?: string;
    color?: string;
    strokeWidth?: number;
    fillOpacity?: number;
  };
  leafletLayer?: any; // Référence vers l'objet Leaflet
}

export interface CourseHole {
  number: number;
  par: number;
  distance?: number;
  elements: CourseElement[];
}

export interface LeafletDrawingState {
  holes: CourseHole[];
  currentHole: number;
  drawingMode: CourseElement['type'] | null;
  selectedElement: string | null;
  isDrawing: boolean;
  tempPath: { lat: number; lng: number }[];
  map: any; // Référence vers la carte Leaflet
}

// Actions
export type LeafletDrawingAction =
  | { type: 'SET_MAP'; payload: any }
  | { type: 'SET_DRAWING_MODE'; payload: CourseElement['type'] | null }
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
  | { type: 'DELETE_HOLE'; payload: number };

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
  map: null
};

// Reducer
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
      const currentHoleIndex = state.holes.findIndex(h => h.number === state.currentHole);
      if (currentHoleIndex === -1) return state;

      const updatedHoles = [...state.holes];
      updatedHoles[currentHoleIndex] = {
        ...updatedHoles[currentHoleIndex],
        elements: [...updatedHoles[currentHoleIndex].elements, action.payload]
      };

      return {
        ...state,
        holes: updatedHoles,
        drawingMode: null,
        isDrawing: false,
        tempPath: []
      };

    case 'UPDATE_ELEMENT':
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

      return {
        ...state,
        holes: updatedHolesForUpdate
      };

    case 'DELETE_ELEMENT':
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

      return {
        ...state,
        holes: updatedHolesForDelete,
        selectedElement: state.selectedElement === action.payload ? null : state.selectedElement
      };

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
  const [state, dispatch] = useReducer(leafletDrawingReducer, initialState);

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

export const getElementColor = (type: CourseElement['type']): string => {
  switch (type) {
    case 'tee':
      return '#2196f3'; // Bleu
    case 'basket':
      return '#ff9800'; // Orange
    case 'ob-zone':
      return '#f44336'; // Rouge
    case 'hazard':
      return '#ff5722'; // Rouge-orange
    case 'mandatory-line':
      return '#9c27b0'; // Violet
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
    case 'mandatory-line':
      return '➡️';
    default:
      return '📍';
  }
};