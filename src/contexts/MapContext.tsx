import { createContext, useContext, useState, ReactNode } from 'react';

export type MapLayer = 'osm' | 'satellite' | 'satellite-labels' | 'topo';

interface MapContextType {
  currentLayer: MapLayer;
  setCurrentLayer: (layer: MapLayer) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  fieldMode: boolean;
  setFieldMode: (enabled: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider = ({ children }: MapProviderProps) => {
  const [currentLayer, setCurrentLayer] = useState<MapLayer>('osm');
  const [zoom, setZoom] = useState(13);
  const [fieldMode, setFieldMode] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <MapContext.Provider
      value={{
        currentLayer,
        setCurrentLayer,
        zoom,
        setZoom,
        fieldMode,
        setFieldMode,
        userLocation,
        setUserLocation,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};