import { useEffect, useRef, useState } from 'react';
import { Box, ButtonGroup, Button } from '@mui/material';
import { Satellite, Map as MapIcon, Terrain, Layers, HighQuality, Public } from '@mui/icons-material';
import { useLeafletDrawing, CourseElement, generateElementId, getElementColor } from '../contexts/LeafletDrawingContext';
import { layerConfigs, layerNames, BaseLayerKey } from '../utils/layers';
import { debugLog } from '../utils/debug';

const DiagnosticMapComponent = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentLayerRef = useRef<any>(null);
  // Ref pour signaler qu'une initialisation est en cours (éviter course condition StrictMode)
  const initializingRef = useRef(false);
  const [currentLayer, setCurrentLayer] = useState<BaseLayerKey>('osm');
  
  // Hook pour le contexte de dessin
  const { state: drawingState, dispatch: drawingDispatch } = useLeafletDrawing();

  // (configs et noms extraits dans utils/layers.ts)

  // Ref pour toujours disposer de l'état le plus récent dans les handlers Leaflet
  const drawingStateRef = useRef(drawingState);
  useEffect(() => { drawingStateRef.current = drawingState; }, [drawingState]);

  // Prévisualisation temporaire des formes en cours de dessin
  const tempShapeRef = useRef<any>(null);

  // Effet: mise à jour / création / suppression de la forme temporaire selon l'état de dessin
  useEffect(() => {
    const run = async () => {
      if (!mapInstanceRef.current) return;
      // Ne pas afficher pour les points
      if (!drawingState.drawingMode || drawingState.drawingMode === 'tee' || drawingState.drawingMode === 'basket') {
        if (tempShapeRef.current) {
          mapInstanceRef.current.removeLayer(tempShapeRef.current);
          tempShapeRef.current = null;
        }
        return;
      }
      if (!drawingState.isDrawing) {
        if (tempShapeRef.current) {
          mapInstanceRef.current.removeLayer(tempShapeRef.current);
          tempShapeRef.current = null;
        }
        return;
      }
      const L = await import('leaflet');
  const pts: [number, number][] = drawingState.tempPath.map(p => [p.lat, p.lng] as [number, number]);
      if (pts.length === 0) return;
      const color = getElementColor(drawingState.drawingMode);
      // Choix: polyline pour preview; si >=3 points et type zone on peut afficher polygon
      const isZone = drawingState.drawingMode === 'ob-zone' || drawingState.drawingMode === 'hazard';
      const canPolygon = isZone && pts.length >= 3;
      if (!tempShapeRef.current) {
        tempShapeRef.current = canPolygon
          ? L.polygon(pts, { color, weight: 2, fillOpacity: 0.15, fillColor: color, dashArray: '6 4' })
          : L.polyline(pts, { color, weight: 2, opacity: 0.8, dashArray: '6 4' });
        tempShapeRef.current.addTo(mapInstanceRef.current);
      } else {
        // Si on doit convertir polyline->polygon
        if (canPolygon && !(tempShapeRef.current instanceof (await import('leaflet')).Polygon)) {
          mapInstanceRef.current.removeLayer(tempShapeRef.current);
          tempShapeRef.current = L.polygon(pts, { color, weight: 2, fillOpacity: 0.15, fillColor: color, dashArray: '6 4' });
          tempShapeRef.current.addTo(mapInstanceRef.current);
        } else {
          tempShapeRef.current.setLatLngs(pts);
        }
      }
    };
    run();
  }, [drawingState.drawingMode, drawingState.isDrawing, drawingState.tempPath]);

  // Effet: ESC pour annuler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drawingDispatch({ type: 'CANCEL_DRAWING' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawingDispatch]);

  // Effet: mise à jour style/icône des éléments existants quand leurs propriétés changent
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    // Parcourir tous les éléments
    drawingState.holes.forEach(hole => {
      hole.elements.forEach(el => {
        if (!el.leafletLayer) return;
        const color = el.properties?.color || getElementColor(el.type);
        // Point: recréer l'icône si couleur ou name change
        if (el.type === 'tee' || el.type === 'basket') {
          if (el.leafletLayer.setIcon) {
            const glyph = el.type === 'tee' ? 'T' : 'B';
            const L = (window as any).L; // si global disponible, sinon ignorer
            if (L) {
              const icon = L.divIcon({
                html: `\n                  <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">\n                    <svg viewBox='0 0 40 40' width='30' height='30'>\n                      <circle cx='20' cy='20' r='18' fill='${color}' stroke='white' stroke-width='3' />\n                      <text x='20' y='24' font-size='16' font-family='Arial, sans-serif' font-weight='bold' fill='white' text-anchor='middle'>${glyph}</text>\n                    </svg>\n                  </div>` ,
                className: '',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              });
              try { el.leafletLayer.setIcon(icon); } catch {}
            }
          }
        } else {
          // Ligne / zone: appliquer style
            if (el.leafletLayer.setStyle) {
              const style: any = { color };
              if (el.type !== 'mandatory-line') {
                style.fillColor = color;
              }
              try { el.leafletLayer.setStyle(style); } catch {}
            }
        }
      });
    });
  }, [drawingState.holes]);

  useEffect(() => {
    const initMap = async () => {
      try {
  if (!mapRef.current) return;
  // Empêcher ré-initialisation (StrictMode double render). Si une init est déjà en cours, on sort.
  if (mapInstanceRef.current || initializingRef.current) return;
  initializingRef.current = true;

        // Nettoyer éventuel _leaflet_id résiduel
        if ((mapRef.current as any)._leaflet_id) {
          try { delete (mapRef.current as any)._leaflet_id; } catch { /* noop */ }
        }

  const L = await import('leaflet');
        const map = L.map(mapRef.current, {
          center: [46.2276, 2.2137],
          zoom: 13,
          zoomControl: true,
          doubleClickZoom: true,
          scrollWheelZoom: true,
          maxBoundsViscosity: 0.8,
          preferCanvas: false
        });
        mapInstanceRef.current = map;

  updateLayer('osm', L);
  drawingDispatch({ type: 'SET_MAP', payload: map });
  debugLog('🎉 Carte initialisée (unique)');

        // Enregistrer les handlers UNE SEULE FOIS et lire l'état via ref
        map.on('click', async (e: any) => {
          const L2 = await import('leaflet'); // lazy au besoin
            const ds = drawingStateRef.current;
            const { lat, lng } = e.latlng;
            debugLog('🖱️ Click map -> mode:', ds.drawingMode);
            if (ds.drawingMode === 'tee' || ds.drawingMode === 'basket') {
              createPointElement(ds.drawingMode, { lat, lng }, L2);
            } else if (ds.drawingMode && !ds.isDrawing) {
              drawingDispatch({ type: 'START_DRAWING', payload: { lat, lng } });
            } else if (ds.isDrawing) {
              drawingDispatch({ type: 'CONTINUE_DRAWING', payload: { lat, lng } });
            }
        });

        map.on('dblclick', async (e: any) => {
          const ds = drawingStateRef.current;
          if (ds.isDrawing && ds.drawingMode && ds.drawingMode !== 'tee' && ds.drawingMode !== 'basket') {
            const { lat, lng } = e.latlng;
            const finalPath = [...ds.tempPath, { lat, lng }];
            // Validation des longueurs minimales
            if ((ds.drawingMode === 'mandatory-line' && finalPath.length < 2) ||
                ((ds.drawingMode === 'ob-zone' || ds.drawingMode === 'hazard') && finalPath.length < 3)) {
              drawingDispatch({ type: 'CANCEL_DRAWING' });
              return;
            }
            const L2 = await import('leaflet');
            createPathElement(ds.drawingMode, finalPath, L2);
            drawingDispatch({ type: 'FINISH_DRAWING' });
          }
        });
      } catch (err) {
  debugLog('❌ Erreur init carte:', err);
      } finally {
        // Quel que soit le résultat, libérer le flag pour éviter blocage si erreur
        initializingRef.current = false;
      }
    };
    initMap();
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (tempShapeRef.current && mapInstanceRef.current) {
        try { mapInstanceRef.current.removeLayer(tempShapeRef.current); } catch {}
        tempShapeRef.current = null;
      }
    };
  }, []);

  // Effet pour ré-associer la carte au contexte si le provider est remonté (StrictMode) et que l'init est sautée
  useEffect(() => {
    if (!drawingState.map && mapInstanceRef.current) {
      drawingDispatch({ type: 'SET_MAP', payload: mapInstanceRef.current });
    }
  }, [drawingState.map, drawingDispatch]);

  // Fonction pour changer de couche
  const updateLayer = async (layerType: string, L?: any) => {
    if (!mapInstanceRef.current) return;
    
    if (!L) {
      L = await import('leaflet');
    }

    // Supprimer la couche actuelle
    if (currentLayerRef.current) {
      if (Array.isArray(currentLayerRef.current)) {
        currentLayerRef.current.forEach(layer => mapInstanceRef.current.removeLayer(layer));
      } else {
        mapInstanceRef.current.removeLayer(currentLayerRef.current);
      }
    }

    const config = layerConfigs[layerType as keyof typeof layerConfigs];

    if (layerType === 'satellite-labels') {
      // Couche satellite avec labels
      const satelliteConfig = config as any;
      const baseLayer = L.tileLayer(satelliteConfig.baseUrl, {
        attribution: satelliteConfig.attribution,
        maxZoom: satelliteConfig.maxZoom,
        maxNativeZoom: satelliteConfig.maxNativeZoom
      });
      
      const labelsLayer = L.tileLayer(satelliteConfig.labelsUrl, {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: satelliteConfig.maxZoom,
        maxNativeZoom: satelliteConfig.maxNativeZoom
      });

      baseLayer.addTo(mapInstanceRef.current);
      labelsLayer.addTo(mapInstanceRef.current);
      currentLayerRef.current = [baseLayer, labelsLayer];
    } else {
      // Couche simple
      const standardConfig = config as any;
      const options: any = {
        attribution: standardConfig.attribution,
        maxZoom: standardConfig.maxZoom,
        maxNativeZoom: standardConfig.maxNativeZoom
      };

      if (standardConfig.subdomains) {
        options.subdomains = standardConfig.subdomains;
      }

      const newLayer = L.tileLayer(standardConfig.url, options);
      newLayer.addTo(mapInstanceRef.current);
      currentLayerRef.current = newLayer;
    }
  };

  // Gestionnaire de changement de couche
  const handleLayerChange = (layerType: typeof currentLayer) => {
    setCurrentLayer(layerType);
    updateLayer(layerType);
  };

  // (Ancienne fonction setupDrawingEvents supprimée – événements maintenant gérés dans l'effet d'initialisation avec ref.)

  // Créer un élément ponctuel (tee, basket)
  const createPointElement = (type: 'tee' | 'basket', position: { lat: number; lng: number }, L: any) => {
    const element: CourseElement = {
      id: generateElementId(),
      type,
      holeNumber: drawingState.currentHole,
      position,
      properties: {
        name: `${type} ${drawingState.currentHole}`,
        color: getElementColor(type)
      }
    };

    // Icône SVG plus nette
    const color = getElementColor(type);
    const glyph = type === 'tee' ? 'T' : 'B';
    const icon = L.divIcon({
      html: `\n        <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">\n          <svg viewBox='0 0 40 40' width='30' height='30'>\n            <circle cx='20' cy='20' r='18' fill='${color}' stroke='white' stroke-width='3' />\n            <text x='20' y='24' font-size='16' font-family='Arial, sans-serif' font-weight='bold' fill='white' text-anchor='middle'>${glyph}</text>\n          </svg>\n        </div>` ,
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([position.lat, position.lng], { icon, draggable: true }).addTo(mapInstanceRef.current);
    marker.on('dragend', () => {
      const newLatLng = marker.getLatLng();
      drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: element.id, updates: { position: { lat: newLatLng.lat, lng: newLatLng.lng } } }});
    });
    
    marker.on('click', (ev: any) => {
      ev.originalEvent?.stopPropagation?.();
      drawingDispatch({ type: 'SELECT_ELEMENT', payload: element.id });
    });
    marker.on('contextmenu', (ev: any) => {
      ev.originalEvent?.preventDefault?.();
      drawingDispatch({ type: 'DELETE_ELEMENT', payload: element.id });
      if (marker && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });

    element.leafletLayer = marker;
    drawingDispatch({ type: 'ADD_ELEMENT', payload: element });
  };

  // Créer un élément de chemin (zone, ligne)
  const createPathElement = (
    type: 'ob-zone' | 'hazard' | 'mandatory-line', 
    path: { lat: number; lng: number }[], 
    L: any
  ) => {
    if (path.length < 2) return; // Besoin d'au moins 2 points

    const element: CourseElement = {
      id: generateElementId(),
      type,
      holeNumber: drawingState.currentHole,
      path,
      properties: {
        name: `${type} ${drawingState.currentHole}`,
        color: getElementColor(type),
        strokeWidth: type === 'mandatory-line' ? 4 : 2,
        fillOpacity: type === 'mandatory-line' ? 0 : 0.3
      }
    };

    // Convertir en format Leaflet
    const latlngs = path.map(p => [p.lat, p.lng]);

    let layer;
    if (type === 'mandatory-line') {
      // Ligne
      layer = L.polyline(latlngs, {
        color: element.properties!.color,
        weight: element.properties!.strokeWidth,
        opacity: 0.8
      }).addTo(mapInstanceRef.current);
    } else {
      // Zone (polygon)
      layer = L.polygon(latlngs, {
        color: element.properties!.color,
        weight: element.properties!.strokeWidth,
        fillOpacity: element.properties!.fillOpacity,
        fillColor: element.properties!.color
      }).addTo(mapInstanceRef.current);
    }

    layer.on('click', () => {
      drawingDispatch({ type: 'SELECT_ELEMENT', payload: element.id });
    });

    element.leafletLayer = layer;
    drawingDispatch({ type: 'ADD_ELEMENT', payload: element });
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Container pour la carte */}
      <Box
        ref={mapRef}
        sx={{
          height: '100%',
          width: '100%',
          cursor: drawingState.drawingMode ? (drawingState.drawingMode === 'tee' || drawingState.drawingMode === 'basket' ? 'crosshair' : 'cell') : 'grab',
          '& .leaflet-container': {
            height: '100%',
            width: '100%',
            imageRendering: 'pixelated'
          },
          '& .leaflet-tile-container .leaflet-tile': {
            imageRendering: 'pixelated',
            transition: 'opacity 0.2s ease-in-out'
          }
        }}
      />
      
      {/* Sélecteur de couches - responsive */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 8, sm: 16 },
          right: { xs: 8, sm: 16 },
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <ButtonGroup 
          orientation="vertical" 
          variant="contained" 
          size="small"
          sx={{
            '& .MuiButton-root': {
              minWidth: { xs: 100, sm: 140 },
              fontSize: { xs: '0.6rem', sm: '0.75rem' },
              px: { xs: 1, sm: 2 },
              py: { xs: 0.5, sm: 1 }
            }
          }}
        >
          <Button
            onClick={() => handleLayerChange('osm')}
            variant={currentLayer === 'osm' ? 'contained' : 'outlined'}
            startIcon={<MapIcon />}
          >
            Carte OSM
          </Button>
          <Button
            onClick={() => handleLayerChange('satellite')}
            variant={currentLayer === 'satellite' ? 'contained' : 'outlined'}
            startIcon={<Satellite />}
          >
            Satellite Esri
          </Button>
          <Button
            onClick={() => handleLayerChange('satellite-hd')}
            variant={currentLayer === 'satellite-hd' ? 'contained' : 'outlined'}
            startIcon={<HighQuality />}
          >
            Sat HD Google
          </Button>
          <Button
            onClick={() => handleLayerChange('satellite-labels')}
            variant={currentLayer === 'satellite-labels' ? 'contained' : 'outlined'}
            startIcon={<Layers />}
          >
            Sat + Labels
          </Button>
          <Button
            onClick={() => handleLayerChange('satellite-hybrid')}
            variant={currentLayer === 'satellite-hybrid' ? 'contained' : 'outlined'}
            startIcon={<Public />}
          >
            Google Hybrid
          </Button>
          <Button
            onClick={() => handleLayerChange('topo')}
            variant={currentLayer === 'topo' ? 'contained' : 'outlined'}
            startIcon={<Terrain />}
          >
            Topo
          </Button>
        </ButtonGroup>
      </Box>

      {/* Informations sur la couche actuelle - responsive */}
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 8, sm: 16 },
          left: { xs: 8, sm: 16 },
          zIndex: 1000,
          backgroundColor: 'rgba(76, 175, 80, 0.95)',
          color: 'white',
          padding: { xs: 1, sm: 1.5 },
          borderRadius: 1,
          fontSize: { xs: '0.7rem', sm: '0.8rem' },
          maxWidth: { xs: '250px', sm: '400px' },
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: { xs: 'none', sm: 'block' }, // Caché sur mobile
        }}
      >
        <strong>🎉 Carte réparée et opérationnelle !</strong>
        <br />
        📍 <strong>Couche:</strong> {layerNames[currentLayer]}
        <br />
        🔍 <strong>Ultra-zoom:</strong> Jusqu'au niveau 22
        <br />
        🎯 <strong>Prêt pour:</strong> Intégration des outils de dessin
      </Box>
      {drawingState.drawingMode === 'measure' && drawingState.tempPath.length > 1 && (
        <Box sx={{
          position:'absolute',
          top: 10,
          left: 10,
          background:'rgba(0,0,0,0.6)',
          color:'#fff',
          padding:'4px 8px',
          fontSize:'0.75rem',
          borderRadius:4,
          zIndex:1200
        }}>
          {(() => {
            const pts = drawingState.tempPath;
            const R = 6371000;
            const toRad = (d:number)=> d*Math.PI/180;
            let dist = 0;
            for (let i=1;i<pts.length;i++) {
              const a = pts[i-1]; const b = pts[i];
              const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
              const A = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
              const c = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1-A));
              dist += R * c;
            }
            return `📏 ${dist < 1000 ? dist.toFixed(1)+' m' : (dist/1000).toFixed(2)+' km'}`;
          })()}
        </Box>
      )}
    </Box>
  );
};

export default DiagnosticMapComponent;