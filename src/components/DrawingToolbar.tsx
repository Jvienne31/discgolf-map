import { useState } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Chip
} from '@mui/material';
import {
  PanTool,
  Place,
  Sports,
  Warning,
  Waves,
  Navigation,
  Straighten,
  Delete,
  Undo,
  Redo,
  Save
} from '@mui/icons-material';
import { useDrawing } from '../contexts/DrawingContext';
import { DrawingMode } from '../types/course-elements';

export const DrawingToolbar = () => {
  const { state, setMode, setCurrentHole } = useDrawing();
  const [currentTool, setCurrentTool] = useState<DrawingMode>('select');

  const handleToolChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTool: DrawingMode | null
  ) => {
    if (newTool !== null) {
      setCurrentTool(newTool);
      setMode(newTool);
    }
  };

  const handleHoleChange = (holeNumber: number) => {
    setCurrentHole(holeNumber);
  };

  const tools = [
    {
      value: 'select' as DrawingMode,
      icon: <PanTool />,
      label: 'Sélection',
      color: 'default' as const
    },
    {
      value: 'tee' as DrawingMode,
      icon: <Place />,
      label: 'Placer Tee',
      color: 'success' as const
    },
    {
      value: 'basket' as DrawingMode,
      icon: <Sports />,
      label: 'Placer Panier',
      color: 'warning' as const
    },
    {
      value: 'ob-zone' as DrawingMode,
      icon: <Warning />,
      label: 'Zone OB',
      color: 'error' as const
    },
    {
      value: 'hazard' as DrawingMode,
      icon: <Waves />,
      label: 'Obstacle',
      color: 'info' as const
    },
    {
      value: 'mandatory' as DrawingMode,
      icon: <Navigation />,
      label: 'Mandatory',
      color: 'secondary' as const
    },
    {
      value: 'measurement' as DrawingMode,
      icon: <Straighten />,
      label: 'Mesure',
      color: 'default' as const
    }
  ];

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        padding: 2,
        minWidth: 300,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* En-tête avec info du trou actuel */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ mr: 2 }}>
          Outils de Création
        </Typography>
        <Chip
          label={`Trou ${state.currentHole}`}
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* Sélecteur de trou */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Trou actuel :
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
            <IconButton
              key={hole}
              size="small"
              onClick={() => handleHoleChange(hole)}
              sx={{
                minWidth: 32,
                height: 32,
                backgroundColor: hole === state.currentHole ? 'primary.main' : 'transparent',
                color: hole === state.currentHole ? 'white' : 'text.primary',
                border: 1,
                borderColor: hole === state.currentHole ? 'primary.main' : 'divider',
                '&:hover': {
                  backgroundColor: hole === state.currentHole ? 'primary.dark' : 'action.hover'
                }
              }}
            >
              {hole}
            </IconButton>
          ))}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Outils de dessin */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Outils de dessin :
        </Typography>
        <ToggleButtonGroup
          value={currentTool}
          exclusive
          onChange={handleToolChange}
          aria-label="drawing tools"
          sx={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiToggleButton-root': {
              flex: '1 1 calc(50% - 4px)',
              minWidth: '120px',
              padding: '8px 12px',
              border: 1,
              borderColor: 'divider',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark'
                }
              }
            }
          }}
        >
          {tools.map((tool) => (
            <ToggleButton key={tool.value} value={tool.value}>
              <Tooltip title={tool.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tool.icon}
                  <Typography variant="caption">
                    {tool.label}
                  </Typography>
                </Box>
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Annuler">
            <IconButton size="small" disabled>
              <Undo />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refaire">
            <IconButton size="small" disabled>
              <Redo />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer sélection">
            <IconButton 
              size="small" 
              color="error"
              disabled={state.selectedElements.length === 0}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Tooltip title="Sauvegarder">
          <IconButton size="small" color="primary">
            <Save />
          </IconButton>
        </Tooltip>
      </Box>

      {/* État actuel */}
      {state.isDrawing && (
        <Box sx={{ mt: 2, p: 1, backgroundColor: 'info.light', borderRadius: 1 }}>
          <Typography variant="caption" color="info.contrastText">
            Mode dessin actif : {tools.find(t => t.value === state.mode)?.label}
            {state.tempCoordinates.length > 0 && 
              ` (${state.tempCoordinates.length} points)`
            }
          </Typography>
        </Box>
      )}
    </Paper>
  );
};