import Database from 'better-sqlite3';
import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const dbPath = process.env.DATABASE_PATH || join(dirname(new URL(import.meta.url).pathname), 'courses.db');
const backupDir = process.env.BACKUP_PATH || join(dirname(dbPath), 'backups');
const MAX_BACKUPS = 7; // Garder les 7 derniers backups

function createBackup() {
  try {
    // Créer le dossier de backup s'il n'existe pas
    mkdirSync(backupDir, { recursive: true });

    // Générer le nom du fichier backup avec timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeOfDay = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupFileName = `courses-backup-${timestamp}-${timeOfDay}.db`;
    const backupPath = join(backupDir, backupFileName);

    // Copier la base de données
    console.log(`📦 Création du backup: ${backupFileName}`);
    copyFileSync(dbPath, backupPath);

    // Vérifier l'intégrité du backup
    const backupDb = new Database(backupPath, { readonly: true });
    const userCount = backupDb.prepare('SELECT COUNT(*) as count FROM users').get();
    const courseCount = backupDb.prepare('SELECT COUNT(*) as count FROM courses').get();
    backupDb.close();

    console.log(`✅ Backup réussi: ${userCount.count} utilisateurs, ${courseCount.count} parcours`);

    // Nettoyer les vieux backups
    cleanOldBackups();

    return backupPath;
  } catch (error) {
    console.error('❌ Erreur lors du backup:', error);
    throw error;
  }
}

function cleanOldBackups() {
  try {
    // Lister tous les fichiers de backup
    const files = readdirSync(backupDir)
      .filter(f => f.startsWith('courses-backup-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: join(backupDir, f),
        time: statSync(join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Plus récent en premier

    // Supprimer les backups au-delà de MAX_BACKUPS
    if (files.length > MAX_BACKUPS) {
      console.log(`🧹 Nettoyage des anciens backups (garder ${MAX_BACKUPS})`);
      files.slice(MAX_BACKUPS).forEach(file => {
        console.log(`   Suppression: ${file.name}`);
        unlinkSync(file.path);
      });
    }
  } catch (error) {
    console.error('⚠️  Erreur lors du nettoyage des backups:', error);
  }
}

function listBackups() {
  try {
    const files = readdirSync(backupDir)
      .filter(f => f.startsWith('courses-backup-') && f.endsWith('.db'))
      .map(f => {
        const stats = statSync(join(backupDir, f));
        return {
          name: f,
          path: join(backupDir, f),
          size: (stats.size / 1024).toFixed(2) + ' KB',
          date: stats.mtime.toLocaleString()
        };
      })
      .sort((a, b) => statSync(b.path).mtime - statSync(a.path).mtime);

    return files;
  } catch (error) {
    console.error('❌ Erreur lors de la liste des backups:', error);
    return [];
  }
}

// Si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  createBackup();
}

export { createBackup, listBackups, cleanOldBackups };
