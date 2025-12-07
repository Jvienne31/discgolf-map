import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'courses.db'));

console.log('🔄 Migration: Ajout du champ email...\n');

try {
  // Vérifier si la colonne email existe déjà
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasEmail = tableInfo.some(col => col.name === 'email');

  if (!hasEmail) {
    console.log('📧 Ajout de la colonne email...');
    
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT;`);
    
    // Ajouter des emails par défaut pour les utilisateurs existants
    const users = db.prepare('SELECT id, username FROM users').all();
    
    const updateEmail = db.prepare('UPDATE users SET email = ? WHERE id = ?');
    
    for (const user of users) {
      const email = `${user.username.toLowerCase()}@discgolf-mapper.local`;
      updateEmail.run(email, user.id);
      console.log(`  ✅ ${user.username} -> ${email}`);
    }
    
    console.log('\n✅ Migration terminée avec succès !');
  } else {
    console.log('✅ La colonne email existe déjà, aucune migration nécessaire.');
  }
  
  // Afficher le résumé
  const users = db.prepare('SELECT id, username, email, role FROM users').all();
  
  console.log('\n👥 Utilisateurs dans la base de données:');
  users.forEach(u => {
    console.log(`  - ${u.username} (${u.role}) - ${u.email}`);
  });
  
} catch (error) {
  console.error('❌ Erreur lors de la migration:', error);
  process.exit(1);
} finally {
  db.close();
}
