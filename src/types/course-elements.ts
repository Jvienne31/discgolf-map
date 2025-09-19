// Types pour les éléments de parcours de disc golf
export interface Position {
  lat: number;
  lng: number;
}

export interface CourseElement {
  id: string;
  type: ElementType;
  position?: Position;
  coordinates?: Position[];
  properties: ElementProperties;
  holeNumber?: number;
}

export type ElementType = 
  | 'tee' 
  | 'basket' 
  | 'ob-zone' 
  | 'hazard' 
  | 'mandatory' 
  | 'fairway'
  | 'measurement';

export interface ElementProperties {
  name?: string;
  description?: string;
  color?: string;
  strokeWidth?: number;
  fillColor?: string;
  fillOpacity?: number;
  distance?: number;
  par?: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  angle?: number; // Ajout pour mandatory
}

export interface Tee extends CourseElement {
  type: 'tee';
  position: Position;
  properties: ElementProperties & {
    teeType?: 'pro' | 'advanced' | 'intermediate' | 'beginner';
    elevation?: number;
  };
}

export interface Basket extends CourseElement {
  type: 'basket';
  position: Position;
  properties: ElementProperties & {
    elevation?: number;
    chainType?: string;
  };
}

export interface OBZone extends CourseElement {
  type: 'ob-zone';
  coordinates: Position[];
  properties: ElementProperties & {
    penalty?: 'stroke' | 'drop' | 'rethrow';
  };
}

export interface Hazard extends CourseElement {
  type: 'hazard';
  coordinates: Position[];
  properties: ElementProperties & {
    hazardType?: 'water' | 'rough' | 'mandos' | 'trees' | 'other';
  };
}

export interface Mandatory extends CourseElement {
  type: 'mandatory';
  coordinates: Position[];
  properties: ElementProperties & {
    mandoType?: 'left' | 'right' | 'gap';
  };
}

export interface Hole {
  number: number;
  par: number;
  distance: number;
  tees: Tee[];
  basket: Basket;
  elements: CourseElement[];
  name?: string;
  description?: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  holes: Hole[];
  location: {
    center: Position;
    bounds: {
      northEast: Position;
      southWest: Position;
    };
  };
  metadata: {
    created: Date;
    modified: Date;
    author?: string;
    version: string;
  };
}

export type DrawingMode = ElementType | 'select' | 'pan';

export interface DrawingState {
  mode: DrawingMode;
  isDrawing: boolean;
  currentHole: number;
  selectedElements: string[];
  tempCoordinates: Position[];
}