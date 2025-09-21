
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import { ArrowBack, ArrowForward, Add, Delete } from '@mui/icons-material';
import { useLeafletDrawing } from '../contexts/LeafletDrawingContext';

const HoleNavigator = () => {
  const { state, dispatch } = useLeafletDrawing();
  const { holes, currentHole } = state;

  const handlePreviousHole = () => {
    const currentIndex = holes.findIndex(h => h.number === currentHole);
    if (currentIndex > 0) {
      dispatch({ type: 'SET_CURRENT_HOLE', payload: holes[currentIndex - 1].number });
    }
  };

  const handleNextHole = () => {
    const currentIndex = holes.findIndex(h => h.number === currentHole);
    if (currentIndex < holes.length - 1) {
      dispatch({ type: 'SET_CURRENT_HOLE', payload: holes[currentIndex + 1].number });
    }
  };

  const handleAddHole = () => {
    const newHoleNumber = (holes[holes.length - 1]?.number || 0) + 1;
    dispatch({ type: 'ADD_HOLE', payload: newHoleNumber });
    dispatch({ type: 'SET_CURRENT_HOLE', payload: newHoleNumber });
  };

  const handleDeleteHole = () => {
    if (holes.length > 1 && window.confirm(`Voulez-vous vraiment supprimer le trou ${currentHole} ?`)) {
      dispatch({ type: 'DELETE_HOLE', payload: currentHole });
    }
  };

  const holeIndex = holes.findIndex(h => h.number === currentHole);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title="Trou précédent">
        <span>
          <IconButton onClick={handlePreviousHole} disabled={holeIndex === 0} size="small">
            <ArrowBack />
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="subtitle1" sx={{ minWidth: 60, textAlign: 'center' }}>
        Trou {currentHole}
      </Typography>
      <Tooltip title="Trou suivant">
        <span>
          <IconButton onClick={handleNextHole} disabled={holeIndex === holes.length - 1} size="small">
            <ArrowForward />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Ajouter un trou">
        <span>
          <IconButton onClick={handleAddHole} size="small"><Add /></IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Supprimer le trou">
        <span>
          <IconButton onClick={handleDeleteHole} disabled={holes.length <= 1} size="small"><Delete /></IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default HoleNavigator;
