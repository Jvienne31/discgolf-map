# Guide de déploiement - DiscGolf Course Mapper

## 🎯 Architecture d'hébergement gratuit

**Backend** : Railway.app (API + SQLite)  
**Frontend** : Vercel ou Netlify (React)

---

## 📦 ÉTAPE 1 : Déployer le Backend sur Railway.app

### 1.1 Créer un compte Railway.app
1. Allez sur https://railway.app
2. Cliquez **"Login"** → **"Login with GitHub"**
3. Autorisez Railway à accéder à votre compte GitHub
4. ✅ **Aucune carte bancaire requise** pour les 5$ gratuits !

### 1.2 Créer un nouveau projet
1. Dans le dashboard Railway, cliquez **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Choisissez le repository `Jvienne31/discgolf-map`
4. Railway détectera automatiquement Node.js

### 1.3 Configurer les variables d'environnement
1. Cliquez sur votre service déployé
2. Allez dans l'onglet **"Variables"**
3. Cliquez **"New Variable"** et ajoutez ces variables **UNE PAR UNE** :

```
NODE_ENV=production
JWT_SECRET=0b6e668423bd048f2866b1ff56ffa97503c80d78014d97c059c6edead404eb88f1b3167216a8100c7b8c297f53670afb07c41b9eb0f53dac5e23dd6f0e9a27d5
SESSION_SECRET=9e38c885d57a8c66c7d5368c9988c45ac634d5e230855c796a25130b98620d2602ad7cfa25305911a72e71c02bbb4e80559d45426f675647cfb9275e5a77101c
DEFAULT_ADMIN_USERNAME=Jvienne31
DEFAULT_ADMIN_PASSWORD=ChoisissezUnMotDePasseSecurise123!
DEFAULT_USER1_USERNAME=SpaceDisc
DEFAULT_USER1_PASSWORD=AutreMotDePasseSecurise456!
DEFAULT_USER2_USERNAME=LBsport
DEFAULT_USER2_PASSWORD=EncoreUnAutreMotDePasse789!
PORT=3001
```

⚠️ **IMPORTANT** : Changez les mots de passe par défaut !

### 1.4 Configurer un domaine public
1. Dans l'onglet **"Settings"**
2. Section **"Networking"** → **"Public Networking"**
3. Cliquez **"Generate Domain"**
4. Railway va créer une URL type : `https://discgolf-api.up.railway.app`
5. ✅ Notez cette URL pour l'étape suivante !

### 1.5 Vérifier le stockage persistant
✅ Railway **persiste automatiquement** les fichiers dans le système de fichiers !
- Votre base SQLite `courses.db` sera conservée entre les redémarrages
- Pas besoin de configurer un volume supplémentaire
- Le stockage est **illimité** sur Railway

### 1.6 Déployer
1. Railway déploie **automatiquement** dès que vous pushez sur GitHub
2. Attendez 2-3 minutes que le déploiement se termine
3. Vérifiez les logs dans l'onglet **"Deployments"**
4. Testez votre API : `https://votre-app.up.railway.app/api/health`

---

## 🌐 ÉTAPE 2 : Déployer le Frontend sur Vercel

### 2.1 Créer un compte Vercel
1. Allez sur https://vercel.com
2. Inscrivez-vous avec votre compte GitHub

### 2.2 Importer le projet
1. Cliquez **"Add New..."** → **"Project"**
2. Sélectionnez `Jvienne31/discgolf-map`
3. Configurez :
   - **Framework Preset** : `Vite`
   - **Root Directory** : `./` (racine)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

### 2.3 Configurer l'API URL
Dans **"Environment Variables"**, ajoutez :
```
VITE_API_URL=https://votre-app.up.railway.app
```
(Remplacez par l'URL générée par Railway à l'étape 1.4)

### 2.4 Déployer
1. Cliquez **"Deploy"**
2. Attendez 1-2 minutes
3. Votre site sera disponible sur : `https://discgolf-map.vercel.app`

---

