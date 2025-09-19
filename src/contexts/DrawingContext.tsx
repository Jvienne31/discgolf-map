import { createContext, useContext, useReducer, ReactNode } from 'react';
import { DrawingState, DrawingMode, CourseElement, Hole, Course } from '../types/course-elements';

// État initial
const initialState: DrawingState & {
  course: Course | null;
  holes: Hole[];
  elements: CourseElement[];
} = {
  mode: 'select',
  isDrawing: false,
  currentHole: 1,
  selectedElements: [],
  tempCoordinates: [],
  course: null,
  holes: [],
  elements: []
};

// Actions
type DrawingAction = 
  | { type: 'SET_MODE'; payload: DrawingMode }
  | { type: 'START_DRAWING' }
  | { type: 'STOP_DRAWING' }
  | { type: 'SET_CURRENT_HOLE'; payload: number }
  | { type: 'SELECT_ELEMENTS'; payload: string[] }
  | { type: 'ADD_ELEMENT'; payload: CourseElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CourseElement> } }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'ADD_TEMP_COORDINATE'; payload: { lat: number; lng: number } }
  | { type: 'CLEAR_TEMP_COORDINATES' }
  | { type: 'CREATE_COURSE'; payload: Partial<Course> }
  | { type: 'UPDATE_COURSE'; payload: Partial<Course> };

// Reducer
function drawingReducer(state: typeof initialState, action: DrawingAction): typeof initialState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        isDrawing: false,
        tempCoordinates: []
      };
    
    case 'START_DRAWING':
      return {
        ...state,
        isDrawing: true,
        tempCoordinates: []
      };
    
    case 'STOP_DRAWING':
      return {
        ...state,
        isDrawing: false,
        tempCoordinates: []
      };
    
    case 'SET_CURRENT_HOLE':
      return {
        ...state,
        currentHole: action.payload,
        selectedElements: []
      };
    
    case 'SELECT_ELEMENTS':
      return {
        ...state,
        selectedElements: action.payload
      };
    
    case 'ADD_ELEMENT':
      const newElement = {
        ...action.payload,
        holeNumber: action.payload.holeNumber || state.currentHole
      };
      return {
        ...state,
        elements: [...state.elements, newElement],
        isDrawing: false,
        tempCoordinates: []
      };
    
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map(el => 
          el.id === action.payload.id 
            ? { ...el, ...action.payload.updates }
            : el
        )
      };
    
    case 'DELETE_ELEMENT':
      return {
        ...state,
        elements: state.elements.filter(el => el.id !== action.payload),
        selectedElements: state.selectedElements.filter(id => id !== action.payload)
      };
    
    case 'ADD_TEMP_COORDINATE':
      return {
        ...state,
        tempCoordinates: [...state.tempCoordinates, action.payload]
      };
    
    case 'CLEAR_TEMP_COORDINATES':
      return {
        ...state,
        tempCoordinates: []
      };
    
    case 'CREATE_COURSE':
      const course: Course = {
        id: action.payload.id || `course-${Date.now()}`,
        name: action.payload.name || 'Nouveau Parcours',
        description: action.payload.description || '',
        holes: action.payload.holes || [],
        location: action.payload.location || {
          center: { lat: 46.8182, lng: -71.2278 },
          bounds: {
            northEast: { lat: 46.82, lng: -71.22 },
            southWest: { lat: 46.816, lng: -71.236 }
          }
        },
        metadata: {
          created: new Date(),
          modified: new Date(),
          author: action.payload.metadata?.author || '',
          version: '1.0.0'
        }
      };
      return {
        ...state,
        course
      };
    
    case 'UPDATE_COURSE':
      return {
        ...state,
        course: state.course ? { ...state.course, ...action.payload } : null
      };
    
    default:
      return state;
  }
}

// Context
interface DrawingContextType {
  state: typeof initialState;
  setMode: (mode: DrawingMode) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  setCurrentHole: (hole: number) => void;
  selectElements: (ids: string[]) => void;
  addElement: (element: CourseElement) => void;
  updateElement: (id: string, updates: Partial<CourseElement>) => void;
  deleteElement: (id: string) => void;
  addTempCoordinate: (coord: { lat: number; lng: number }) => void;
  clearTempCoordinates: () => void;
  createCourse: (course: Partial<Course>) => void;
  updateCourse: (updates: Partial<Course>) => void;
  getCurrentHoleElements: () => CourseElement[];
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

// Provider
interface DrawingProviderProps {
  children: ReactNode;
}

export const DrawingProvider = ({ children }: DrawingProviderProps) => {
  const [state, dispatch] = useReducer(drawingReducer, initialState);

  const setMode = (mode: DrawingMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  };

  const startDrawing = () => {
    dispatch({ type: 'START_DRAWING' });
  };

  const stopDrawing = () => {
    dispatch({ type: 'STOP_DRAWING' });
  };

  const setCurrentHole = (hole: number) => {
    dispatch({ type: 'SET_CURRENT_HOLE', payload: hole });
  };

  const selectElements = (ids: string[]) => {
    dispatch({ type: 'SELECT_ELEMENTS', payload: ids });
  };

  const addElement = (element: CourseElement) => {
    dispatch({ type: 'ADD_ELEMENT', payload: element });
  };

  const updateElement = (id: string, updates: Partial<CourseElement>) => {
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } });
  };

  const deleteElement = (id: string) => {
    dispatch({ type: 'DELETE_ELEMENT', payload: id });
  };

  const addTempCoordinate = (coord: { lat: number; lng: number }) => {
    dispatch({ type: 'ADD_TEMP_COORDINATE', payload: coord });
  };

  const clearTempCoordinates = () => {
    dispatch({ type: 'CLEAR_TEMP_COORDINATES' });
  };

  const createCourse = (course: Partial<Course>) => {
    dispatch({ type: 'CREATE_COURSE', payload: course });
  };

  const updateCourse = (updates: Partial<Course>) => {
    dispatch({ type: 'UPDATE_COURSE', payload: updates });
  };

  const getCurrentHoleElements = () => {
    return state.elements.filter(el => el.holeNumber === state.currentHole);
  };

  const value: DrawingContextType = {
    state,
    setMode,
    startDrawing,
    stopDrawing,
    setCurrentHole,
    selectElements,
    addElement,
    updateElement,
    deleteElement,
    addTempCoordinate,
    clearTempCoordinates,
    createCourse,
    updateCourse,
    getCurrentHoleElements
  };

  return (
    <DrawingContext.Provider value={value}>
      {children}
    </DrawingContext.Provider>
  );
};

// Hook
export const useDrawing = (): DrawingContextType => {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return context;
};