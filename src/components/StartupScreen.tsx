
import { Box, Button, Typography, List, ListItem, ListItemButton, Paper, Divider, TextField, ListItemText, Chip } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import PersonIcon from '@mui/icons-material/Person';

export interface CourseListItem {
  id: string;
  name: string;
  owner?: string;
}

interface StartupScreenProps {
  courses: CourseListItem[];
  onSelectCourse: (courseId: string) => void;
  onCreateCourse: (courseName: string) => void;
}

const StartupScreen = ({ courses, onSelectCourse, onCreateCourse }: StartupScreenProps) => {
  const [newCourseName, setNewCourseName] = useState('');
  const { user, logout, isAdmin } = useAuth();

  const handleCreate = () => {
    if (newCourseName.trim()) {
      onCreateCourse(newCourseName.trim());
      setNewCourseName('');
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #4caf50 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      {/* Header avec info utilisateur */}
      <Box sx={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Chip 
          icon={<PersonIcon />}
          label={user?.username}
          color={isAdmin ? 'error' : 'primary'}
          variant="filled"
        />
        <Button 
          variant="outlined" 
          onClick={logout}
          sx={{ 
            color: 'white', 
            borderColor: 'white',
            '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
          }}
        >
          Déconnexion
        </Button>
      </Box>

      <Paper 
        elevation={10} 
        sx={{ 
          p: {xs: 3, sm: 5}, 
          m: 2, 
          width: '100%', 
          maxWidth: 700, 
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* En-tête avec logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SportsMmaIcon sx={{ fontSize: 70, color: '#2e7d32', mb: 1 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
            DiscGolf Mapper
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
            Gérez vos parcours de disc golf
          </Typography>
          {isAdmin && (
            <Chip 
              label="Vue Administrateur - Tous les parcours" 
              color="error" 
              size="small" 
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        
        <Divider sx={{ my: 3 }}>
          <Typography variant="overline" sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
            Nouveau Parcours
          </Typography>
        </Divider>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            fullWidth
            label="Nom du nouveau parcours"
            variant="outlined"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Ex: Parc de la Vallée"
          />
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newCourseName.trim()}
            sx={{ 
              whiteSpace: 'nowrap',
              px: 4,
              bgcolor: '#2e7d32',
              '&:hover': { bgcolor: '#1b5e20' }
            }}
          >
            Créer
          </Button>
        </Box>

        <Divider sx={{ my: 3 }}>
          <Typography variant="overline" sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
            Mes Parcours ({courses.length})
          </Typography>
        </Divider>

        <Box sx={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: 2, 
          maxHeight: '45vh', 
          overflowY: 'auto',
          bgcolor: '#fafafa'
        }}>
          <List>
            {courses.length > 0 ? courses.map((course, index) => (
              <ListItemButton 
                key={course.id} 
                onClick={() => onSelectCourse(course.id)} 
                divider={index < courses.length - 1}
                sx={{
                  '&:hover': {
                    bgcolor: '#e8f5e9'
                  }
                }}
              >
                <ListItemText 
                  primary={course.name}
                  secondary={course.owner && isAdmin ? `Créé par: ${course.owner}` : null}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            )) : (
              <ListItem>
                <ListItemText 
                  primary="Aucun parcours pour le moment" 
                  secondary="Créez votre premier parcours ci-dessus"
                  sx={{ textAlign: 'center', color: 'text.secondary' }} 
                />
              </ListItem>
            )}
          </List>
        </Box>
      </Paper>
    </Box>
  );
};

export default StartupScreen;
