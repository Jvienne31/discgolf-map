import { Box, Button, Divider, Typography, Chip } from '@mui/material';
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
        {state.holes[state.currentHole] && (
          <>
            <Typography variant="body2" color="text.secondary">
              • Éléments: {state.holes[state.currentHole].elements.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Tees: {state.holes[state.currentHole].elements.filter((e: any) => e.type === 'tee').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Paniers: {state.holes[state.currentHole].elements.filter((e: any) => e.type === 'basket').length}
            </Typography>
          </>
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