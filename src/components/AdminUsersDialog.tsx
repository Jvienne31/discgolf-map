import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Alert,
  Box,
  Typography,
  Chip,
  Dialog as ConfirmDialog,
  DialogContentText
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

interface AdminUsersDialogProps {
  open: boolean;
  onClose: () => void;
}

const AdminUsersDialog: React.FC<AdminUsersDialogProps> = ({ open, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // État pour la réinitialisation de mot de passe
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // État pour voir le mot de passe
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordHash, setPasswordHash] = useState('');

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des utilisateurs');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la réinitialisation');
      }

      setMessage(`Mot de passe de ${selectedUser.username} réinitialisé avec succès`);
      setResetDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewPassword = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}/password`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du mot de passe');
      }

      const data = await response.json();
      setPasswordHash(data.passwordHash);
      setSelectedUser(user);
      setPasswordDialogOpen(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h5">Gestion des Utilisateurs</Typography>
          <Typography variant="body2" color="text.secondary">
            Vue administrateur - Tous les comptes
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TableContainer component={Paper} sx={{ maxHeight: 400, overflowY: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Utilisateur</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Rôle</strong></TableCell>
                  <TableCell><strong>Créé le</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={user.role === 'admin' ? 'error' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewPassword(user)}
                        title="Voir le mot de passe (hash)"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedUser(user);
                          setResetDialogOpen(true);
                        }}
                        title="Réinitialiser le mot de passe"
                      >
                        <LockResetIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de réinitialisation de mot de passe */}
      <ConfirmDialog 
        open={resetDialogOpen} 
        onClose={() => {
          setResetDialogOpen(false);
          setNewPassword('');
          setSelectedUser(null);
        }}
      >
        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Définir un nouveau mot de passe pour <strong>{selectedUser?.username}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            label="Nouveau mot de passe"
            margin="normal"
            helperText="Au moins 6 caractères"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setResetDialogOpen(false);
            setNewPassword('');
            setSelectedUser(null);
          }}>
            Annuler
          </Button>
          <Button 
            onClick={handleResetPassword} 
            variant="contained"
            disabled={newPassword.length < 6}
          >
            Réinitialiser
          </Button>
        </DialogActions>
      </ConfirmDialog>

      {/* Dialog pour voir le mot de passe (hash) */}
      <ConfirmDialog 
        open={passwordDialogOpen} 
        onClose={() => {
          setPasswordDialogOpen(false);
          setPasswordHash('');
          setSelectedUser(null);
        }}
      >
        <DialogTitle>Mot de passe de {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Le mot de passe est crypté avec BCrypt. Utilisez "Réinitialiser" pour définir un nouveau mot de passe.
          </Alert>
          <Typography variant="body2" sx={{ 
            fontFamily: 'monospace', 
            wordBreak: 'break-all',
            bgcolor: '#f5f5f5',
            p: 2,
            borderRadius: 1
          }}>
            {passwordHash}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialogOpen(false);
            setPasswordHash('');
            setSelectedUser(null);
          }}>
            Fermer
          </Button>
        </DialogActions>
      </ConfirmDialog>
    </>
  );
};

export default AdminUsersDialog;
