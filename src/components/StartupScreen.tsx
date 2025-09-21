
import { Box, Button, Typography, List, ListItem, ListItemButton, Paper, Divider, TextField, ListItemText } from '@mui/material';
import { useState } from 'react';

export interface CourseListItem {
  id: string;
  name: string;
}

interface StartupScreenProps {
  courses: CourseListItem[];
  onSelectCourse: (courseId: string) => void;
  onCreateCourse: (courseName: string) => void;
}

const StartupScreen = ({ courses, onSelectCourse, onCreateCourse }: StartupScreenProps) => {
  const [newCourseName, setNewCourseName] = useState('');

  const handleCreate = () => {
    if (newCourseName.trim()) {
      onCreateCourse(newCourseName.trim());
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fafafa' }}>
      <Paper elevation={3} sx={{ p: {xs: 2, sm: 4}, m: 2, width: '100%', maxWidth: 600, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          DiscGolf Course Mapper
        </Typography>
        <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3, color: 'text.secondary' }}>
          Choisissez un parcours à modifier ou créez-en un nouveau.
        </Typography>
        
        <Divider sx={{ my: 2 }}><Typography variant="overline">Nouveau Parcours</Typography></Divider>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Nom du nouveau parcours"
            variant="outlined"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newCourseName.trim()}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Créer
          </Button>
        </Box>

        <Divider sx={{ my: 2 }}><Typography variant="overline">Parcours Existants</Typography></Divider>

        <Box sx={{ border: '1px solid #ddd', borderRadius: 1, maxHeight: '40vh', overflowY: 'auto' }}>
          <List>
            {courses.length > 0 ? courses.map((course, index) => (
              <ListItemButton key={course.id} onClick={() => onSelectCourse(course.id)} divider={index < courses.length - 1}>
                <ListItemText primary={course.name} />
              </ListItemButton>
            )) : (
              <ListItem>
                  <ListItemText primary="Aucun parcours sauvegardé pour le moment." sx={{ textAlign: 'center', color: 'text.secondary' }} />
              </ListItem>
            )}
          </List>
        </Box>
      </Paper>
    </Box>
  );
};

export default StartupScreen;
