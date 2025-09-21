
// --- TYPES ---

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
    angle?: number;
  };
  leafletLayer?: any; // Leaflet layer reference, non-serializable
}

export interface CourseHole {
  number: number;
  par: number;
  distance?: number;
  elements: CourseElement[];
}

// The part of the state that can be snapshotted for undo/redo
export interface SnapshottableState {
    name: string;
    holes: CourseHole[];
    currentHole: number;
    drawingMode: CourseElement['type'] | 'measure' | null;
    selectedElement: string | null;
    isDrawing: boolean;
    tempPath: { lat: number; lng: number }[];
}

// The full state, including history and non-serializable map object
export interface LeafletDrawingState extends SnapshottableState {
    map: any;
    past: SnapshottableState[];
    future: SnapshottableState[];
}

export type LeafletDrawingAction =
  | { type: 'SET_MAP'; payload: any }
  | { type: 'SET_DRAWING_MODE'; payload: LeafletDrawingState['drawingMode'] }
  | { type: 'SET_CURRENT_HOLE'; payload: number }
  | { type: 'UPDATE_COURSE_NAME'; payload: string }
  | { type: 'ADD_ELEMENT'; payload: Omit<CourseElement, 'id' | 'holeNumber' | 'leafletLayer'> }
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
  | { type: 'LOAD_DATA'; payload: Partial<LeafletDrawingState> }
  | { type: 'UNDO' }
  | { type: 'REDO' };
