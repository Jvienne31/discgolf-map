// Centralisation des configurations de couches Leaflet
// Sépare la logique de la carte pour simplifier DiagnosticMapComponent

export type BaseLayerKey = 'osm' | 'satellite' | 'satellite-hd' | 'satellite-labels' | 'satellite-hybrid' | 'topo';

export interface LayerConfigCommon {
  attribution: string;
  maxZoom: number;
  maxNativeZoom: number;
}

export interface SimpleLayerConfig extends LayerConfigCommon {
  url: string;
  subdomains?: string;
}

export interface SatelliteLabelsConfig extends LayerConfigCommon {
  baseUrl: string;
  labelsUrl: string;
}

export type LayerConfig = SimpleLayerConfig | SatelliteLabelsConfig;

export const layerConfigs: Record<BaseLayerKey, LayerConfig> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 22,
    maxNativeZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 22,
    maxNativeZoom: 18
  },
  'satellite-hd': {
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 22,
    maxNativeZoom: 20,
    subdomains: '0123'
  },
  'satellite-labels': {
    baseUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 22,
    maxNativeZoom: 18
  },
  'satellite-hybrid': {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 22,
    maxNativeZoom: 20,
    subdomains: '0123'
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 22,
    maxNativeZoom: 17
  }
};

export const layerNames: Record<BaseLayerKey, string> = {
  osm: 'OpenStreetMap',
  satellite: 'Satellite Esri',
  'satellite-hd': 'Satellite HD Google',
  'satellite-labels': 'Satellite + Labels',
  'satellite-hybrid': 'Google Hybrid',
  topo: 'Topographique'
};
