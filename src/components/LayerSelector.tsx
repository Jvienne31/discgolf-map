import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';

interface LayerSelectorProps {
  selectedLayer: string;
}

export const LayerSelector = ({ selectedLayer }: LayerSelectorProps) => {
  const map = useMap();
  const currentLayersRef = useRef<L.TileLayer[]>([]);

  const layerConfigs = {
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

  useEffect(() => {
    // Supprimer toutes les couches actuelles
    currentLayersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    currentLayersRef.current = [];

    // Ajouter la nouvelle couche selon le type sélectionné
    const config = layerConfigs[selectedLayer as keyof typeof layerConfigs] || layerConfigs.osm;
    
    if (selectedLayer === 'satellite-labels') {
      // Pour satellite avec labels, on ajoute d'abord la base satellite puis les labels
      const satelliteConfig = config as {
        baseUrl: string;
        labelsUrl: string;
        attribution: string;
        maxZoom: number;
        maxNativeZoom?: number;
      };
      
      const baseLayer = L.tileLayer(satelliteConfig.baseUrl, {
        attribution: satelliteConfig.attribution,
        maxZoom: satelliteConfig.maxZoom,
        maxNativeZoom: satelliteConfig.maxNativeZoom || satelliteConfig.maxZoom
      });
      
      const labelsLayer = L.tileLayer(satelliteConfig.labelsUrl, {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: satelliteConfig.maxZoom,
        maxNativeZoom: satelliteConfig.maxNativeZoom || satelliteConfig.maxZoom
      });

      baseLayer.addTo(map);
      labelsLayer.addTo(map);
      currentLayersRef.current = [baseLayer, labelsLayer];
    } else {
      // Pour les autres couches, une seule couche
      const standardConfig = config as {
        url: string;
        attribution: string;
        maxZoom: number;
        maxNativeZoom?: number;
        subdomains?: string;
      };
      
      const tileLayerOptions: any = {
        attribution: standardConfig.attribution,
        maxZoom: standardConfig.maxZoom,
        maxNativeZoom: standardConfig.maxNativeZoom || standardConfig.maxZoom
      };

      // Ajouter subdomains si disponible (pour Google)
      if (standardConfig.subdomains) {
        tileLayerOptions.subdomains = standardConfig.subdomains;
      }

      const newLayer = L.tileLayer(standardConfig.url, tileLayerOptions);

      newLayer.addTo(map);
      currentLayersRef.current = [newLayer];
    }

    // Cleanup function
    return () => {
      currentLayersRef.current.forEach(layer => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
    };
  }, [selectedLayer, map]);

  return null;
};