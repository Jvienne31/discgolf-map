import { readFileSync, writeFileSync } from 'fs';

// Lire le fichier
const filePath = './index.js';
let content = readFileSync(filePath, 'utf-8');

// Patterns à convertir
const conversions = [
  // Routes qui ne sont pas async
  {
    pattern: /app\.(get|post|put|delete|patch)\(([^,]+),\s*([^,)]+),?\s*\(req,\s*res\)\s*=>\s*{/g,
    replace: (match, method, path, middleware) => {
      if (middleware.includes('authenticateToken') || middleware.includes('requireAdmin')) {
        return `app.${method}(${path}, ${middleware}, async (req, res) => {`;
      }
      return `app.${method}(${path}, async (req, res) => {`;
    }
  },
  
  // db.prepare().get() -> await db.prepare().get()
  {
    pattern: /(\s+)(const|let|var)\s+(\w+)\s*=\s*db\.prepare\(([^)]+)\)\.get\(/g,
    replace: '$1$2 $3 = await db.prepare($4).get('
  },
  
  // db.prepare().all() -> await db.prepare().all()
  {
    pattern: /(\s+)(const|let|var)\s+(\w+)\s*=\s*db\.prepare\(([^)]+)\)\.all\(/g,
    replace: '$1$2 $3 = await db.prepare($4).all('
  },
  
  // db.prepare().run() simple -> await db.prepare().run()
  {
    pattern: /(\s+)db\.prepare\(([^)]+)\)\.run\(/g,
    replace: '$1await db.prepare($2).run('
  },
  
  // const stmt = db.prepare() suivi de stmt.run() sur plusieurs lignes
  {
    pattern: /(\s+)(const|let)\s+(stmt|insertUser|insertCourse|updateUser|updateCourse|deleteStmt)\s*=\s*db\.prepare\(/g,
    replace: '$1$2 $3 = db.prepare('
  }
];

// Appliquer les conversions
conversions.forEach(conv => {
  if (typeof conv.replace === 'function') {
    content = content.replace(conv.pattern, conv.replace);
  } else {
    content = content.replace(conv.pattern, conv.replace);
  }
});

// Sauvegarder
writeFileSync(filePath, content, 'utf-8');
console.log('✅ Conversion terminée !');
