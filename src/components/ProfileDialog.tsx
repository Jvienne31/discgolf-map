import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  Divider,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode, colorPalettes } from '../contexts/ThemeContext';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { mode, colorPalette, toggleMode, setColorPalette } = useThemeMode();
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateEmail = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la modification');
      }

      setMessage('Email modifié avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setError('');
    setMessage('');

    if (!currentPassword || !newPassword) {
      setError('Tous les champs sont requis');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la modification');
      }

      setMessage('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Mon Profil</Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.username} ({user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'})
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Section Apparence */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Apparence</Typography>
          
          {/* Mode Clair/Sombre */}
          <Box sx={{ mb: 2 }}>
            <FormLabel component="legend">Mode d'affichage</FormLabel>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={toggleMode}
              aria-label="mode d'affichage"
              fullWidth
              sx={{ mt: 1 }}
            >
              <ToggleButton value="light" aria-label="mode clair">
                <LightModeIcon sx={{ mr: 1 }} />
                Clair
              </ToggleButton>
              <ToggleButton value="dark" aria-label="mode sombre">
                <DarkModeIcon sx={{ mr: 1 }} />
                Sombre
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Palette de couleurs */}
          <Box>
            <FormControl component="fieldset">
              <FormLabel component="legend">Palette de couleurs</FormLabel>
              <RadioGroup
                value={colorPalette}
                onChange={(e) => setColorPalette(e.target.value as keyof typeof colorPalettes)}
              >
                {Object.entries(colorPalettes).map(([key, palette]) => (
                  <FormControlLabel
                    key={key}
                    value={key}
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: palette[mode].primary,
                            border: '2px solid',
                            borderColor: 'divider'
                          }}
                        />
                        {palette.name}
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Section Email */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Email</Typography>
          <TextField
            fullWidth
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label="Adresse email"
            margin="normal"
            disabled={loading}
          />
          <Button
            variant="contained"
            onClick={handleUpdateEmail}
            disabled={loading || !email}
            sx={{ mt: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Modifier l\'email'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Section Mot de passe */}
        <Box>
          <Typography variant="h6" gutterBottom>Changer le mot de passe</Typography>
          <TextField
            fullWidth
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            label="Mot de passe actuel"
            margin="normal"
            disabled={loading}
          />
          <TextField
            fullWidth
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            label="Nouveau mot de passe"
            margin="normal"
            disabled={loading}
            helperText="Au moins 6 caractères"
          />
          <TextField
            fullWidth
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label="Confirmer le nouveau mot de passe"
            margin="normal"
            disabled={loading}
          />
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            sx={{ mt: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Changer le mot de passe'}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;
