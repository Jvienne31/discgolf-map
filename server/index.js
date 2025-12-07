import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-session-secret-change-me';

// Vérifier que les secrets sont configurés
if (JWT_SECRET === 'fallback-secret-change-me' || SESSION_SECRET === 'fallback-session-secret-change-me') {
  console.warn('⚠️  ATTENTION: Utilisez un fichier .env avec des secrets sécurisés en production!');
}

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL // URL Vercel/Netlify en production
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // true en production avec HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// Initialiser la base de données SQLite
const db = new Database(join(__dirname, 'courses.db'));

// Créer les tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Initialiser les utilisateurs par défaut depuis les variables d'environnement
const initUsers = () => {
  const users = [
    { 
      username: process.env.DEFAULT_ADMIN_USERNAME || 'admin', 
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123', 
      role: 'admin' 
    },
    { 
      username: process.env.DEFAULT_USER1_USERNAME || 'user1', 
      password: process.env.DEFAULT_USER1_PASSWORD || 'changeme123', 
      role: 'user' 
    },
    { 
      username: process.env.DEFAULT_USER2_USERNAME || 'user2', 
      password: process.env.DEFAULT_USER2_PASSWORD || 'changeme123', 
      role: 'user' 
    }
  ];

  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  if (existingUsers.count === 0) {
    console.log('🔐 Initialisation des utilisateurs...');
    const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    
    users.forEach(user => {
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      insertUser.run(user.username, hashedPassword, user.role);
      console.log(`   ✅ Utilisateur créé: ${user.username} (${user.role})`);
    });
    
    console.log('⚠️  IMPORTANT: Changez les mots de passe par défaut après la première connexion!');
  }
};

initUsers();

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const token = req.session.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Middleware admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé - Admin uniquement' });
  }
  next();
};

// Routes d'authentification

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiants requis' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    
    const validPassword = bcrypt.compareSync(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    req.session.token = token;
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Déconnexion réussie' });
});

// GET /api/auth/me - Vérifier la session
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// POST /api/auth/change-password - Changer son mot de passe
app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }
    
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    
    const validPassword = bcrypt.compareSync(currentPassword, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
    
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/update-email - Modifier son email
app.post('/api/auth/update-email', authenticateToken, (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email valide requis' });
    }
    
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.user.id);
    
    res.json({ message: 'Email modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification de l\'email:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes admin

// GET /api/admin/users - Liste tous les utilisateurs (admin uniquement)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users').all();
    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/users/:id/password - Voir le mot de passe d'un utilisateur (admin uniquement)
app.get('/api/admin/users/:id/password', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT username, password FROM users WHERE id = ?').get(id);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Note: En production, ne JAMAIS renvoyer le hash. C'est une exception pour votre besoin spécifique.
    res.json({ 
      username: user.username,
      passwordHash: user.password,
      note: 'Hash BCrypt - utilisez reset-password pour définir un nouveau mot de passe'
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/users/:id/reset-password - Réinitialiser le mot de passe d'un utilisateur (admin uniquement)
app.post('/api/admin/users/:id/reset-password', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mot de passe valide requis (min 6 caractères)' });
    }
    
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
    
    res.json({ message: `Mot de passe de ${user.username} réinitialisé avec succès` });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/users/:id - Modifier un utilisateur (admin uniquement)
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;
    
    const updates = [];
    const values = [];
    
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role && ['admin', 'user'].includes(role)) {
      updates.push('role = ?');
      values.push(role);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' });
    }
    
    values.push(id);
    
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    res.json({ message: 'Utilisateur modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes API

// GET /api/courses - Récupérer tous les parcours
app.get('/api/courses', authenticateToken, (req, res) => {
  try {
    let courses;
    
    if (req.user.role === 'admin') {
      // Admin voit tous les parcours
      courses = db.prepare(`
        SELECT c.id, c.name, c.created_at, c.updated_at, u.username as owner
        FROM courses c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.updated_at DESC
      `).all();
    } else {
      // Utilisateur ne voit que ses parcours
      courses = db.prepare(`
        SELECT c.id, c.name, c.created_at, c.updated_at, u.username as owner
        FROM courses c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id = ?
        ORDER BY c.updated_at DESC
      `).all(req.user.id);
    }
    
    res.json(courses);
  } catch (error) {
    console.error('Erreur lors de la récupération des parcours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/courses/:id - Récupérer un parcours spécifique
app.get('/api/courses/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    
    if (!course) {
      return res.status(404).json({ error: 'Parcours non trouvé' });
    }
    
    // Vérifier les permissions
    if (req.user.role !== 'admin' && course.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    // Parser les données JSON
    const courseData = {
      id: course.id,
      name: course.name,
      user_id: course.user_id,
      ...JSON.parse(course.data),
      created_at: course.created_at,
      updated_at: course.updated_at
    };
    
    res.json(courseData);
  } catch (error) {
    console.error('Erreur lors de la récupération du parcours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/courses - Créer un nouveau parcours
app.post('/api/courses', authenticateToken, (req, res) => {
  try {
    const { id, name, ...courseData } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ error: 'ID et nom requis' });
    }
    
    const dataJson = JSON.stringify(courseData);
    
    const stmt = db.prepare(`
      INSERT INTO courses (id, name, user_id, data)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, name, req.user.id, dataJson);
    
    res.status(201).json({ id, name, message: 'Parcours créé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création du parcours:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'Un parcours avec cet ID existe déjà' });
    } else {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
});

// PUT /api/courses/:id - Mettre à jour un parcours
app.put('/api/courses/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { name, ...courseData } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nom requis' });
    }
    
    // Vérifier que l'utilisateur a le droit de modifier ce parcours
    const course = db.prepare('SELECT user_id FROM courses WHERE id = ?').get(id);
    
    if (!course) {
      return res.status(404).json({ error: 'Parcours non trouvé' });
    }
    
    if (req.user.role !== 'admin' && course.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const dataJson = JSON.stringify(courseData);
    
    const stmt = db.prepare(`
      UPDATE courses 
      SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(name, dataJson, id);
    
    res.json({ id, name, message: 'Parcours mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du parcours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/courses/:id - Supprimer un parcours
app.delete('/api/courses/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier les permissions
    const course = db.prepare('SELECT user_id FROM courses WHERE id = ?').get(id);
    
    if (!course) {
      return res.status(404).json({ error: 'Parcours non trouvé' });
    }
    
    if (req.user.role !== 'admin' && course.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const stmt = db.prepare('DELETE FROM courses WHERE id = ?');
    stmt.run(id);
    
    res.json({ message: 'Parcours supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du parcours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
  console.log(`📊 Base de données: ${join(__dirname, 'courses.db')}`);
});

// Fermer proprement la base de données à l'arrêt
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
