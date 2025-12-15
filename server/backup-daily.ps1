# Script de backup quotidien PostgreSQL Railway
# Garde les 10 dernières sauvegardes

$ErrorActionPreference = "Stop"

# Configuration
$DATABASE_URL = "postgresql://postgres:rcOZMtiqsABbEUCrykFMkmFafqybHPiH@mainline.proxy.rlwy.net:39412/railway"
$BACKUP_DIR = "$PSScriptRoot\backups"
$MAX_BACKUPS = 10

Write-Host "Backup quotidien - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# Créer le dossier backups si nécessaire
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

try {
    # Lancer le backup
    Write-Host "Creation du backup..." -ForegroundColor Yellow
    node "$PSScriptRoot\backup-database.js" $DATABASE_URL
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur lors du backup"
    }
    
    # Nettoyer les anciens backups
    Write-Host "`nNettoyage des anciens backups..." -ForegroundColor Yellow
    $backups = Get-ChildItem -Path $BACKUP_DIR -Filter "discgolf_*.sql" | 
               Sort-Object LastWriteTime -Descending
    
    $backupCount = $backups.Count
    Write-Host "   Backups trouvés: $backupCount" -ForegroundColor Gray
    
    if ($backupCount -gt $MAX_BACKUPS) {
        $toDelete = $backups | Select-Object -Skip $MAX_BACKUPS
        foreach ($file in $toDelete) {
            Remove-Item $file.FullName -Force
            Write-Host "   Supprime: $($file.Name)" -ForegroundColor Red
        }
        Write-Host "   $($toDelete.Count) ancien(s) backup(s) supprime(s)" -ForegroundColor Green
    } else {
        Write-Host "   Pas de nettoyage necessaire" -ForegroundColor Gray
    }
    
    # Afficher les backups restants
    Write-Host "`n[Backups disponibles]" -ForegroundColor Cyan
    $backups = Get-ChildItem -Path $BACKUP_DIR -Filter "discgolf_*.sql" | 
               Sort-Object LastWriteTime -Descending
    foreach ($file in $backups) {
        $size = [math]::Round($file.Length / 1KB, 2)
        $date = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
        Write-Host "   - $($file.Name) - ${size} KB - $date" -ForegroundColor White
    }
    
    Write-Host "`nBackup quotidien termine avec succes!" -ForegroundColor Green
    exit 0
    
} catch {
    Write-Host "`nErreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
