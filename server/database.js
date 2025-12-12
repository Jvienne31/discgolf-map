import Database from 'better-sqlite3';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Déterminer si on est en production avec PostgreSQL
const isProduction = !!process.env.DATABASE_URL;

let sqliteDb;
let pool;

// Wrapper qui émule l'API better-sqlite3 pour PostgreSQL
class PostgreSQLiteWrapper {
  constructor(pool) {
    this.pool = pool;
  }

  // Convertir ? en $1, $2, etc. pour PostgreSQL
  convertPlaceholders(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  prepare(sql) {
    const pgSql = this.convertPlaceholders(sql);
    
    return {
      get: async (...params) => {
        const result = await this.pool.query(pgSql, params);
        return result.rows[0];
      },
      all: async (...params) => {
        const result = await this.pool.query(pgSql, params);
        return result.rows;
      },
      run: async (...params) => {
        // Pour INSERT avec RETURNING id
        let querySQL = pgSql;
        if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
          querySQL = pgSql.replace(/;?\s*$/, ' RETURNING id');
        }
        
        try {
          const result = await this.pool.query(querySQL, params);
          return {
            lastInsertRowid: result.rows[0]?.id || result.rows[0]?.ID,
            changes: result.rowCount
          };
        } catch (error) {
          // Si RETURNING échoue (UPDATE/DELETE), retry sans RETURNING
          if (error.message.includes('RETURNING') || !querySQL.includes('RETURNING')) {
            const result = await this.pool.query(pgSql, params);
            return {
              lastInsertRowid: null,
              changes: result.rowCount
            };
          }
          throw error;
        }
      }
    };
  }

  async exec(sql) {
    // Convertir AUTOINCREMENT en SERIAL pour PostgreSQL
    sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    sql = sql.replace(/DATETIME/gi, 'TIMESTAMP');
    
    // Séparer les statements multiples
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await this.pool.query(statement);
      }
    }
  }

  close() {
    this.pool.end();
  }
}

async function initializeDatabase() {
  if (isProduction) {
    console.log('🐘 Utilisation de PostgreSQL (production)');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Créer le wrapper
    const db = new PostgreSQLiteWrapper(pool);
    
    // Initialiser les tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    console.log('✅ Tables PostgreSQL créées/vérifiées');
    return db;
    
  } else {
    console.log('📁 Utilisation de SQLite (local)');
    const dbPath = join(__dirname, 'courses.db');
    sqliteDb = new Database(dbPath);

    sqliteDb.exec(`
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
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    console.log('✅ Tables SQLite créées/vérifiées');
    return sqliteDb;
  }
}

export { initializeDatabase, isProduction };
