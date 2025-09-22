
import * as L from 'leaflet';

// --- DATA & STATE STRUCTURES ---

export interface Position {
    lat: number;
    lng: number;
}

export interface CourseElement {
  id: string;
  type: 'tee' | 'basket' | 'ob-zone' | 'hazard' | 'mandatory';
  holeNumber: number;
  position?: L.LatLngLiteral;
  path?: L.LatLngLiteral[];
  coordinates?: L.LatLngLiteral[];
  properties?: { [key: string]: any };
  leafletLayer?: L.Layer;
}

export interface CourseHole {
  number: number;
  par: number;
  distance?: number;
  elements: CourseElement[];
}

export interface Measurement {
    points: L.LatLng[];
    distance: number;
}

export interface LeafletDrawingState {
  name: string;
  holes: CourseHole[];
  currentHole: number;
  drawingMode: CourseElement['type'] | 'measure' | null;
  selectedElement: string | null;
  isDrawing: boolean;
  tempPath: L.LatLngLiteral[];
  measurement: Measurement | null;
  map: L.Map | null;
  past: SnapshottableState[];
  future: SnapshottableState[];
}

export type SnapshottableState = Omit<LeafletDrawingState, 'past' | 'future' | 'map' | 'measurement'>;

// --- ACTION TYPES ---

export type LeafletDrawingAction =
  | { type: 'SET_MAP'; payload: L.Map }
  | { type: 'SET_DRAWING_MODE'; payload: LeafletDrawingState['drawingMode'] }
  | { type: 'SET_CURRENT_HOLE'; payload: number }
  | { type: 'UPDATE_COURSE_NAME'; payload: string }
  | { type: 'ADD_ELEMENT'; payload: Partial<CourseElement> }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CourseElement> } }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'ADD_HOLE'; payload: number }
  | { type: 'DELETE_HOLE'; payload: number }
  | { type: 'UPDATE_HOLE'; payload: { number: number, updates: Partial<CourseHole> } }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'START_DRAWING'; payload: L.LatLngLiteral }
  | { type: 'CONTINUE_DRAWING'; payload: L.LatLngLiteral }
  | { type: 'FINISH_DRAWING' }
  | { type: 'CANCEL_DRAWING' }
  | { type: 'LOAD_DATA'; payload: Partial<LeafletDrawingState> | null }
  | { type: 'UNDO' }
  | { type: 'REDO' };
