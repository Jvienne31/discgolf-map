import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

async function backupDatabase() {
  // Récupérer l'URL depuis les variables d'environnement ou la passer en argument
  const databaseUrl = process.env.DATABASE_URL || process.argv[2];
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL non fournie');
    console.log('Usage: node backup-database.js "postgresql://user:pass@host:port/db"');
    console.log('   ou: DATABASE_URL="..." node backup-database.js');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  
  try {
    console.log('📦 Connexion à la base de données...');
    await client.connect();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = './backups';
    
    // Créer le dossier backups s'il n'existe pas
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    const backupFile = `${backupDir}/discgolf_${timestamp}.sql`;
    const stream = fs.createWriteStream(backupFile);
    
    console.log('📋 Récupération du schéma...\n');
    
    // Récupérer toutes les tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`📊 Tables trouvées: ${tables.join(', ')}\n`);
    
    // Header SQL
    stream.write('-- Backup créé le ' + new Date().toISOString() + '\n');
    stream.write('-- Base: discgolf\n\n');
    stream.write('SET statement_timeout = 0;\n');
    stream.write('SET lock_timeout = 0;\n');
    stream.write('SET client_encoding = \'UTF8\';\n\n');
    
    // Pour chaque table
    for (const table of tables) {
      console.log(`⏳ Export de ${table}...`);
      
      // Obtenir la structure de la table
      const structureResult = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      stream.write(`-- Table: ${table}\n`);
      stream.write(`DROP TABLE IF EXISTS ${table} CASCADE;\n`);
      
      // CREATE TABLE
      const columns = structureResult.rows.map(col => {
        let def = `  ${col.column_name} ${col.data_type}`;
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        return def;
      }).join(',\n');
      
      stream.write(`CREATE TABLE ${table} (\n${columns}\n);\n\n`);
      
      // Récupérer les données
      const dataResult = await client.query(`SELECT * FROM ${table}`);
      const rows = dataResult.rows;
      
      if (rows.length > 0) {
        console.log(`  ✅ ${rows.length} lignes`);
        
        const columnNames = Object.keys(rows[0]);
        
        for (const row of rows) {
          const values = columnNames.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          });
          
          stream.write(`INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`);
        }
        stream.write('\n');
      } else {
        console.log(`  ⚠️ 0 lignes`);
      }
    }
    
    // Récupérer les contraintes et index
    console.log('\n🔗 Export des contraintes...');
    const constraintsResult = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type
    `);
    
    stream.write('\n-- Contraintes\n');
    for (const constraint of constraintsResult.rows) {
      if (constraint.constraint_type === 'PRIMARY KEY') {
        stream.write(`ALTER TABLE ${constraint.table_name} ADD PRIMARY KEY (${constraint.column_name});\n`);
      } else if (constraint.constraint_type === 'FOREIGN KEY') {
        stream.write(`ALTER TABLE ${constraint.table_name} ADD CONSTRAINT ${constraint.constraint_name} FOREIGN KEY (${constraint.column_name}) REFERENCES ${constraint.foreign_table_name}(${constraint.foreign_column_name});\n`);
      }
    }
    
    stream.end();
    
    console.log(`\n✅ Backup créé: ${backupFile}`);
    console.log(`📦 Taille: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

backupDatabase();
