import { Box, Button, Divider, Typography, Chip, IconButton, Stack, Select, MenuItem, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, InputAdornment } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { Add, Remove, Save, Download, Undo, Redo, Image as ImageIcon } from '@mui/icons-material';
import { 
  NearMe, 
  SportsMartialArts, 
  Block, 
  Warning, 
  TrendingFlat,
  Clear,
  TouchApp,
  Straighten
} from '@mui/icons-material';
import { useLeafletDrawing, CourseElement, serializeState } from '../contexts/LeafletDrawingContext';

const DrawingToolsSidebar = () => {
  const { state, dispatch } = useLeafletDrawing();

  // Raccourcis clavier Undo/Redo
  const keyHandler = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        dispatch({ type: 'REDO' });
      } else {
        dispatch({ type: 'UNDO' });
      }
      e.preventDefault();
    } else if (mod && e.key.toLowerCase() === 'y') {
      dispatch({ type: 'REDO' });
      e.preventDefault();
    }
  }, [dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteHole, setPendingDeleteHole] = useState<number | null>(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importText, setImportText] = useState('');

  const handleToolSelect = (tool: CourseElement['type'] | 'measure' | null) => {
    console.log('🛠️ Outil sélectionné:', tool);
    dispatch({ type: 'SET_DRAWING_MODE', payload: tool });
    console.log('📊 Nouvel état après dispatch:', { tool });
  };

  const tools = [
    {
      type: null as null,
      label: 'Sélectionner',
      icon: <TouchApp />,
      description: 'Mode sélection'
    },
    {
      type: 'measure' as any,
      label: 'Mesurer',
      icon: <Straighten />,
      description: 'Mesurer une distance (multi segments)'
    },
    {
      type: 'tee' as const,
      label: 'Tee',
      icon: <NearMe />,
      description: 'Placer un tee de départ'
    },
    {
      type: 'basket' as const,
      label: 'Panier',
      icon: <SportsMartialArts />,
      description: 'Placer un panier'
    },
    {
      type: 'ob-zone' as const,
      label: 'Zone OB',
      icon: <Block />,
      description: 'Dessiner une zone hors-limites'
    },
    {
      type: 'hazard' as const,
      label: 'Danger',
      icon: <Warning />,
      description: 'Dessiner une zone dangereuse'
    },
    {
  type: 'mandatory' as const,
      label: 'Mandatory',
      icon: <TrendingFlat />,
      description: 'Tracer une ligne obligatoire'
    }
  ];

  const cancelDrawing = () => {
    dispatch({ type: 'CANCEL_DRAWING' });
  };

  // Gestion des trous
  const holesSorted = [...state.holes].sort((a,b) => a.number - b.number);
  const currentIndex = holesSorted.findIndex(h => h.number === state.currentHole);
  const nextHole = () => {
    if (currentIndex < holesSorted.length - 1) {
      dispatch({ type: 'SET_CURRENT_HOLE', payload: holesSorted[currentIndex + 1].number });
    }
  };
  const prevHole = () => {
    if (currentIndex > 0) {
      dispatch({ type: 'SET_CURRENT_HOLE', payload: holesSorted[currentIndex - 1].number });
    }
  };
  const addHole = () => {
    const max = holesSorted.reduce((m,h) => Math.max(m,h.number), 0);
    const newNumber = max + 1;
    dispatch({ type: 'ADD_HOLE', payload: newNumber });
    dispatch({ type: 'SET_CURRENT_HOLE', payload: newNumber });
  };
  const removeCurrentHole = () => {
    if (holesSorted.length <= 1) return;
    const hole = currentHoleData;
    if (hole && hole.elements.length > 0) {
      setPendingDeleteHole(hole.number);
      setConfirmOpen(true);
      return;
    }
    dispatch({ type: 'DELETE_HOLE', payload: state.currentHole });
  };

  const confirmDelete = () => {
    if (pendingDeleteHole !== null) {
      dispatch({ type: 'DELETE_HOLE', payload: pendingDeleteHole });
    }
    setConfirmOpen(false);
    setPendingDeleteHole(null);
  };
  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingDeleteHole(null);
  };

  // Trou courant (distance stockée déjà calculée côté reducer)
  const currentHoleData = state.holes.find(h => h.number === state.currentHole);

  // Sauvegarde manuelle (même si auto-save actif) pour feedback utilisateur
  const manualSave = () => {
    try {
      const data = serializeState(state);
      localStorage.setItem('dgmap_state_v1', JSON.stringify(data));
      console.log('💾 Sauvegarde manuelle effectuée');
    } catch (e) {
      console.warn('Erreur sauvegarde', e);
    }
  };

  const exportJson = () => {
    try {
      const data = serializeState(state);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'parcours.json'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <>
    <Box sx={{ width: '100%' }}>
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
          <Tooltip title="Rétablir (Ctrl+Y / Shift+Ctrl+Z)"><span><IconButton size="small" onClick={() => dispatch({ type:'REDO' })} disabled={state.future.length===0}><Redo fontSize="inherit" /></IconButton></span></Tooltip>
        </Stack>
      </Box>

      {/* Mode & dessin en cours */}
      {(state.drawingMode || state.isDrawing) && (
        <Box sx={{ mt:1 }}>
          {state.drawingMode && <Chip size="small" color="primary" label={`Mode: ${tools.find(t=>t.type===state.drawingMode)?.label || '—'}`} sx={{ mr:1 }} />}
          {state.isDrawing && <Chip size="small" color="warning" label="Dessin..." />}
        </Box>
      )}

      {state.isDrawing && (
        <Button fullWidth size="small" color="error" variant="outlined" sx={{ mt:1 }} onClick={cancelDrawing}>Annuler le dessin</Button>
      )}

      {/* Edition élément sélectionné */}
      {state.selectedElement && (() => {
        const hole = state.holes.find(h => h.elements.some(e => e.id === state.selectedElement));
        const el = hole?.elements.find(e => e.id === state.selectedElement);
        if (!el) return null;
        return (
          <Box sx={{ mt: 2, p:1, border: '1px solid #ddd', borderRadius:1 }}>
            <Typography variant="subtitle2" gutterBottom>✏️ Éditer l'élément</Typography>
            <TextField
              size="small"
              fullWidth
              label="Nom"
              value={el.properties?.name || ''}
              onChange={(e) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { properties: { ...el.properties, name: e.target.value } } } })}
              sx={{ mb: 1 }}
            />
            <TextField
              size="small"
              fullWidth
              label="Couleur"
              type="color"
              value={el.properties?.color || '#000000'}
              onChange={(e) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { properties: { ...el.properties, color: e.target.value } } } })}
              sx={{ mb: 1 }}
            />
            <Button size="small" color="error" onClick={() => dispatch({ type: 'DELETE_ELEMENT', payload: el.id })}>Supprimer</Button>
          </Box>
        );
      })()}
      {/* Statistiques */}
      {currentHoleData && (
        <Box sx={{ mt:2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight:'bold', mb:1 }}>Statistiques</Typography>
          {(() => {
            const elems = currentHoleData.elements;
            const tees = elems.filter(e => e.type === 'tee');
            const baskets = elems.filter(e => e.type === 'basket');
            return (
              <Box sx={{ fontSize:'0.75rem' }}>
                <div>Éléments: {elems.length}</div>
                <div>Tees: {tees.length}</div>
                <div>Paniers: {baskets.length}</div>
                <div>Distance: {currentHoleData.distance !== undefined ? `${currentHoleData.distance} m` : '—'}</div>
              </Box>
            );
          })()}
        </Box>
      )}

      {/* Instructions contextuelles */}
      {state.drawingMode && (
        <Box sx={{ mt:1, p:1, background:'#f5f5f5', borderRadius:1 }}>
          <Typography variant="caption" color="text.secondary">
            {state.drawingMode === 'tee' && '🎯 Tee: un clic pour placer.'}
            {state.drawingMode === 'basket' && '🥏 Panier: un clic pour placer.'}
            {state.drawingMode === 'mandatory' && '⬆️ Mandatory: cliquez sur la carte pour poser une flèche rouge.'}
            {state.drawingMode === 'ob-zone' && '❌ Zone OB: clics successifs puis double‑clic pour fermer (min 3 points).'}
            {state.drawingMode === 'hazard' && '⚠️ Danger: clics successifs puis double‑clic (min 3 points).'}
            {state.drawingMode === 'measure' && '📏 Mesure: clics, double‑clic pour terminer (non sauvegardé).'}
            <br/>Échap: annuler.
          </Typography>
        </Box>
      )}

      {/* Actions */}
      <Divider sx={{ my:2 }} />
      <Typography variant="subtitle2" sx={{ fontWeight:'bold', mb:1 }}>Actions</Typography>
      <Stack spacing={1}>
        <Button size="small" variant="contained" color="success" startIcon={<Save />} onClick={manualSave}>Sauvegarder</Button>
        <Button size="small" variant="outlined" startIcon={<Download />} onClick={exportJson}>Exporter JSON</Button>
        <Button size="small" variant="outlined" onClick={() => setImportDialog(true)}>Importer JSON</Button>
        <Button size="small" variant="outlined" startIcon={<ImageIcon />} disabled>Exporter Image (à venir)</Button>
        <Button size="small" variant="outlined" color="warning" onClick={() => {
          if (confirm('Réinitialiser le parcours ?')) { localStorage.removeItem('dgmap_state_v1'); location.reload(); }
        }}>Reset</Button>
      </Stack>
    </Box>
    {/* Import dialog */}
    <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Importer un parcours</DialogTitle>
      <DialogContent>
        <DialogContentText>Collez un JSON exporté précédemment.</DialogContentText>
        <TextField
          multiline
          minRows={6}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            fullWidth
            sx={{ mt:1 }}
            placeholder='{"holes": ...}'
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setImportDialog(false)}>Annuler</Button>
        <Button onClick={() => {
          try {
            const parsed = JSON.parse(importText);
            const cleaned = { ...parsed, map: null };
            localStorage.setItem('dgmap_state_v1', JSON.stringify(cleaned));
            setImportDialog(false);
            location.reload();
          } catch {
            alert('JSON invalide');
          }
        }} variant="contained">Importer</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={confirmOpen} onClose={cancelDelete} maxWidth="xs" fullWidth>
      <DialogTitle>Supprimer le trou {pendingDeleteHole}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Ce trou contient des éléments. Confirmer la suppression ? (Ils seront perdus)
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancelDelete}>Annuler</Button>
        <Button onClick={confirmDelete} color="error" variant="contained">Supprimer</Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default DrawingToolsSidebar;