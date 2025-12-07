import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'courses.db'));

console.log('🔄 Migration de la base de données...\n');

try {
  // Vérifier si la colonne user_id existe déjà
  const tableInfo = db.prepare("PRAGMA table_info(courses)").all();
  const hasUserId = tableInfo.some(col => col.name === 'user_id');

  if (!hasUserId) {
    console.log('📊 Ajout de la colonne user_id...');
    
    // Créer une nouvelle table avec la bonne structure
    db.exec(`
      CREATE TABLE courses_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL DEFAULT 1,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    
    // Copier les données existantes (assigner tous les parcours à l'admin par défaut)
    const existingCourses = db.prepare('SELECT * FROM courses').all();
    
    if (existingCourses.length > 0) {
      console.log(`📦 Migration de ${existingCourses.length} parcours existants vers l'admin...`);
      
      const insertStmt = db.prepare(`
        INSERT INTO courses_new (id, name, user_id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const course of existingCourses) {
        insertStmt.run(
          course.id,
          course.name,
          1, // Assigner à l'admin (id=1)
          course.data,
          course.created_at,
          course.updated_at
        );
        console.log(`  ✅ ${course.name}`);
      }
    }
    
    // Supprimer l'ancienne table et renommer la nouvelle
    db.exec(`
      DROP TABLE courses;
      ALTER TABLE courses_new RENAME TO courses;
    `);
    
    console.log('\n✅ Migration terminée avec succès !');
  } else {
    console.log('✅ La colonne user_id existe déjà, aucune migration nécessaire.');
  }
  
  // Afficher le résumé
  const courses = db.prepare(`
    SELECT c.id, c.name, u.username as owner 
    FROM courses c 
    JOIN users u ON c.user_id = u.id
  `).all();
  
  console.log('\n📋 Parcours dans la base de données:');
  if (courses.length > 0) {
    courses.forEach(c => {
      console.log(`  - ${c.name} (propriétaire: ${c.owner})`);
    });
  } else {
    console.log('  Aucun parcours');
  }
  
} catch (error) {
  console.error('❌ Erreur lors de la migration:', error);
  process.exit(1);
} finally {
  db.close();
}
