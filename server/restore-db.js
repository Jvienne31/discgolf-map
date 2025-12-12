import Database from 'better-sqlite3';
import fetch from 'node-fetch';

const db = new Database('./courses.db');

// Extraire toutes les données
const users = db.prepare('SELECT * FROM users').all();
const courses = db.prepare('SELECT * FROM courses').all();

console.log(`📦 Extraction: ${users.length} utilisateurs, ${courses.length} parcours`);

// Demander le token JWT
console.log('\n🔐 Connectez-vous sur https://disc-golf-map.vercel.app');
console.log('Puis ouvrez la console (F12) et tapez: localStorage.getItem("token")');
console.log('\nCollez le token ci-dessous:\n');

const readline = await import('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Token JWT: ', async (token) => {
  try {
    console.log('\n🚀 Envoi vers Railway...');
    
    const response = await fetch('https://discgolf-api-production.up.railway.app/api/admin/restore-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.trim()}`
      },
      body: JSON.stringify({ users, courses })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Restauration réussie!');
      console.log(result);
    } else {
      console.error('❌ Erreur:', result);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    rl.close();
    db.close();
  }
});
