# Backend DiscGolf Course Mapper

## Installation

```bash
cd server
npm install
```

## Démarrage

```bash
npm run dev
```

Le serveur démarrera sur http://localhost:3001

## API Endpoints

- `GET /api/courses` - Liste tous les parcours
- `GET /api/courses/:id` - Récupère un parcours spécifique
- `POST /api/courses` - Crée un nouveau parcours
- `PUT /api/courses/:id` - Met à jour un parcours
- `DELETE /api/courses/:id` - Supprime un parcours

## Base de données

SQLite - fichier `courses.db` créé automatiquement dans le dossier server/
