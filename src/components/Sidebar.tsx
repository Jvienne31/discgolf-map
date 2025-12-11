import { Box, Divider, Typography, Switch, FormControlLabel, Alert } from '@mui/material';
import DrawingToolsSidebar from './DrawingToolsSidebar';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useMapContext } from '../contexts/MapContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useEffect } from 'react';

const Sidebar = () => {
  const { fieldMode, setFieldMode, setUserLocation } = useMapContext();
  const geoState = useGeolocation(fieldMode);

  useEffect(() => {
    if (geoState.latitude && geoState.longitude) {
      setUserLocation({ lat: geoState.latitude, lng: geoState.longitude });
    } else {
      setUserLocation(null);
    }
  }, [geoState.latitude, geoState.longitude, setUserLocation]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Outils de Dessin
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* Mode Terrain */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <FormControlLabel
          control={
            <Switch
              checked={fieldMode}
              onChange={(e) => setFieldMode(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MyLocationIcon fontSize="small" />
              <Typography variant="body2">Mode Terrain</Typography>
            </Box>
          }
        />
        
        {fieldMode && geoState.loading && (
          <Alert severity="info" sx={{ mt: 1, py: 0 }}>
            Recherche de votre position...
          </Alert>
        )}
        
        {fieldMode && geoState.error && (
          <Alert severity="error" sx={{ mt: 1, py: 0 }}>
            {geoState.error}
          </Alert>
        )}
        
        {fieldMode && geoState.latitude && geoState.longitude && (
          <Alert 
            severity={
              geoState.accuracy && geoState.accuracy < 10 ? "success" : 
              geoState.accuracy && geoState.accuracy < 30 ? "info" : 
              "warning"
            } 
            sx={{ mt: 1, py: 0 }}
          >
            Position trouvée (±{geoState.accuracy?.toFixed(0)}m)
            {geoState.accuracy && geoState.accuracy > 30 && (
              <Typography variant="caption" display="block">
                💡 Pour une meilleure précision, va en extérieur avec vue dégagée du ciel
              </Typography>
            )}
          </Alert>
        )}
      </Box>

      <DrawingToolsSidebar />
    </Box>
  );
};

export default Sidebar;
