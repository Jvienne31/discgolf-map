import * as L from 'leaflet';

/**
 * Capture une image de la carte via le serveur Puppeteer
 * @param map Instance de la carte Leaflet
 * @param bounds Optionnel: bounds spécifiques à capturer
 * @param elements Optionnel: éléments à dessiner sur la carte (tee, basket, etc.)
 * @returns Promise avec l'image en base64
 */
export const captureMapImage = async (
  map: L.Map,
  bounds?: L.LatLngBounds,
  elements?: Array<any>
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const originalBounds = map.getBounds();
      const targetBounds = bounds || originalBounds;
      
      if (bounds) {
        map.fitBounds(bounds, { padding: [50, 50], animate: false });
      }

      // Attendre que la carte soit bien rendue
      await new Promise(r => setTimeout(r, 1000));

      try {
        console.log('📸 Envoi requête capture au serveur Puppeteer...');
        
        const size = map.getSize();
        
        // Appeler l'API backend pour la capture
        const response = await fetch('http://localhost:3001/api/capture-map', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bounds: {
              _southWest: {
                lat: targetBounds.getSouthWest().lat,
                lng: targetBounds.getSouthWest().lng
              },
              _northEast: {
                lat: targetBounds.getNorthEast().lat,
                lng: targetBounds.getNorthEast().lng
              }
            },
            width: size.x,
            height: size.y,
            elements: elements || []
          })
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.image) {
          throw new Error('Réponse invalide du serveur');
        }

        console.log('✅ Capture reçue du serveur');
        
        // Restaurer la vue originale
        if (bounds && originalBounds) {
          setTimeout(() => {
            map.fitBounds(originalBounds, { animate: false });
          }, 100);
        }
        
        resolve(data.image);
      } catch (error) {
        console.error('❌ Erreur capture serveur:', error);
        
        // Fallback: créer une image placeholder
        console.log('⚠️ Fallback sur placeholder');
        const placeholderCanvas = document.createElement('canvas');
        const size = map.getSize();
        placeholderCanvas.width = size.x;
        placeholderCanvas.height = size.y;
        const ctx = placeholderCanvas.getContext('2d');
        
        if (ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 0, placeholderCanvas.height);
          gradient.addColorStop(0, '#e3f2fd');
          gradient.addColorStop(1, '#bbdefb');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, placeholderCanvas.width, placeholderCanvas.height);
          
          ctx.fillStyle = '#1976d2';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Vue de la carte', placeholderCanvas.width / 2, placeholderCanvas.height / 2 - 20);
          
          ctx.font = '16px Arial';
          ctx.fillStyle = '#666';
          ctx.fillText('(Capture temporairement indisponible)', placeholderCanvas.width / 2, placeholderCanvas.height / 2 + 20);
        }
        
        resolve(placeholderCanvas.toDataURL('image/png'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Calcule les bounds pour un trou spécifique avec orientation tee en bas
 * @param teePosition Position du tee
 * @param basketPosition Position du panier
 * @param allElements Tous les éléments du trou pour inclure OB, hazards, etc.
 * @returns Bounds calculés
 */
export const calculateHoleBounds = (
  teePosition: { lat: number; lng: number } | undefined,
  basketPosition: { lat: number; lng: number } | undefined,
  allElements: Array<{ position?: { lat: number; lng: number }; path?: Array<{ lat: number; lng: number }> }>
): L.LatLngBounds | null => {
  if (!teePosition || !basketPosition) return null;

  const points: L.LatLngExpression[] = [
    [teePosition.lat, teePosition.lng],
    [basketPosition.lat, basketPosition.lng],
  ];

  // Ajouter tous les autres points du trou
  allElements.forEach(el => {
    if (el.position) {
      points.push([el.position.lat, el.position.lng]);
    }
    if (el.path && el.path.length > 0) {
      el.path.forEach(p => points.push([p.lat, p.lng]));
    }
  });

  return L.latLngBounds(points);
};

/**
 * Calcule les bounds pour tout le parcours
 */
export const calculateCourseBounds = (
  holes: Array<{
    elements: Array<{
      position?: { lat: number; lng: number };
      path?: Array<{ lat: number; lng: number }>;
    }>;
  }>
): L.LatLngBounds | null => {
  const points: L.LatLngExpression[] = [];

  holes.forEach(hole => {
    hole.elements.forEach(el => {
      if (el.position) {
        points.push([el.position.lat, el.position.lng]);
      }
      if (el.path && el.path.length > 0) {
        el.path.forEach(p => points.push([p.lat, p.lng]));
      }
    });
  });

  if (points.length === 0) return null;

  return L.latLngBounds(points);
};
