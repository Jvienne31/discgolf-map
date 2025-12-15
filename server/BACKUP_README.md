# Instructions pour planifier le backup quotidien

## Méthode 1 : Planificateur de tâches Windows (Recommandé)

1. **Ouvrir le Planificateur de tâches** :
   - Appuie sur `Win + R`
   - Tape : `taskschd.msc`
   - Appuie sur Entrée

2. **Créer une tâche** :
   - Clique sur "Créer une tâche de base..." (panneau droit)
   - Nom : `Backup DiscGolf DB`
   - Description : `Sauvegarde quotidienne de la base PostgreSQL`
   - Cliquer sur Suivant

3. **Déclencheur** :
   - Sélectionne "Tous les jours"
   - Choisis l'heure (ex: 03:00 du matin)
   - Suivant

4. **Action** :
   - Sélectionne "Démarrer un programme"
   - Programme : `powershell.exe`
   - Arguments : `-ExecutionPolicy Bypass -File "C:\discgolf-map\server\backup-daily.ps1"`
   - Suivant

5. **Terminer** :
   - Coche "Ouvrir la boîte de dialogue Propriétés..."
   - Cliquer sur Terminer

6. **Configuration avancée** :
   - Onglet "Général" :
     * Coche "Exécuter même si l'utilisateur n'est pas connecté"
     * Coche "Exécuter avec les autorisations maximales"
   - Onglet "Conditions" :
     * Décoche "Démarrer uniquement si l'ordinateur est relié au secteur" (si portable)
   - OK

## Méthode 2 : Test manuel

Pour tester maintenant :

```powershell
cd C:\discgolf-map\server
.\backup-daily.ps1
```

## Vérification

- Backups créés dans : `C:\discgolf-map\server\backups\`
- Format : `discgolf_YYYY-MM-DD-HH-MM-SS.sql`
- Les 10 derniers sont gardés automatiquement

## Restauration (si nécessaire)

```powershell
# Installer PostgreSQL client si pas déjà fait
winget install PostgreSQL.PostgreSQL.17

# Restaurer un backup
psql "DATABASE_URL" < backups\discgolf_2025-12-15-22-44-11.sql
```

## Désactiver le backup automatique

Dans le Planificateur de tâches :
- Trouve "Backup DiscGolf DB"
- Clic droit → Désactiver ou Supprimer
