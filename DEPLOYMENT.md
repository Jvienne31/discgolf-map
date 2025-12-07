# Guide de déploiement - DiscGolf Course Mapper

## 🎯 Architecture d'hébergement gratuit

**Backend** : Render.com (API + SQLite)  
**Frontend** : Vercel ou Netlify (React)

---

## 📦 ÉTAPE 1 : Déployer le Backend sur Render.com

### 1.1 Créer un compte Render.com
1. Allez sur https://render.com
2. Inscrivez-vous avec votre compte GitHub
3. Connectez votre repository `discgolf-map`

### 1.2 Créer un nouveau Web Service
1. Dans le dashboard Render, cliquez **"New +"** → **"Web Service"**
2. Sélectionnez le repository `Jvienne31/discgolf-map`
3. Configurez :
   - **Name** : `discgolf-api`
   - **Runtime** : `Node`
   - **Build Command** : `cd server && npm install`
   - **Start Command** : `cd server && npm start`
   - **Plan** : `Free` (750h/mois)

### 1.3 Configurer les variables d'environnement
Dans l'onglet **"Environment"**, ajoutez ces variables :

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
```

⚠️ **IMPORTANT** : Changez les mots de passe par défaut !

### 1.4 Ajouter un disque persistant
1. Dans l'onglet **"Disks"**, cliquez **"Add Disk"**
2. Configurez :
   - **Name** : `discgolf-db`
   - **Mount Path** : `/opt/render/project/src/server`
   - **Size** : `1 GB` (gratuit)

Cela permet de conserver la base de données SQLite entre les redémarrages.

### 1.5 Déployer
1. Cliquez **"Create Web Service"**
2. Attendez 2-3 minutes que le déploiement se termine
3. Notez l'URL de votre API : `https://discgolf-api.onrender.com`

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
VITE_API_URL=https://discgolf-api.onrender.com
```

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
   VITE_API_URL=https://discgolf-api.onrender.com
   ```

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

### Render.com
- ✅ 750h/mois (suffisant pour 1 projet)
- ⚠️ Le service "dort" après 15 min d'inactivité
- ⚠️ Redémarre en ~30 secondes à la première requête
- ✅ 1 GB de stockage disque gratuit

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
1. **Render** : Reconstruction et redéploiement du backend
2. **Vercel/Netlify** : Reconstruction et redéploiement du frontend

---

## 📝 Prochaines étapes recommandées

1. ✅ Changez les mots de passe par défaut dans les variables d'environnement Render
2. ✅ Testez l'authentification sur l'application déployée
3. ✅ Importez un parcours KML pour vérifier la persistance de la base de données
4. 🔒 Ajoutez CORS dans `server/index.js` pour n'autoriser que votre domaine Vercel
5. 📊 Configurez les analytics (optionnel)

---

## 🆘 Dépannage

### Le backend ne démarre pas sur Render
- Vérifiez les logs dans l'onglet "Logs"
- Assurez-vous que toutes les variables d'environnement sont définies
- Vérifiez que le disque est bien monté

### Le frontend ne peut pas contacter l'API
- Vérifiez que `VITE_API_URL` est bien configuré
- Vérifiez les logs CORS dans la console du navigateur
- Testez l'API directement : `https://discgolf-api.onrender.com/api/health`

### La base de données est réinitialisée
- Vérifiez que le disque persistant est bien configuré sur Render
- Le path doit être `/opt/render/project/src/server`

---

Besoin d'aide ? Consultez la documentation :
- Render : https://render.com/docs
- Vercel : https://vercel.com/docs
- Netlify : https://docs.netlify.com
