import React from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  GolfCourse as BasketIcon,
  RadioButtonUnchecked as TeeIcon,
  Warning as HazardIcon,
  Block as OBIcon,
  Navigation as MandoIcon,
  Save as SaveIcon,
  FileDownload as ExportIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

const Sidebar: React.FC = () => {
  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Guide zoom */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" color="primary">
            🔍 Guide Zoom Ultra-Précis
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            <strong>🛰️ Satellite HD Google :</strong> Meilleure qualité, zoom 21<br/>
            <strong>🌍 Google Hybrid :</strong> Satellite + routes, zoom 21<br/>
            <strong>📊 Satellite Esri :</strong> Zoom 22 avec scaling<br/>
            <br/>
            <em>💡 Le scaling agrandit automatiquement la dernière image disponible pour un zoom maximal !</em>
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* Outils de création */}
      <Typography variant="h6" gutterBottom>
        Outils de Création
      </Typography>
      
      <List dense>
        <ListItem button>
          <ListItemIcon>
            <TeeIcon color="primary" />
          </ListItemIcon>
          <ListItemText primary="Placer un Tee" />
        </ListItem>
        
        <ListItem button>
          <ListItemIcon>
            <BasketIcon color="secondary" />
          </ListItemIcon>
          <ListItemText primary="Placer un Panier" />
        </ListItem>
        
        <ListItem button>
          <ListItemIcon>
            <OBIcon color="error" />
          </ListItemIcon>
          <ListItemText primary="Zone OB" />
        </ListItem>
        
        <ListItem button>
          <ListItemIcon>
            <HazardIcon color="warning" />
          </ListItemIcon>
          <ListItemText primary="Zone Hazard" />
        </ListItem>
        
        <ListItem button>
          <ListItemIcon>
            <MandoIcon />
          </ListItemIcon>
          <ListItemText primary="Mandatory" />
        </ListItem>
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Liste des trous */}
      <Typography variant="h6" gutterBottom>
        Trous du Parcours
      </Typography>
      
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        fullWidth
        sx={{ mb: 2 }}
      >
        Ajouter un Trou
      </Button>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Trou 1 - Par 3</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2">
            Distance: 85m
            <br />
            Tee: Pro, Amateur
            <br />
            OB: Oui
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* Actions */}
      <Typography variant="h6" gutterBottom>
        Actions
      </Typography>
      
      <Button
        variant="contained"
        startIcon={<SaveIcon />}
        fullWidth
        sx={{ mb: 1 }}
      >
        Sauvegarder
      </Button>
      
      <Button
        variant="outlined"
        startIcon={<ExportIcon />}
        fullWidth
      >
        Exporter
      </Button>
    </Box>
  );
};

export default Sidebar;