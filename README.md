# DiscGolf Course Mapper

Une application web moderne pour créer et gérer des parcours de disc golf, similaire à UDisc MapManager.

## 🎯 Fonctionnalités

### ✅ Implémentées
- Interface utilisateur avec Material-UI
- Carte interactive avec Leaflet et OpenStreetMap
- Barre latérale avec outils de création
- Structure de base pour les trous de parcours

### 🚧 En développement
- Outils de placement (tees, paniers, zones OB/hazard)
- Système de dessin interactif
- Calculs de distance automatiques
- Export vers différents formats (GeoJSON, KML, GPX, CSV)
- Sauvegarde locale des parcours

## 🛠 Technologies Utilisées

- **React 18** avec TypeScript
- **Vite** comme outil de build
- **Material-UI (MUI)** pour l'interface utilisateur
- **Leaflet** pour la cartographie
- **React-Leaflet** pour l'intégration React/Leaflet
- **Turf.js** pour les calculs géospatiaux
- **File-Saver** pour l'export de fichiers

## 🚀 Installation et Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build de production
npm run preview
```

L'application sera disponible sur `http://localhost:3000`

## 📁 Structure du Projet

```
src/
├── components/
│   ├── MapComponent.tsx    # Composant carte principal
│   └── Sidebar.tsx         # Barre latérale avec outils
├── App.tsx                 # Composant principal
├── main.tsx               # Point d'entrée
└── index.css              # Styles globaux
```

## 🎮 Utilisation

1. **Visualisation de la carte** : Naviguez sur la carte avec zoom et panoramique
2. **Outils de création** : Utilisez la barre latérale pour placer des éléments
3. **Gestion des trous** : Ajoutez et configurez les trous du parcours
4. **Export** : Sauvegardez et exportez vos parcours

## 🔧 Développement

### Scripts disponibles
- `npm run dev` : Serveur de développement
- `npm run build` : Build de production
- `npm run lint` : Vérification du code avec ESLint
- `npm run preview` : Aperçu du build de production

### Prochaines étapes
1. Implémentation des outils de dessin interactifs
2. Système de placement d'éléments sur la carte
3. Calculs de distance et mesures
4. Fonctionnalités d'export avancées
5. Tests unitaires et d'intégration

## 📝 Licence

Ce projet est sous licence MIT.

---

**DiscGolf Course Mapper** - Créé avec ❤️ pour la communauté du disc golf