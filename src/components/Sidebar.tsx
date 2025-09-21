
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import DrawingToolsSidebar from './DrawingToolsSidebar';

const Sidebar = () => {
  return (
    <Box sx={{ p: 2, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Guide zoom */}
      <Accordion sx={{ mb: 2 }} defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" color="primary">
            🔍 Guide Zoom
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            <strong>🛰️ Satellite HD Google :</strong> Meilleure qualité, zoom 21<br/>
            <strong>🌍 Google Hybrid :</strong> Satellite + routes, zoom 21<br/>
            <strong>📊 Satellite Esri :</strong> Zoom 22 avec scaling<br/>
            <br/>
            <em>💡 Le scaling agrandit l'image pour un zoom maximal.</em>
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* Outils de création */}
      <DrawingToolsSidebar />
    </Box>
  );
};

export default Sidebar;
