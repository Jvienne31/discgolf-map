import { Box, Divider, Typography } from '@mui/material';
import DrawingToolsSidebar from './DrawingToolsSidebar';

const Sidebar = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Outils de Dessin
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <DrawingToolsSidebar />
    </Box>
  );
};

export default Sidebar;
