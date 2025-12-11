
import { Box, Button, Divider, Typography, Chip, IconButton, Stack, Select, MenuItem, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, InputAdornment, Snackbar, Slider, Alert } from '@mui/material';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import React from 'react';
import { Add, Remove, Undo, Redo, Download, Save, Upload, AddLocation } from '@mui/icons-material';
import { 
  NearMe, 
  TrackChanges, 
  Block, 
  Warning, 
  TrendingFlat,
  TouchApp,
  Straighten
} from '@mui/icons-material';
import { useLeafletDrawing, CourseElement, serializeState } from '../contexts/LeafletDrawingContext';
import { useMapContext } from '../contexts/MapContext';
import { lineString, bezierSpline, length } from '@turf/turf';
import generateKMLContent from '../utils/kml';


const DrawingToolsSidebar = () => {
  const { state, dispatch, saveCourse } = useLeafletDrawing();
  const { fieldMode, userLocation } = useMapContext();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteHole, setPendingDeleteHole] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsDirty(true);
  }, [state.past]);

  useEffect(() => {
    setIsDirty(false);
  }, [state.name, state.holes.length]);

  const handleSave = useCallback(() => {
    saveCourse();
    setIsDirty(false);
    setSnackbarOpen(true);
  }, [saveCourse]);

  const keyHandler = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') {
      dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
      e.preventDefault();
    } else if (mod && e.key.toLowerCase() === 'y') {
      dispatch({ type: 'REDO' });
      e.preventDefault();
    } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
    }
  }, [dispatch, handleSave]);

  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);

  type DrawingTool = {
    type: CourseElement['type'] | 'measure' | null;
    label: string;
    icon: React.ReactElement;
  };

  const handleToolSelect = (tool: DrawingTool['type']) => {
    dispatch({ type: 'SET_DRAWING_MODE', payload: tool });
  };

  const tools: DrawingTool[] = [
    { type: null, label: 'Sélectionner', icon: <TouchApp /> },
    { type: 'measure', label: 'Mesurer', icon: <Straighten /> },
    { type: 'tee', label: 'Tee', icon: <NearMe /> },
    { type: 'basket', label: 'Panier', icon: <TrackChanges /> },
    { type: 'ob-zone', label: 'Zone OB', icon: <Block /> },
    { type: 'hazard', label: 'Danger', icon: <Warning /> },
    { type: 'mandatory', label: 'Mandatory', icon: <TrendingFlat /> },
  ];

  const cancelDrawing = () => dispatch({ type: 'CANCEL_DRAWING' });

  const holesSorted = [...state.holes].sort((a,b) => a.number - b.number);
  const currentHoleData = state.holes.find(h => h.number === state.currentHole);

  const addHole = () => {
    const newNumber = holesSorted.reduce((max, h) => Math.max(max, h.number), 0) + 1;
    dispatch({ type: 'ADD_HOLE', payload: newNumber });
    dispatch({ type: 'SET_CURRENT_HOLE', payload: newNumber });
  };

  const removeCurrentHole = () => {
    if (holesSorted.length <= 1) return;
    const hole = currentHoleData;
    if (hole && hole.elements.length > 0) {
      setPendingDeleteHole(hole.number);
      setConfirmOpen(true);
    } else {
      dispatch({ type: 'DELETE_HOLE', payload: state.currentHole });
    }
  };

  const confirmDelete = () => {
    if (pendingDeleteHole !== null) {
      dispatch({ type: 'DELETE_HOLE', payload: pendingDeleteHole });
    }
    setConfirmOpen(false);
    setPendingDeleteHole(null);
  };

  const exportJson = () => {
    try {
      const data = serializeState(state);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = `${state.name.replace(/\s+/g, '_').toLowerCase()}_course.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
        console.error("Erreur lors de l'exportation JSON", e);
    }
  };
  
  const exportKml = () => {
    try {
        const kmlContent = generateKMLContent(state.name, state.holes);
        const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.name.replace(/\s+/g, '_').toLowerCase()}_course.kml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Erreur lors de l'exportation KML", e);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError('');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          // Import JSON
          const data = JSON.parse(content);
          
          // Valider que c'est un fichier de parcours valide
          if (data.holes && Array.isArray(data.holes)) {
            dispatch({ type: 'IMPORT_COURSE', payload: data });
            setSnackbarOpen(true);
          } else {
            setImportError('Fichier JSON invalide : format de parcours non reconnu');
          }
        } else if (file.name.endsWith('.kml')) {
          // Import KML
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          
          // Parser le KML et regrouper les éléments par trou
          const placemarks = xmlDoc.getElementsByTagName('Placemark');
          const elementsByHole: Record<number, any[]> = {};
          
          for (let i = 0; i < placemarks.length; i++) {
            const placemark = placemarks[i];
            const name = placemark.getElementsByTagName('name')[0]?.textContent || '';
            const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent;
            
            if (coordinates && name) {
              const coords = coordinates.trim().split(/\s+/).map(coord => {
                const [lng, lat] = coord.split(',').map(Number);
                return { lat, lng };
              })[0]; // Prendre le premier point seulement pour les Points
              
              // Extraire le numéro de trou et le type depuis le nom (ex: "Tee 1", "Basket 3")
              const match = name.match(/(Tee|Basket|Panier)\s+(\d+)/i);
              if (match) {
                const type = match[1].toLowerCase() === 'tee' ? 'tee' : 'basket';
                const holeNumber = parseInt(match[2]);
                
                if (!elementsByHole[holeNumber]) {
                  elementsByHole[holeNumber] = [];
                }
                
                elementsByHole[holeNumber].push({
                  id: `imported_${holeNumber}_${type}`,
                  type: type,
                  position: coords,
                  holeNumber: holeNumber,
                  properties: {}
                });
              }
            }
          }
          
          // Créer les trous à partir des éléments regroupés
          const newHoles = Object.keys(elementsByHole)
            .map(Number)
            .sort((a, b) => a - b)
            .map(holeNumber => ({
              number: holeNumber,
              par: 3,
              elements: elementsByHole[holeNumber]
            }));
          
          if (newHoles.length > 0) {
            dispatch({ type: 'IMPORT_COURSE', payload: { name: state.name, holes: newHoles } });
            setSnackbarOpen(true);
          } else {
            setImportError('Aucune donnée géographique trouvée dans le fichier KML');
          }
        } else {
          setImportError('Format de fichier non supporté. Utilisez .json ou .kml');
        }
      } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        setImportError('Erreur lors de la lecture du fichier : ' + (error as Error).message);
      }
    };

    reader.readAsText(file);
    // Reset input pour permettre de réimporter le même fichier
    event.target.value = '';
  };

  const { holeElementSummary, flightPathDistance } = useMemo(() => {
    if (!currentHoleData) return { holeElementSummary: null, flightPathDistance: null };

    const summary = currentHoleData.elements
      .filter(el => el.type !== 'flight-path') // Exclude flight path from summary
      .reduce((acc, el) => {
        acc[el.type] = (acc[el.type] || 0) + 1;
        return acc;
      }, {} as Record<CourseElement['type'], number>);

    const flightPath = currentHoleData.elements.find(el => el.type === 'flight-path' && el.path && el.path.length >= 2);
    let distance = null;
    if (flightPath) {
        const line = lineString(flightPath.path.map(p => [p.lng, p.lat]));
        const curved = bezierSpline(line);
        distance = length(curved, { units: 'meters' });
    }

    return { holeElementSummary: summary, flightPathDistance: distance };
  }, [currentHoleData]);

  const elementLabels: Record<CourseElement['type'], string> = {
    tee: 'Tees',
    basket: 'Paniers',
    'ob-zone': 'Zones OB',
    hazard: 'Dangers',
    mandatory: 'Mandatories',
    'flight-path': 'Trajectoire'
  };
  
  return (
    <>
    <Box sx={{ width: '100%', p: 2, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
        {/* Course Name */}
        <TextField
            id="course-name-input"
            name="course-name"
            label="Nom du parcours"
            value={state.name}
            onChange={(e) => dispatch({ type: 'UPDATE_COURSE_NAME', payload: e.target.value })}
            variant="standard"
            fullWidth
            sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: '1.25rem', fontWeight: 'bold' } }}
        />
        <Divider sx={{ my: 1 }} />

      {/* Section : Trous du Parcours */}
      <Typography variant="subtitle2" sx={{ fontWeight:'bold', mb:1 }}>Trous du Parcours</Typography>
      <Stack direction="row" spacing={1} sx={{ mb:1 }}>
        <Button size="small" startIcon={<Add />} variant="outlined" onClick={addHole}>Ajouter un trou</Button>
        {holesSorted.length > 1 && (
          <Tooltip title="Supprimer ce trou">
            <span>
              <IconButton size="small" color="error" onClick={removeCurrentHole} disabled={holesSorted.length <= 1}>
                <Remove fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
      <Select
        id="hole-selector"
        name="hole-selector"
        size="small"
        value={state.currentHole}
        onChange={(e) => dispatch({ type: 'SET_CURRENT_HOLE', payload: e.target.value as number })}
        fullWidth
        sx={{ mb:1 }}
      >
        {holesSorted.map(h => (
          <MenuItem key={h.number} value={h.number}>{`Trou ${h.number} - Par ${h.par}`}</MenuItem>
        ))}
      </Select>
      {currentHoleData && (
        <TextField
            id={`hole-${currentHoleData.number}-par-input`}
            name={`hole-${currentHoleData.number}-par`}
            size="small"
            label="Par"
            type="number"
            value={currentHoleData.par}
            onChange={(e) => dispatch({ type: 'UPDATE_HOLE', payload: { number: currentHoleData.number, updates: { par: parseInt(e.target.value || '3', 10) } } })}
            sx={{ width:120, mb:2 }}
            inputProps={{ min:1, max:10 }}
            InputProps={{ endAdornment: <InputAdornment position="end">par</InputAdornment> }}
        />
      )}

      {/* Section : Outils */}
      <Typography variant="subtitle2" sx={{ fontWeight:'bold', mt:1, mb:1 }}>Outils</Typography>
      <Box sx={{ display:'flex', flexDirection:'column', gap:0.5 }}>
        {tools.map(tool => (
          <Button
            key={tool.type || 'select'}
            onClick={() => handleToolSelect(tool.type)}
            variant={state.drawingMode === tool.type ? 'contained' : 'outlined'}
            startIcon={tool.icon}
            size="small"
            sx={{ justifyContent:'flex-start', fontSize:'0.75rem' }}
          >{tool.label}</Button>
        ))}
        
        {/* Bouton "Placer ici" en mode terrain */}
        {fieldMode && userLocation && state.drawingMode && (state.drawingMode === 'basket' || state.drawingMode === 'tee' || state.drawingMode === 'mandatory') && (
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddLocation />}
            onClick={() => {
              dispatch({ 
                type: 'ADD_ELEMENT', 
                payload: { 
                  type: state.drawingMode!, 
                  position: { lat: userLocation.lat, lng: userLocation.lng } 
                } 
              });
            }}
            sx={{ mt: 1, fontWeight: 'bold' }}
          >
            📍 Placer ici
          </Button>
        )}
        
        <Stack direction="row" spacing={1} sx={{ mt:0.5 }}>
          <Tooltip title="Annuler (Ctrl+Z)"><span><IconButton size="small" onClick={() => dispatch({ type:'UNDO' })} disabled={state.past.length===0}><Undo fontSize="inherit" /></IconButton></span></Tooltip>
          <Tooltip title="Rétablir (Ctrl+Y)"><span><IconButton size="small" onClick={() => dispatch({ type:'REDO' })} disabled={state.future.length===0}><Redo fontSize="inherit" /></IconButton></span></Tooltip>
        </Stack>
      </Box>

      {/* Drawing mode status */}
      {(state.drawingMode || state.isDrawing) && (
        <Box sx={{ mt:1 }}>
          {state.drawingMode && <Chip size="small" color="primary" label={`Mode: ${tools.find(t=>t.type===state.drawingMode)?.label || '—'}`} sx={{ mr:1 }} />}
          {state.isDrawing && <Chip size="small" color="warning" label="Dessin..." />}
        </Box>
      )}

      {state.isDrawing && (
        <Button fullWidth size="small" color="error" variant="outlined" sx={{ mt:1 }} onClick={cancelDrawing}>Annuler le dessin</Button>
      )}

      {/* Selected element editor */}
      {state.selectedElement && (() => {
        const hole = state.holes.find(h => h.elements.some(e => e.id === state.selectedElement));
        const el = hole?.elements.find(e => e.id === state.selectedElement);
        if (!el) return null;
        return (
          <Box sx={{ mt: 2, p:1, border: '1px solid #ddd', borderRadius:1 }}>
            <Typography variant="subtitle2" gutterBottom>✏️ Éditer l'élément</Typography>
            <TextField 
              id={`element-${el.id}-name-input`}
              name={`element-${el.id}-name`}
              size="small" 
              fullWidth 
              label="Nom" 
              value={el.properties?.name || ''}
              onChange={(e) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { properties: { ...el.properties, name: e.target.value } } } })}
              sx={{ mb: 1 }}
            />
            <TextField 
              id={`element-${el.id}-color-input`}
              name={`element-${el.id}-color`}
              size="small" 
              fullWidth 
              label="Couleur" 
              type="color" 
              value={el.properties?.color || '#000000'}
              onChange={(e) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { properties: { ...el.properties, color: e.target.value } } } })}
              sx={{ mb: 1 }}
            />
            {(el.type === 'mandatory' || el.type === 'tee') && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Rotation</Typography>
                  <Slider
                    value={el.properties?.angle || 0}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(_, value) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { properties: { ...el.properties, angle: value as number } } } })}
                    valueLabelDisplay="auto"
                  />
                </Box>
            )}
            <Button size="small" color="error" onClick={() => dispatch({ type: 'DELETE_ELEMENT', payload: el.id })}>Supprimer</Button>
          </Box>
        );
      })()}

      {/* Hole Stats */}
      {currentHoleData && (
        <Box sx={{ mt:2, p:1.5, background:'#f9f9f9', borderRadius:1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight:'bold', mb:1 }}>Statistiques du Trou</Typography>
          <Box sx={{ fontSize:'0.8rem', display:'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
            <div><strong>Distance (vol d'oiseau):</strong></div><div>{currentHoleData.distance !== undefined ? `${currentHoleData.distance} m` : '—'}</div>
            {flightPathDistance && (
                <>
                    <div><strong>Distance (trajectoire):</strong></div>
                    <div>{`${flightPathDistance.toFixed(0)} m`}</div>
                </>
            )}
            {holeElementSummary && Object.entries(holeElementSummary).map(([type, count]) => (
                <React.Fragment key={type}>
                    <div><strong>{elementLabels[type as CourseElement['type']] || type}:</strong></div>
                    <div>{count}</div>
                </React.Fragment>
            ))}
          </Box>
        </Box>
      )}

      {/* Contextual Instructions */}
      {state.drawingMode && (
        <Box sx={{ mt:1, p:1, background:'#f5f5f5', borderRadius:1 }}>
          <Typography variant="caption" color="text.secondary">
            {state.drawingMode === 'tee' && '🎯 Tee: deux clics pour définir le début et la fin.'}
            {state.drawingMode === 'basket' && '🥏 Panier: un clic pour placer.'}
            {state.drawingMode === 'mandatory' && '⬆️ Mandatory: cliquez pour poser une flèche.'}
            {state.drawingMode === 'ob-zone' && '❌ Zone OB: clics successifs, double‑clic pour fermer.'}
            {state.drawingMode === 'hazard' && '⚠️ Danger: clics successifs, double‑clic pour fermer.'}
            {state.drawingMode === 'measure' && '📏 Mesure: clics, double‑clic pour finir.'}
          </Typography>
        </Box>
      )}
        
      {/* Actions */}
      <Divider sx={{ my:2 }} />
      <Typography variant="subtitle2" sx={{ fontWeight:'bold', mb:1 }}>Actions</Typography>
      <Stack spacing={1}>
        <Button 
          size="small" 
          variant="contained" 
          startIcon={<Save />} 
          onClick={handleSave} 
          color={isDirty ? 'warning' : 'success'}
        >
          {isDirty ? 'Sauvegarder les changements' : 'Sauvegardé'}
        </Button>
        <Divider sx={{ my: 1 }}>
          <Typography variant="caption" color="text.secondary">Exporter</Typography>
        </Divider>
        <Button size="small" variant="outlined" startIcon={<Download />} onClick={exportJson}>Exporter JSON</Button>
        <Button size="small" variant="outlined" startIcon={<Download />} onClick={exportKml}>Exporter KML</Button>
        <Divider sx={{ my: 1 }}>
          <Typography variant="caption" color="text.secondary">Importer</Typography>
        </Divider>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.kml"
          onChange={handleFileImport}
          style={{ display: 'none' }}
        />
        <Button size="small" variant="outlined" startIcon={<Upload />} onClick={handleImportClick}>
          Importer KML/JSON
        </Button>
        {importError && (
          <Alert severity="error" onClose={() => setImportError('')} sx={{ fontSize: '0.75rem' }}>
            {importError}
          </Alert>
        )}
      </Stack>

    </Box>

    <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message="Parcours sauvegardé avec succès !"
      />

    <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Supprimer le trou {pendingDeleteHole}</DialogTitle>
      <DialogContent><DialogContentText>Ce trou contient des éléments. Confirmer la suppression ?</DialogContentText></DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmOpen(false)}>Annuler</Button>
        <Button onClick={confirmDelete} color="error" variant="contained">Supprimer</Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default DrawingToolsSidebar;
