import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MapLayer = 'osm' | 'satellite' | 'satellite-labels' | 'topo';

interface MapContextType {
  currentLayer: MapLayer;
  setCurrentLayer: (layer: MapLayer) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
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

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [currentLayer, setCurrentLayer] = useState<MapLayer>('osm');
  const [zoom, setZoom] = useState(13);

  return (
    <MapContext.Provider
      value={{
        currentLayer,
        setCurrentLayer,
        zoom,
        setZoom,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};