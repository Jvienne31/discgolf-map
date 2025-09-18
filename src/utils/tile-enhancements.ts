// Utilitaires pour améliorer le scaling des tuiles Leaflet

/**
 * Applique des améliorations visuelles aux tuiles scalées
 * @param tile - L'élément IMG de la tuile
 * @param isScaled - Si la tuile est scalée (au-delà du zoom natif)
 */
export function enhanceTileRendering(tile: HTMLImageElement, isScaled: boolean = false) {
  if (isScaled) {
    // Rendu pixellisé net pour les tuiles scalées
    tile.style.imageRendering = 'pixelated';
    tile.style.filter = 'contrast(1.05) saturate(1.05) brightness(1.02)';
  } else {
    // Rendu optimisé pour les tuiles natives
    tile.style.imageRendering = 'auto';
    tile.style.filter = 'none';
  }
}

/**
 * Calcule les coordonnées de la tuile parent pour le scaling
 * @param coord - Coordonnées de la tuile courante {x, y, z}
 * @param targetZoom - Niveau de zoom cible (généralement maxNativeZoom)
 * @returns Coordonnées de la tuile parent
 */
export function getParentTileCoords(coord: {x: number, y: number, z: number}, targetZoom: number) {
  const zoomDiff = coord.z - targetZoom;
  return {
    x: Math.floor(coord.x / Math.pow(2, zoomDiff)),
    y: Math.floor(coord.y / Math.pow(2, zoomDiff)),
    z: targetZoom
  };
}

/**
 * Construit l'URL d'une tuile avec les coordonnées données
 * @param template - Template d'URL avec {x}, {y}, {z}, {s}
 * @param coord - Coordonnées de la tuile
 * @param subdomains - Sous-domaines disponibles
 * @returns URL complète de la tuile
 */
export function buildTileUrl(
  template: string, 
  coord: {x: number, y: number, z: number}, 
  subdomains?: string
): string {
  let url = template
    .replace('{z}', coord.z.toString())
    .replace('{x}', coord.x.toString())
    .replace('{y}', coord.y.toString());
    
  if (subdomains && template.includes('{s}')) {
    const subdomain = subdomains[Math.abs(coord.x + coord.y) % subdomains.length];
    url = url.replace('{s}', subdomain);
  }
  
  return url;
}

/**
 * Initialise les améliorations globales pour le rendu des tuiles
 */
export function initializeTileEnhancements() {
  // Ajouter les styles CSS globaux pour le rendu pixellisé
  const style = document.createElement('style');
  style.textContent = `
    .leaflet-tile {
      transition: opacity 0.2s ease-in-out !important;
    }
    
    .leaflet-tile-error {
      background: transparent !important;
      border: none !important;
      opacity: 0 !important;
    }
    
    .leaflet-zoom-anim .leaflet-tile {
      image-rendering: pixelated !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Force le rechargement des tuiles pour un meilleur scaling
 * @param map - Instance de la carte Leaflet
 */
export function refreshTilesForScaling(map: any) {
  map.eachLayer((layer: any) => {
    if (layer._url) { // C'est une TileLayer
      layer.redraw();
    }
  });
}