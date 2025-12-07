import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialiser la base de données SQLite
const db = new Database(join(__dirname, 'courses.db'));

// Créer la table si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Routes API

// GET /api/courses - Récupérer tous les parcours
app.get('/api/courses', (req, res) => {
  try {
    const courses = db.prepare('SELECT id, name, created_at, updated_at FROM courses ORDER BY updated_at DESC').all();
    res.json(courses);
  } catch (error) {
    console.error('Erreur lors de la récupération des parcours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/courses/:id - Récupérer un parcours spécifique
app.get('/api/courses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    
    if (!course) {
      return res.status(404).json({ error: 'Parcours non trouvé' });
    }
    
    // Parser les données JSON
    const courseData = {
      id: course.id,
      name: course.name,
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
app.post('/api/courses', (req, res) => {
  try {
    const { id, name, ...courseData } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ error: 'ID et nom requis' });
    }
    
    const dataJson = JSON.stringify(courseData);
    
    const stmt = db.prepare(`
      INSERT INTO courses (id, name, data)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(id, name, dataJson);
    
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
app.put('/api/courses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, ...courseData } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nom requis' });
    }
    
    const dataJson = JSON.stringify(courseData);
    
    const stmt = db.prepare(`
      UPDATE courses 
      SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(name, dataJson, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Parcours non trouvé' });
    }
    
    res.json({ id, name, message: 'Parcours mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du parcours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/courses/:id - Supprimer un parcours
app.delete('/api/courses/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM courses WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Parcours non trouvé' });
    }
    
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
