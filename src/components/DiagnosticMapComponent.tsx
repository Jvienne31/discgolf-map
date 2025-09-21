import { layerConfigs } from '../utils/layers';
import { useEffect, useRef, useState } from 'react';
import { Box, ButtonGroup, Button, Slider } from '@mui/material';
import { Satellite, Map as MapIcon, Terrain, Layers, HighQuality, Public } from '@mui/icons-material';
import { useLeafletDrawing, CourseElement, CourseHole, getElementColor } from '../contexts/LeafletDrawingContext';
import { layerNames } from '../utils/layers';
import { BaseLayerKey } from '../utils/layers';
import { debugLog } from '../utils/debug';

const DiagnosticMapComponent = () => {
  // Fonction pour changer de couche (doit être dans le composant)
  const updateLayer = async (layerType: BaseLayerKey) => {
    if (!mapInstanceRef.current) return;
    const L = await import('leaflet');
    // Supprimer la couche actuelle
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });
    const config = layerConfigs[layerType];
    if ('baseUrl' in config && 'labelsUrl' in config) {
      // Satellite + labels
      const baseLayer = L.tileLayer(config.baseUrl, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        maxNativeZoom: config.maxNativeZoom || config.maxZoom
      });
      const labelsLayer = L.tileLayer(config.labelsUrl, {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: config.maxZoom
      });
      baseLayer.addTo(mapInstanceRef.current);
      labelsLayer.addTo(mapInstanceRef.current);
    } else {
      // Couche simple
      const layerOptions: any = {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        maxNativeZoom: config.maxNativeZoom
      };
      if ('subdomains' in config && config.subdomains) {
        layerOptions.subdomains = config.subdomains;
      }
      const layer = L.tileLayer(config.url, layerOptions);
      layer.addTo(mapInstanceRef.current);
    }
  };
  // Flag pour indiquer que la carte est prête
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  // Coordonnées demandées par l'utilisateur
  // Ref pour signaler qu'une initialisation est en cours (éviter course condition StrictMode)
  const initializingRef = useRef(false);
  // const [currentLayer, setCurrentLayer] = useState<BaseLayerKey>('osm'); // inutilisé
  const [currentLayer, setCurrentLayer] = useState<BaseLayerKey>('osm');
  
  // Hook pour le contexte de dessin
  const { state: drawingState, dispatch: drawingDispatch } = useLeafletDrawing();

  // (configs et noms extraits dans utils/layers.ts)

  // Slider de rotation pour mandatory sélectionné
  const selectedMandatory = drawingState.selectedElement
    ? drawingState.holes.flatMap(h => h.elements).find(e => e.id === drawingState.selectedElement && e.type === 'mandatory')
    : null;
  const angleValue = selectedMandatory?.properties?.angle ?? 0;

  // Ref pour toujours disposer de l'état le plus récent dans les handlers Leaflet
  const drawingStateRef = useRef(drawingState);
  useEffect(() => { drawingStateRef.current = drawingState; }, [drawingState]);
  // Prévisualisation temporaire des formes en cours de dessin
  const tempShapeRef = useRef<any>(null);
  // Registre des layers par id d'élément
  const elementLayersRef = useRef<Record<string, any>>({});
  // Handles for geometry editing (vertex markers)
  const vertexMarkersRef = useRef<any[]>([]);
  const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);

  // ...existing code...
  // ...existing code...


  // Place geometry editing effect after all refs/hooks/variables
  useEffect(() => {
    vertexMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeLayer(m); } catch {} });
    vertexMarkersRef.current = [];
    if (!mapInstanceRef.current || !drawingState.selectedElement) return;
    const el = drawingState.holes.flatMap((h: CourseHole) => h.elements).find((e: CourseElement) => e.id === drawingState.selectedElement);
    if (!el || !el.path || el.path.length < 2) return;
    (async () => {
      const L = (window as any).L || await import('leaflet');
      if (!el.path) return;
      el.path.forEach((pt: { lat: number; lng: number }, idx: number) => {
        const isSelected = idx === selectedVertexIdx;
        // Icône SVG ronde
        const icon = L.divIcon({
          html: `<svg width='18' height='18'><circle cx='9' cy='9' r='7' fill='${isSelected ? '#ffcdd2' : '#fff'}' stroke='${isSelected ? '#d32f2f' : '#1976d2'}' stroke-width='3'/></svg>`,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        const marker = L.marker([pt.lat, pt.lng], {
          icon,
          draggable: isSelected
        }).addTo(mapInstanceRef.current);
        marker.on('mousedown', (ev: any) => {
          if (L.DomEvent) L.DomEvent.stopPropagation(ev);
        });
        marker.on('click', (ev: any) => {
          if (L.DomEvent) L.DomEvent.stopPropagation(ev);
          setSelectedVertexIdx(idx);
        });
        if (isSelected) {
          marker.on('dragend', () => {
            const ll = marker.getLatLng();
            const newPath = el.path!.map((p: { lat: number; lng: number }, i: number) => i === idx ? { lat: ll.lat, lng: ll.lng } : p);
            drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { path: newPath } } });
            setSelectedVertexIdx(idx); // Reste sélectionné après drag
          });
        }
        marker.on('contextmenu', (ev: any) => {
          ev.originalEvent?.preventDefault?.();
          const min = 3;
          if (el.path!.length > min) {
            const newPath = el.path!.filter((_: { lat: number; lng: number }, i: number) => i !== idx);
            drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { path: newPath } } });
            setSelectedVertexIdx(null);
          }
        });
        vertexMarkersRef.current.push(marker);
      });
    })();
    return () => {
      vertexMarkersRef.current.forEach(m => { try { mapInstanceRef.current?.removeLayer(m); } catch {} });
      vertexMarkersRef.current = [];
    };
  }, [drawingState.selectedElement, drawingState.holes, drawingDispatch, selectedVertexIdx]);

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
    const sync = async () => {
      if (!mapInstanceRef.current) return;
      const L = (window as any).L || await import('leaflet');
      // Ensemble des ids présents dans l'état
      const currentIds = new Set<string>();
      drawingState.holes.forEach(hole => {
        hole.elements.forEach(el => currentIds.add(el.id));
      });

      // Supprimer les layers orphelins (plus dans le state)
      Object.keys(elementLayersRef.current).forEach(id => {
        if (!currentIds.has(id)) {
          try { mapInstanceRef.current.removeLayer(elementLayersRef.current[id]); } catch {}
          delete elementLayersRef.current[id];
        }
      });

      // Créer ou mettre à jour les layers correspondants aux éléments du state
      drawingState.holes.forEach(hole => {
        hole.elements.forEach(el => {
          const color = el.properties?.color || getElementColor(el.type);
          const existing = elementLayersRef.current[el.id];
          if (!existing) {
            // Mandatory: marker downward arrow in red circle (always same SVG)
            if (el.type === 'mandatory') {
              if (!el.position) return;
              const angle = (el.properties as import('../types/course-elements').ElementProperties)?.angle ?? 0;
              const mandatoryIcon = L.divIcon({
                html: `<div style="transform:rotate(${angle}deg);width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><svg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'><circle cx='15' cy='15' r='15' fill='#E53935'/><polygon points='12,12 18,12 18,18 24,18 15,27 6,18 12,18' fill='#fff'/></svg></div>`,
                className: '', iconSize:[30,30], iconAnchor:[15,15]
              });
              const marker = L.marker([el.position.lat, el.position.lng], { icon: mandatoryIcon, draggable: true }).addTo(mapInstanceRef.current);
              marker.on('dragend', () => {
                const ll = marker.getLatLng();
                drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { position: { lat: ll.lat, lng: ll.lng } } } });
                // Forcer le refresh de l'icône après déplacement
                setTimeout(() => {
                  if (marker.setIcon) marker.setIcon(mandatoryIcon);
                }, 10);
              });
              marker.on('click', (ev: any) => { ev.originalEvent?.stopPropagation?.(); drawingDispatch({ type: 'SELECT_ELEMENT', payload: el.id }); });
              marker.on('contextmenu', (ev: any) => { ev.originalEvent?.preventDefault?.(); drawingDispatch({ type: 'DELETE_ELEMENT', payload: el.id }); });
              elementLayersRef.current[el.id] = marker;
            } else if (el.type === 'tee' || el.type === 'basket') {
              if (!el.position) return;
              const glyph = el.type === 'tee' ? 'T' : 'B';
              const icon = L.divIcon({
                html: `<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><svg viewBox='0 0 40 40' width='30' height='30'><circle cx='20' cy='20' r='18' fill='${color}' stroke='white' stroke-width='3' /><text x='20' y='24' font-size='16' font-family='Arial, sans-serif' font-weight='bold' fill='white' text-anchor='middle'>${glyph}</text></svg></div>`,
                className: '', iconSize:[30,30], iconAnchor:[15,15]
              });
              const marker = L.marker([el.position.lat, el.position.lng], { icon, draggable: true }).addTo(mapInstanceRef.current);
              marker.on('dragend', () => {
                const ll = marker.getLatLng();
                drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { position: { lat: ll.lat, lng: ll.lng } } } });
              });
              marker.on('click', (ev: any) => { ev.originalEvent?.stopPropagation?.(); drawingDispatch({ type: 'SELECT_ELEMENT', payload: el.id }); });
              marker.on('contextmenu', (ev: any) => { ev.originalEvent?.preventDefault?.(); drawingDispatch({ type: 'DELETE_ELEMENT', payload: el.id }); });
              elementLayersRef.current[el.id] = marker;
            } else if ((el.type === 'ob-zone' || el.type === 'hazard') && el.path && el.path.length >= 2) {
              const latlngs = el.path.map(p => [p.lat, p.lng]);
              let layer = L.polygon(latlngs, { color, weight: el.properties?.strokeWidth || 2, fillOpacity: el.properties?.fillOpacity ?? 0.3, fillColor: color }).addTo(mapInstanceRef.current);
              layer.on('click', () => drawingDispatch({ type: 'SELECT_ELEMENT', payload: el.id }));
              elementLayersRef.current[el.id] = layer;
            }
          } else {
            // Mettre à jour géométrie / style
            if (el.type === 'mandatory' && el.position && existing.setLatLng && existing.setIcon) {
              existing.setLatLng([el.position.lat, el.position.lng]);
              const angle = el.properties?.angle ?? 0;
              const mandatoryIcon = L.divIcon({
                html: `<div style="transform:rotate(${angle}deg);width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><svg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'><circle cx='15' cy='15' r='15' fill='#E53935'/><polygon points='12,12 18,12 18,18 24,18 15,27 6,18 12,18' fill='#fff'/></svg></div>`,
                className: '', iconSize:[30,30], iconAnchor:[15,15]
              });
              try { existing.setIcon(mandatoryIcon); } catch {}
            } else if ((el.type === 'tee' || el.type === 'basket') && el.position) {
              if (existing.setLatLng) { existing.setLatLng([el.position.lat, el.position.lng]); }
              if (existing.setIcon) {
                const glyph = el.type === 'tee' ? 'T' : 'B';
                try {
                  const icon = L.divIcon({
                    html: `<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><svg viewBox='0 0 40 40' width='30' height='30'><circle cx='20' cy='20' r='18' fill='${color}' stroke='white' stroke-width='3' /><text x='20' y='24' font-size='16' font-family='Arial, sans-serif' font-weight='bold' fill='white' text-anchor='middle'>${glyph}</text></svg></div>`,
                    className:'', iconSize:[30,30], iconAnchor:[15,15]
                  });
                  existing.setIcon(icon);
                } catch {}
              }
            } else if (el.path && existing.setLatLngs) {
              const latlngs = el.path.map(p => [p.lat, p.lng]);
              try { existing.setLatLngs(latlngs); } catch {}
              if (existing.setStyle) {
                const style: any = { color };
                style.fillColor = color;
                try { existing.setStyle(style); } catch {}
              }
            }
          }
        });
      });
      // Forcer l'ajout des layers à la carte (cas reload)
      Object.values(elementLayersRef.current).forEach(layer => {
        if (layer && layer.addTo) {
          try { layer.addTo(mapInstanceRef.current); } catch {}
        }
      });
    };
    sync();
  }, [drawingState.holes, drawingDispatch]);

  useEffect(() => {
  const initMap = async () => {
      // Initialisation de la carte
      try {
        if (!mapRef.current) return;
        if (mapInstanceRef.current || initializingRef.current) return;
        initializingRef.current = true;
        if ((mapRef.current as any)._leaflet_id) {
          try { delete (mapRef.current as any)._leaflet_id; } catch { /* noop */ }
        }
        const L = await import('leaflet');
        const map = L.map(mapRef.current, {
          center: [43.56837527315503, 1.5186569801032932],
          zoom: 13,
          zoomControl: true,
          doubleClickZoom: true,
          scrollWheelZoom: true,
          maxBoundsViscosity: 0.8,
          preferCanvas: false
        });
        mapInstanceRef.current = map;
        await updateLayer(currentLayer);
        drawingDispatch({ type: 'SET_MAP', payload: map });
        debugLog('🎉 Carte initialisée (unique)');
        setMapReady(true);
        // Handlers pour le dessin (restauration)
        map.on('click', async (e: any) => {
          const ds = drawingStateRef.current;
          const { lat, lng } = e.latlng;
          const currentHole = ds.currentHole;
          const holeNumber = currentHole;
          const uuid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
          if (ds.drawingMode === 'tee' || ds.drawingMode === 'basket') {
            drawingDispatch({
              type: 'ADD_ELEMENT',
              payload: {
                id: uuid(),
                type: ds.drawingMode,
                holeNumber,
                position: { lat, lng },
                properties: { color: getElementColor(ds.drawingMode) }
              }
            });
          } else if (ds.drawingMode === 'mandatory') {
            drawingDispatch({
              type: 'ADD_ELEMENT',
              payload: {
                id: uuid(),
                type: 'mandatory',
                holeNumber,
                position: { lat, lng },
                properties: { color: getElementColor('mandatory'), angle: 0 }
              }
            });
          } else if (ds.drawingMode === 'ob-zone' || ds.drawingMode === 'hazard') {
            if (!ds.isDrawing) {
              drawingDispatch({ type: 'START_DRAWING', payload: { lat, lng } });
            } else {
              drawingDispatch({ type: 'CONTINUE_DRAWING', payload: { lat, lng } });
              // Si double-clic ou assez de points, terminer et ajouter l'élément
              if (ds.tempPath.length >= (ds.drawingMode === 'ob-zone' ? 3 : 2)) {
                drawingDispatch({
                  type: 'ADD_ELEMENT',
                  payload: {
                    id: uuid(),
                    type: ds.drawingMode,
                    holeNumber,
                    path: [...ds.tempPath, { lat, lng }],
                    properties: { color: getElementColor(ds.drawingMode) }
                  }
                });
                drawingDispatch({ type: 'FINISH_DRAWING' });
              }
            }
          }
        });
        // Synchroniser tous les éléments persistés dès l'init
        setTimeout(() => {
          // Ajout des layers d'éléments
          Object.values(elementLayersRef.current).forEach(layer => {
            if (layer && layer.addTo) {
              try { layer.addTo(mapInstanceRef.current); } catch {}
            }
          });
          // Ajuster la vue pour englober tous les éléments du parcours
          const allPoints: [number, number][] = [];
          drawingState.holes.forEach(hole => {
            hole.elements.forEach(el => {
              if (el.position) {
                allPoints.push([el.position.lat, el.position.lng]);
              }
              if (el.path) {
                el.path.forEach(pt => allPoints.push([pt.lat, pt.lng]));
              }
            });
          });
          if (allPoints.length > 0 && mapInstanceRef.current && allPoints.length > 1) {
            mapInstanceRef.current.fitBounds(allPoints);
          }
        }, 300);
      } catch (err) {
        debugLog('❌ Erreur init carte:', err);
      } finally {
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
    useEffect(() => {
      const sync = async () => {
        if (!mapInstanceRef.current || !mapReady) return;
        const L = (window as any).L || await import('leaflet');
        // Ensemble des ids présents dans l'état
        const currentIds = new Set<string>();
        drawingState.holes.forEach(hole => {
          hole.elements.forEach(el => currentIds.add(el.id));
        });

        // Supprimer les layers orphelins (plus dans le state)
        Object.keys(elementLayersRef.current).forEach(id => {
          if (!currentIds.has(id)) {
            try { mapInstanceRef.current.removeLayer(elementLayersRef.current[id]); } catch {}
            delete elementLayersRef.current[id];
          }
        });

        // Créer ou mettre à jour les layers correspondants aux éléments du state
        drawingState.holes.forEach(hole => {
          hole.elements.forEach(el => {
            const color = el.properties?.color || getElementColor(el.type);
            const existing = elementLayersRef.current[el.id];
            if (!existing) {
              // Mandatory: marker downward arrow in red circle (always same SVG)
              if (el.type === 'mandatory') {
                if (!el.position) return;
                const angle = (el.properties as import('../types/course-elements').ElementProperties)?.angle ?? 0;
                const mandatoryIcon = L.divIcon({
                  html: `<div style="transform:rotate(${angle}deg);width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><svg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'><circle cx='15' cy='15' r='15' fill='#E53935'/><polygon points='12,12 18,12 18,18 24,18 15,27 6,18 12,18' fill='#fff'/></svg></div>`,
                  className: '', iconSize:[30,30], iconAnchor:[15,15]
                });
                const marker = L.marker([el.position.lat, el.position.lng], { icon: mandatoryIcon, draggable: true }).addTo(mapInstanceRef.current);
                marker.on('dragend', () => {
                  const ll = marker.getLatLng();
                  drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { position: { lat: ll.lat, lng: ll.lng } } } });
                  // Forcer le refresh de l'icône après déplacement
                  setTimeout(() => {
                    if (marker.setIcon) marker.setIcon(mandatoryIcon);
                  }, 10);
                });
                marker.on('click', (ev: any) => { ev.originalEvent?.stopPropagation?.(); drawingDispatch({ type: 'SELECT_ELEMENT', payload: el.id }); });
                marker.on('contextmenu', (ev: any) => { ev.originalEvent?.preventDefault?.(); drawingDispatch({ type: 'DELETE_ELEMENT', payload: el.id }); });
                elementLayersRef.current[el.id] = marker;
              } else if (el.type === 'tee' || el.type === 'basket') {
                if (!el.position) return;
                const glyph = el.type === 'tee' ? 'T' : 'B';
                const icon = L.divIcon({
                  html: `<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><svg viewBox='0 0 40 40' width='30' height='30'><circle cx='20' cy='20' r='18' fill='${color}' stroke='white' stroke-width='3' /><text x='20' y='24' font-size='16' font-family='Arial, sans-serif' font-weight='bold' fill='white' text-anchor='middle'>${glyph}</text></svg></div>`,
                  className: '', iconSize:[30,30], iconAnchor:[15,15]
                });
                const marker = L.marker([el.position.lat, el.position.lng], { icon, draggable: true }).addTo(mapInstanceRef.current);
                marker.on('dragend', () => {
                  const ll = marker.getLatLng();
                  drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { position: { lat: ll.lat, lng: ll.lng } } } });
                });
                marker.on('click', (ev: any) => { ev.originalEvent?.stopPropagation?.(); drawingDispatch({ type: 'SELECT_ELEMENT', payload: el.id }); });
                marker.on('contextmenu', (ev: any) => { ev.originalEvent?.preventDefault?.(); drawingDispatch({ type: 'DELETE_ELEMENT', payload: el.id }); });
                elementLayersRef.current[el.id] = marker;
              } else if ((el.type === 'ob-zone' || el.type === 'hazard') && el.path && el.path.length >= 2) {
                const latlngs = el.path.map(p => [p.lat, p.lng]);
                let layer = L.polygon(latlngs, { color, weight: el.properties?.strokeWidth || 2, fillOpacity: el.properties?.fillOpacity ?? 0.3, fillColor: color }).addTo(mapInstanceRef.current);
                layer.on('click', () => drawingDispatch({ type: 'SELECT_ELEMENT', payload: el.id }));
                elementLayersRef.current[el.id] = layer;
              }
            } else {
              // Mettre à jour géométrie / style
              if (el.type === 'mandatory' && el.position && existing.setLatLng && existing.setIcon) {
                existing.setLatLng([el.position.lat, el.position.lng]);
                const angle = el.properties?.angle ?? 0;
                const mandatoryIcon = L.divIcon({
                  html: `<div style="transform:rotate(${angle}deg);width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><svg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'><circle cx='15' cy='15' r='15' fill='#E53935'/><polygon points='12,12 18,12 18,18 24,18 15,27 6,18 12,18' fill='#fff'/></svg></div>`,
                  className: '', iconSize:[30,30], iconAnchor:[15,15]
                });
                try { existing.setIcon(mandatoryIcon); } catch {}
              } else if ((el.type === 'tee' || el.type === 'basket') && el.position) {
                if (existing.setLatLng) { existing.setLatLng([el.position.lat, el.position.lng]); }
                if (existing.setIcon) {
                  const glyph = el.type === 'tee' ? 'T' : 'B';
                  try {
                    const icon = L.divIcon({
                      html: `<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><svg viewBox='0 0 40 40' width='30' height='30'><circle cx='20' cy='20' r='18' fill='${color}' stroke='white' stroke-width='3' /><text x='20' y='24' font-size='16' font-family='Arial, sans-serif' font-weight='bold' fill='white' text-anchor='middle'>${glyph}</text></svg></div>`,
                      className:'', iconSize:[30,30], iconAnchor:[15,15]
                    });
                    existing.setIcon(icon);
                  } catch {}
                }
              } else if (el.path && existing.setLatLngs) {
                const latlngs = el.path.map(p => [p.lat, p.lng]);
                try { existing.setLatLngs(latlngs); } catch {}
                if (existing.setStyle) {
                  const style: any = { color };
                  style.fillColor = color;
                  try { existing.setStyle(style); } catch {}
                }
              }
            }
          });
        });
        // Forcer l'ajout des layers à la carte (cas reload)
        Object.values(elementLayersRef.current).forEach(layer => {
          if (layer && layer.addTo) {
            try { layer.addTo(mapInstanceRef.current); } catch {}
          }
        });
      };
      sync();
    }, [drawingState.holes, drawingDispatch, mapReady]);
  // ...autres hooks et logique...

  // Créer un élément de chemin (zone, ligne)
  // Fonction createPathElement inutilisée supprimée
  // ...autres fonctions utilitaires...

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
            onClick={async () => {
              setCurrentLayer('osm');
              await updateLayer('osm');
            }}
            variant={currentLayer === 'osm' ? 'contained' : 'outlined'}
            startIcon={<MapIcon />}
          >
            Carte OSM
          </Button>
          <Button
            onClick={async () => {
              setCurrentLayer('satellite');
              await updateLayer('satellite');
            }}
            variant={currentLayer === 'satellite' ? 'contained' : 'outlined'}
            startIcon={<Satellite />}
          >
            Satellite Esri
          </Button>
          <Button
            onClick={async () => {
              setCurrentLayer('satellite-hd');
              await updateLayer('satellite-hd');
            }}
            variant={currentLayer === 'satellite-hd' ? 'contained' : 'outlined'}
            startIcon={<HighQuality />}
          >
            Sat HD Google
          </Button>
          <Button
            onClick={async () => {
              setCurrentLayer('satellite-labels');
              await updateLayer('satellite-labels');
            }}
            variant={currentLayer === 'satellite-labels' ? 'contained' : 'outlined'}
            startIcon={<Layers />}
          >
            Sat + Labels
          </Button>
          <Button
            onClick={async () => {
              setCurrentLayer('satellite-hybrid');
              await updateLayer('satellite-hybrid');
            }}
            variant={currentLayer === 'satellite-hybrid' ? 'contained' : 'outlined'}
            startIcon={<Public />}
          >
            Google Hybrid
          </Button>
          <Button
            onClick={async () => {
              setCurrentLayer('topo');
              await updateLayer('topo');
            }}
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
    {/* Slider de rotation si mandatory sélectionné */}
    {selectedMandatory && (
      <Box sx={{ position:'absolute', top:80, left:10, zIndex:1200, background:'#fff', p:2, borderRadius:2, boxShadow:2, minWidth:220 }}>
        <strong>Rotation de la flèche</strong>
        <Slider
          value={angleValue}
          min={0}
          max={359}
          step={1}
          onChange={(_, v) => {
            drawingDispatch({ type: 'UPDATE_ELEMENT', payload: { id: selectedMandatory.id, updates: { properties: { ...selectedMandatory.properties, angle: Number(v) } } } });
          }}
          valueLabelDisplay="auto"
        />
      </Box>
    )}
    </Box>
  );
};

export default DiagnosticMapComponent;
