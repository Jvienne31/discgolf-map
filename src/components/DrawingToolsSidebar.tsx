
import { Box, Button, Divider, Typography, Chip, IconButton, Stack, Select, MenuItem, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, InputAdornment, Snackbar } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { Add, Remove, Undo, Redo, Download, Save } from '@mui/icons-material';
import { 
  NearMe, 
  SportsMartialArts, 
  Block, 
  Warning, 
  TrendingFlat,
  TouchApp,
  Straighten
} from '@mui/icons-material';
import { useLeafletDrawing, CourseElement, serializeState } from '../contexts/LeafletDrawingContext';

const DrawingToolsSidebar = () => {
  const { state, dispatch, saveCourse } = useLeafletDrawing();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteHole, setPendingDeleteHole] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Track unsaved changes. Any action that creates a history entry makes the state dirty.
  useEffect(() => {
    setIsDirty(true);
  }, [state.past]);

  // Reset dirty state after loading a course, as it's clean initially.
  useEffect(() => {
    setIsDirty(false);
  }, [state.name, state.holes.length]); // A reasonable proxy for new course load

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

  const handleToolSelect = (tool: CourseElement['type'] | 'measure' | null) => {
    dispatch({ type: 'SET_DRAWING_MODE', payload: tool });
  };

  const tools = [
    { type: null, label: 'Sélectionner', icon: <TouchApp /> },
    { type: 'measure' as any, label: 'Mesurer', icon: <Straighten /> },
    { type: 'tee' as const, label: 'Tee', icon: <NearMe /> },
    { type: 'basket' as const, label: 'Panier', icon: <SportsMartialArts /> },
    { type: 'ob-zone' as const, label: 'Zone OB', icon: <Block /> },
    { type: 'hazard' as const, label: 'Danger', icon: <Warning /> },
    { type: 'mandatory' as const, label: 'Mandatory', icon: <TrendingFlat /> },
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
        console.error("Erreur lors de l'exportation", e);
    }
  };
  
  return (
    <>
    <Box sx={{ width: '100%', p: 2 }}>
        {/* Course Name */}
        <TextField
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
            <TextField size="small" fullWidth label="Nom" value={el.properties?.name || ''}
              onChange={(e) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { properties: { ...el.properties, name: e.target.value } } } })}
              sx={{ mb: 1 }}
            />
            <TextField size="small" fullWidth label="Couleur" type="color" value={el.properties?.color || '#000000'}
              onChange={(e) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { properties: { ...el.properties, color: e.target.value } } } })}
              sx={{ mb: 1 }}
            />
            <Button size="small" color="error" onClick={() => dispatch({ type: 'DELETE_ELEMENT', payload: el.id })}>Supprimer</Button>
          </Box>
        );
      })()}

      {/* Hole Stats */}
      {currentHoleData && (
        <Box sx={{ mt:2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight:'bold', mb:1 }}>Statistiques du trou</Typography>
          <Box sx={{ fontSize:'0.75rem' }}>
            <div>Distance: {currentHoleData.distance !== undefined ? `${currentHoleData.distance} m` : '—'}</div>
          </Box>
        </Box>
      )}

      {/* Contextual Instructions */}
      {state.drawingMode && (
        <Box sx={{ mt:1, p:1, background:'#f5f5f5', borderRadius:1 }}>
          <Typography variant="caption" color="text.secondary">
            {state.drawingMode === 'tee' && '🎯 Tee: un clic pour placer.'}
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
        <Button size="small" variant="outlined" startIcon={<Download />} onClick={exportJson}>Exporter JSON</Button>
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