## 🔄 Alternative : Netlify (au lieu de Vercel)

### Option A : Via l'interface web
1. Allez sur https://netlify.com
2. **"Add new site"** → **"Import an existing project"**
3. Connectez GitHub et sélectionnez `discgolf-map`
4. Build settings :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
5. Environment variables :
   ```
   VITE_API_URL=https://votre-app.up.railway.app
   ```
   (Remplacez par l'URL générée par Railway)

### Option B : Via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

## 🔧 ÉTAPE 3 : Configurer l'API URL dans le frontend

Vous devez mettre à jour votre code frontend pour utiliser l'URL de production :

**Fichier à modifier** : `src/main.tsx` ou créez `src/config.ts`

```typescript
// src/config.ts
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

Puis dans vos appels API, utilisez `API_URL` au lieu de `http://localhost:3001`.

---

## ⚠️ Limitations du plan gratuit

### Railway.app
- ✅ **5$ de crédit gratuit par mois** (pas de carte bancaire requise)
- ✅ **~500h d'exécution** ou ~20 jours complets
- ✅ **Stockage illimité** pour SQLite
- ✅ **Pas de mise en veille** contrairement à Render
- ✅ **Données persistantes** entre les redémarrages
- 💡 Coût réel : ~3-4$/mois pour usage typique (largement dans les 5$ gratuits)

### Vercel
- ✅ Bande passante illimitée
- ✅ 100 GB/mois de bandwidth
- ✅ Pas de mise en veille
- ✅ Déploiement instantané depuis GitHub

### Netlify
- ✅ 100 GB/mois de bandwidth
- ✅ 300 build minutes/mois
- ✅ Pas de mise en veille

---

## 🚀 Automatisation : Déploiement continu

Une fois configuré, chaque `git push` déclenchera automatiquement :
1. **Railway** : Reconstruction et redéploiement du backend (en ~2 min)
2. **Vercel/Netlify** : Reconstruction et redéploiement du frontend (en ~1 min)

✅ Déploiement entièrement automatisé sans configuration supplémentaire !

---

## 📝 Prochaines étapes recommandées

1. ✅ Changez les mots de passe par défaut dans les variables d'environnement Render
2. ✅ Testez l'authentification sur l'application déployée
3. ✅ Importez un parcours KML pour vérifier la persistance de la base de données
4. 🔒 Ajoutez CORS dans `server/index.js` pour n'autoriser que votre domaine Vercel
5. 📊 Configurez les analytics (optionnel)

---

## 🆘 Dépannage

### Le backend ne démarre pas sur Railway
- Vérifiez les logs dans l'onglet **"Deployments"** → Cliquez sur le dernier déploiement
- Assurez-vous que toutes les variables d'environnement sont définies dans l'onglet **"Variables"**
- Vérifiez que le port 3001 est bien défini dans les variables
- Railway détecte automatiquement Node.js, pas besoin de configuration build

### Le frontend ne peut pas contacter l'API
- Vérifiez que `VITE_API_URL` pointe vers votre domaine Railway (ex: `https://xxx.up.railway.app`)
- Vérifiez que CORS est bien configuré dans `server/index.js` (déjà fait ✅)
- Testez l'API directement : `https://votre-app.up.railway.app/api/health`
- Regardez les logs dans la console du navigateur (F12)

### La base de données semble vide après redémarrage
- ✅ Railway persiste automatiquement le système de fichiers
- La base SQLite `courses.db` devrait être conservée
- Si problème : Vérifiez les logs pour voir si le fichier est créé au bon endroit
- Le fichier doit être dans `server/courses.db`

### L'application consomme trop de crédits Railway
- Vérifiez le temps d'exécution dans **"Metrics"**
- Si vous dépassez 5$/mois, Railway facture automatiquement (0.000231$/h)
- Solution : Réduire le nombre de requêtes ou optimiser le code

---

Besoin d'aide ? Consultez la documentation :
- Railway : https://docs.railway.app
- Vercel : https://vercel.com/docs
- Netlify : https://docs.netlify.com
