import { Box, ButtonGroup, Button, Divider, Typography } from '@mui/material';
import { 
  NearMe, 
  SportsMartialArts, 
  Block, 
  Warning, 
  TrendingFlat,
  Clear,
  TouchApp
} from '@mui/icons-material';
import { useLeafletDrawing, CourseElement, getElementIcon } from '../contexts/LeafletDrawingContext';

const LeafletDrawingToolbar = () => {
  const { state, dispatch } = useLeafletDrawing();

  const handleToolSelect = (tool: CourseElement['type'] | null) => {
    dispatch({ type: 'SET_DRAWING_MODE', payload: tool });
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
    <Box
      sx={{
        position: 'absolute',
        top: { xs: 8, sm: 16 },
        left: { xs: 8, sm: 16 },
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: { xs: 150, sm: 180 },
        maxWidth: { xs: 180, sm: 220 }
      }}
    >
      {/* Titre */}
      <Typography 
        variant="h6" 
        sx={{ 
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: { xs: 0.5, sm: 1 },
          borderRadius: 1,
          textAlign: 'center',
          fontSize: { xs: '0.8rem', sm: '0.9rem' }
        }}
      >
        🛠️ Outils de Dessin
      </Typography>

      {/* Outils principaux */}
      <ButtonGroup 
        orientation="vertical" 
        variant="contained" 
        size="small" 
        fullWidth
        sx={{
          '& .MuiButton-root': {
            minWidth: { xs: 150, sm: 180 },
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
            justifyContent: 'flex-start',
            px: { xs: 1, sm: 2 },
            py: { xs: 0.5, sm: 1 }
          }
        }}
      >
        {tools.map((tool) => (
          <Button
            key={tool.type || 'select'}
            onClick={() => handleToolSelect(tool.type)}
            variant={state.drawingMode === tool.type ? 'contained' : 'outlined'}
            startIcon={tool.icon}
            sx={{ 
              backgroundColor: state.drawingMode === tool.type ? '#4caf50' : undefined,
              '&:hover': {
                backgroundColor: state.drawingMode === tool.type ? '#45a049' : undefined,
              }
            }}
            title={tool.description}
          >
            {tool.label}
          </Button>
        ))}
      </ButtonGroup>

      {/* Divider */}
      <Divider />

      {/* Actions de dessin */}
      {state.isDrawing && (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 193, 7, 0.9)',
            color: '#000',
            padding: 1.5,
            borderRadius: 1,
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            🎨 Dessin en cours...
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            Mode: {getElementIcon(state.drawingMode!)} {state.drawingMode}
          </Typography>
          <Button
            onClick={cancelDrawing}
            startIcon={<Clear />}
            size="small"
            variant="contained"
            color="error"
            fullWidth
          >
            Annuler
          </Button>
        </Box>
      )}

      {/* Informations sur le mode actuel */}
      {state.drawingMode && !state.isDrawing && (
        <Box
          sx={{
            backgroundColor: 'rgba(33, 150, 243, 0.9)',
            color: 'white',
            padding: 1.5,
            borderRadius: 1,
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            {getElementIcon(state.drawingMode)} Mode: {state.drawingMode}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            {state.drawingMode === 'tee' || state.drawingMode === 'basket' ? 
              'Cliquez sur la carte pour placer' : 
              'Cliquez pour commencer à dessiner'
            }
          </Typography>
        </Box>
      )}

      {/* Éléments sélectionnés */}
      {state.selectedElement && (
        <Box
          sx={{
            backgroundColor: 'rgba(76, 175, 80, 0.9)',
            color: 'white',
            padding: 1.5,
            borderRadius: 1,
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            ✅ Élément sélectionné
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            ID: {state.selectedElement.substring(0, 8)}...
          </Typography>
        </Box>
      )}

      {/* Statistiques du trou actuel */}
      <Box
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: 1,
          borderRadius: 1,
          fontSize: '0.75rem'
        }}
      >
        <Typography variant="caption" sx={{ display: 'block' }}>
          🕳️ <strong>Trou {state.currentHole}</strong>
        </Typography>
        <Typography variant="caption" sx={{ display: 'block' }}>
          📊 Éléments: {state.holes.find(h => h.number === state.currentHole)?.elements.length || 0}
        </Typography>
      </Box>
    </Box>
  );
};

export default LeafletDrawingToolbar;