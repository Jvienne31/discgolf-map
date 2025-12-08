
import { Box, Button, Typography, List, ListItem, ListItemButton, Paper, Divider, TextField, ListItemText, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Alert, useTheme } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ProfileDialog from './ProfileDialog';
import AdminUsersDialog from './AdminUsersDialog';
import { apiService } from '../services/api';

export interface CourseListItem {
  id: string;
  name: string;
  owner?: string;
  holeCount?: number;
}

interface StartupScreenProps {
  courses: CourseListItem[];
  onSelectCourse: (courseId: string) => void;
  onCreateCourse: (courseName: string) => void;
  onCoursesChange?: () => void;
}

const StartupScreen = ({ courses, onSelectCourse, onCreateCourse, onCoursesChange }: StartupScreenProps) => {
  const theme = useTheme();
  const [newCourseName, setNewCourseName] = useState('');
  const { user, logout, isAdmin } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminUsersOpen, setAdminUsersOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<CourseListItem | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [courseToRename, setCourseToRename] = useState<CourseListItem | null>(null);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const gradientColors = theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`
    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.secondary.light} 100%)`;

  const handleCreate = () => {
    if (newCourseName.trim()) {
      onCreateCourse(newCourseName.trim());
      setNewCourseName('');
    }
  };

  const handleDeleteClick = (course: CourseListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      await apiService.deleteCourse(courseToDelete.id);
      setMessage(`Parcours "${courseToDelete.name}" supprimé avec succès`);
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
      onCoursesChange?.();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError('Erreur lors de la suppression du parcours');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRenameClick = (course: CourseListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseToRename(course);
    setNewName(course.name);
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = async () => {
    if (!courseToRename || !newName.trim()) return;

    try {
      const courseData = await apiService.getCourse(courseToRename.id);
      await apiService.updateCourse(courseToRename.id, { ...courseData, name: newName.trim() });
      setMessage(`Parcours renommé en "${newName.trim()}"`);
      setRenameDialogOpen(false);
      setCourseToRename(null);
      setNewName('');
      onCoursesChange?.();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError('Erreur lors de la modification du parcours');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        background: gradientColors,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      {/* Header avec info utilisateur */}
      <Box sx={{ 
        position: 'absolute', 
        top: { xs: 10, sm: 20 }, 
        right: { xs: 10, sm: 20 },
        left: { xs: 10, sm: 'auto' },
        display: 'flex', 
        gap: { xs: 0.5, sm: 1 }, 
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end'
      }}>
        <Chip 
          icon={<PersonIcon />}
          label={user?.username}
          color={isAdmin ? 'error' : 'primary'}
          variant="filled"
          size="small"
          sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
        />
        <IconButton
          onClick={() => setProfileOpen(true)}
          sx={{ 
            color: 'white',
            padding: { xs: 0.5, sm: 1 },
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
          }}
          title="Mon profil"
          size="small"
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
        {isAdmin && (
          <IconButton
            onClick={() => setAdminUsersOpen(true)}
            sx={{ 
              color: 'white',
              padding: { xs: 0.5, sm: 1 },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
            title="Gestion des utilisateurs"
            size="small"
          >
            <SupervisorAccountIcon fontSize="small" />
          </IconButton>
        )}
        <Button 
          variant="outlined" 
          onClick={logout}
          size="small"
          sx={{ 
            color: 'white', 
            borderColor: 'white',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            px: { xs: 1.5, sm: 2 },
            '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
          }}
        >
          Déconnexion
        </Button>
      </Box>

      {/* Dialogs */}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      {isAdmin && <AdminUsersDialog open={adminUsersOpen} onClose={() => setAdminUsersOpen(false)} />}

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer le parcours "{courseToDelete?.name}" ?
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de modification du nom */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
      >
        <DialogTitle>Modifier le nom du parcours</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nouveau nom"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRenameConfirm()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleRenameConfirm} variant="contained" disabled={!newName.trim()}>
            Modifier
          </Button>
        </DialogActions>
      </Dialog>

      <Paper 
        elevation={10} 
        sx={{ 
          p: {xs: 3, sm: 5}, 
          m: 2, 
          width: '100%', 
          maxWidth: 700,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* En-tête avec logo */}
        <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 4 }, mt: { xs: 6, sm: 0 } }}>
          <Box 
            component="img"
            src="/enjoy-disc-golf-logo.png"
            alt="Enjoy Disc Golf"
            sx={{ 
              width: { xs: 100, sm: 150 }, 
              height: { xs: 100, sm: 150 }, 
              mb: 2,
              display: 'block',
              margin: '0 auto'
            }}
          />
          <Typography 
            variant="h3" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold', 
              color: '#1b5e20',
              fontSize: { xs: '1.75rem', sm: '3rem' }
            }}
          >
            DiscGolf Mapper
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary', 
              mb: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
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
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 4 }}>
          <TextField
            fullWidth
            label="Nom du nouveau parcours"
            variant="outlined"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Ex: Parc de la Vallée"
            size="small"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          />
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newCourseName.trim()}
            fullWidth={true}
            sx={{ 
              whiteSpace: 'nowrap',
              px: { xs: 2, sm: 4 },
              minWidth: { sm: 'auto' },
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
          maxHeight: '500px', 
          overflowY: 'auto',
          bgcolor: '#fafafa'
        }}>
          {message && <Alert severity="success" sx={{ m: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
          <List>
            {courses.length > 0 ? courses.map((course, index) => (
              <ListItem 
                key={course.id}
                divider={index < courses.length - 1}
                sx={{
                  '&:hover': {
                    bgcolor: '#e8f5e9'
                  }
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
                    <IconButton
                      edge="end"
                      aria-label="modifier"
                      onClick={(e) => handleRenameClick(course, e)}
                      size="small"
                      title="Modifier le nom"
                      sx={{ padding: { xs: '4px', sm: '8px' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="supprimer"
                      onClick={(e) => handleDeleteClick(course, e)}
                      size="small"
                      title="Supprimer le parcours"
                      sx={{ color: 'error.main', padding: { xs: '4px', sm: '8px' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton onClick={() => onSelectCourse(course.id)} sx={{ pr: { xs: 8, sm: 10 } }}>
                  <ListItemText 
                    primary={course.name}
                    secondary={
                      <>
                        {course.holeCount !== undefined && `${course.holeCount} trou${course.holeCount > 1 ? 's' : ''}`}
                        {course.owner && isAdmin && (
                          <>
                            {course.holeCount !== undefined && ' • '}
                            Créé par: {course.owner}
                          </>
                        )}
                      </>
                    }
                    primaryTypographyProps={{ 
                      fontWeight: 500,
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }}
                    secondaryTypographyProps={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  />
                </ListItemButton>
              </ListItem>
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
