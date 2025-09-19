import { Box, Button, Divider, Typography, Chip, IconButton, Stack, Select, MenuItem, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField } from '@mui/material';
import { useState } from 'react';
import { Add, Remove, ArrowBack, ArrowForward } from '@mui/icons-material';
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
import { useLeafletDrawing, CourseElement } from '../contexts/LeafletDrawingContext';

const DrawingToolsSidebar = () => {
  const { state, dispatch } = useLeafletDrawing();
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
      type: 'mandatory-line' as const,
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

  // Distance tee -> panier (simple: premier tee et premier panier du trou)
  const currentHoleData = state.holes.find(h => h.number === state.currentHole);
  let teeBasketDistance: number | null = null;
  if (currentHoleData) {
    const tee = currentHoleData.elements.find(e => e.type === 'tee' && e.position);
    const basket = currentHoleData.elements.find(e => e.type === 'basket' && e.position);
    if (tee && basket && tee.position && basket.position) {
      const R = 6371000; // m
      const toRad = (d: number) => d * Math.PI / 180;
      const dLat = toRad(basket.position.lat - tee.position.lat);
      const dLng = toRad(basket.position.lng - tee.position.lng);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(tee.position.lat))*Math.cos(toRad(basket.position.lat))*Math.sin(dLng/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      teeBasketDistance = Math.round(R * c);
    }
  }

  return (
    <>
    <Box sx={{ width: '100%' }}>
      {/* Titre */}
      <Typography 
        variant="h6" 
        gutterBottom
        sx={{ 
          color: '#2e7d32',
          fontWeight: 'bold',
          fontSize: '1rem',
          mb: 2
        }}
      >
        🛠️ Outils de Dessin
      </Typography>

      {/* Mode actuel */}
      {state.drawingMode && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Mode: ${tools.find(t => t.type === state.drawingMode)?.label || 'Inconnu'}`}
            color="primary"
            size="small"
            sx={{ mb: 1 }}
          />
          {state.isDrawing && (
            <Chip
              label="Dessin en cours..."
              color="warning"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
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

      {/* Par du trou */}
      <Box sx={{ mt: 2 }}>
        <TextField
          label="Par du trou"
          size="small"
          type="number"
          value={currentHoleData?.par || 3}
          onChange={(e) => dispatch({ type: 'UPDATE_HOLE', payload: { number: state.currentHole, updates: { par: parseInt(e.target.value || '3', 10) } } })}
          sx={{ width: 140 }}
          inputProps={{ min: 1, max: 10 }}
        />
      </Box>

      {/* Export / Import */}
      <Divider sx={{ my:2 }} />
      <Typography variant="subtitle2" gutterBottom>💾 Export / Import</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button size="small" variant="outlined" onClick={() => {
          try {
            const data = { ...state, map: null };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'parcours.json'; a.click();
            URL.revokeObjectURL(url);
          } catch {}
        }}>Exporter</Button>
        <Button size="small" variant="outlined" onClick={() => setImportDialog(true)}>Importer</Button>
        <Button size="small" variant="outlined" color="warning" onClick={() => {
          if (confirm('Réinitialiser le parcours ?')) {
            localStorage.removeItem('dgmap_state_v1');
            location.reload();
          }
        }}>Reset</Button>
      </Stack>

      {/* Outils principaux */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {tools.map((tool) => (
          <Button
            key={tool.type || 'select'}
            onClick={() => handleToolSelect(tool.type)}
            variant={state.drawingMode === tool.type ? 'contained' : 'outlined'}
            startIcon={tool.icon}
            sx={{ 
              justifyContent: 'flex-start',
              backgroundColor: state.drawingMode === tool.type ? '#4caf50' : undefined,
              '&:hover': {
                backgroundColor: state.drawingMode === tool.type ? '#45a049' : undefined,
              },
              fontSize: '0.85rem'
            }}
            title={tool.description}
            fullWidth
          >
            {tool.label}
          </Button>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Actions de dessin */}
      {state.isDrawing && (
        <Button
          onClick={cancelDrawing}
          variant="outlined"
          color="error"
          startIcon={<Clear />}
          fullWidth
          sx={{ mb: 2 }}
        >
          Annuler
        </Button>
      )}

      {/* Statistiques */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          📊 Statistiques
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Trou actuel: {state.currentHole}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 1, flexWrap:'wrap' }}>
          <Tooltip title="Trou précédent">
            <span>
              <IconButton size="small" onClick={prevHole} disabled={currentIndex <= 0}>
                <ArrowBack fontSize="inherit" />
              </IconButton>
            </span>
          </Tooltip>
          <Select
            size="small"
            value={state.currentHole}
            onChange={(e) => dispatch({ type: 'SET_CURRENT_HOLE', payload: e.target.value as number })}
            sx={{ minWidth: 80 }}
          >
            {holesSorted.map(h => (
              <MenuItem key={h.number} value={h.number}>Trou {h.number}</MenuItem>
            ))}
          </Select>
          <Tooltip title="Trou suivant">
            <span>
              <IconButton size="small" onClick={nextHole} disabled={currentIndex >= holesSorted.length - 1}>
                <ArrowForward fontSize="inherit" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Ajouter un nouveau trou">
            <IconButton size="small" onClick={addHole} color="primary">
              <Add fontSize="inherit" />
            </IconButton>
          </Tooltip>
            <Tooltip title={holesSorted.length <= 1 ? 'Impossible (au moins 1 trou requis)' : 'Supprimer ce trou'}>
              <span>
                <IconButton size="small" onClick={removeCurrentHole} disabled={holesSorted.length <= 1} color="error">
                  <Remove fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
        </Stack>
        {currentHoleData && (
          (() => {
            const elems = currentHoleData.elements;
            const tees = elems.filter(e => e.type === 'tee');
            const baskets = elems.filter(e => e.type === 'basket');
            return (
              <>
                <Typography variant="body2" color="text.secondary">• Éléments: {elems.length}</Typography>
                <Typography variant="body2" color="text.secondary">• Tees: {tees.length}</Typography>
                <Typography variant="body2" color="text.secondary">• Paniers: {baskets.length}</Typography>
                {tees.length > 0 && baskets.length > 0 && teeBasketDistance !== null && (
                  <Typography variant="body2" color="text.secondary">• Distance Tee→Panier: {teeBasketDistance} m</Typography>
                )}
              </>
            );
          })()
        )}
      </Box>

      {/* Instructions */}
      {state.drawingMode && (
        <Box sx={{ mt: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {state.drawingMode === 'tee' && '🎯 Tee: un seul clic pour placer.'}
            {state.drawingMode === 'basket' && '🥏 Panier: un seul clic pour placer.'}
            {state.drawingMode === 'mandatory-line' && '➡️ Mandatory: clic initial puis double‑clic pour terminer (min 2 points).'}
            {state.drawingMode === 'ob-zone' && '❌ Zone OB: cliquez pour ajouter des sommets, double‑clic pour fermer (min 3 points).'}
            {state.drawingMode === 'hazard' && '⚠️ Danger: cliquez pour ajouter des sommets, double‑clic pour fermer (min 3 points).'}
            {state.drawingMode === 'measure' && '📏 Mesure: cliquez pour ajouter des points, double‑clic pour terminer. Aucune sauvegarde.'}
            <br />Appuyez sur Échap pour annuler.
          </Typography>
        </Box>
      )}
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