// Configuration de l'application
export const config = {
  // URL de l'API backend
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  
  // Mode de développement
  isDevelopment: import.meta.env.DEV,
  
  // Mode de production
  isProduction: import.meta.env.PROD,
};
