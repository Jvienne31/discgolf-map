import { Box, Button, Divider, Typography, Chip, IconButton, Stack } from '@mui/material';
import { Add, Remove, ArrowBack, ArrowForward } from '@mui/icons-material';
import { 
  NearMe, 
  SportsMartialArts, 
  Block, 
  Warning, 
  TrendingFlat,
  Clear,
  TouchApp
} from '@mui/icons-material';
import { useLeafletDrawing, CourseElement } from '../contexts/LeafletDrawingContext';

const DrawingToolsSidebar = () => {
  const { state, dispatch } = useLeafletDrawing();

  const handleToolSelect = (tool: CourseElement['type'] | null) => {
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
    dispatch({ type: 'DELETE_HOLE', payload: state.currentHole });
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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 1 }}>
          <IconButton size="small" onClick={prevHole} disabled={currentIndex <= 0}>
            <ArrowBack fontSize="inherit" />
          </IconButton>
          <Typography variant="caption">{currentIndex + 1} / {holesSorted.length}</Typography>
          <IconButton size="small" onClick={nextHole} disabled={currentIndex >= holesSorted.length - 1}>
            <ArrowForward fontSize="inherit" />
          </IconButton>
          <IconButton size="small" onClick={addHole} color="primary">
            <Add fontSize="inherit" />
          </IconButton>
          <IconButton size="small" onClick={removeCurrentHole} disabled={holesSorted.length <= 1} color="error">
            <Remove fontSize="inherit" />
          </IconButton>
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
            {state.drawingMode === 'tee' || state.drawingMode === 'basket' 
              ? '💡 Cliquez sur la carte pour placer'
              : '💡 Cliquez pour commencer, double-cliquez pour finir'
            }
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DrawingToolsSidebar;