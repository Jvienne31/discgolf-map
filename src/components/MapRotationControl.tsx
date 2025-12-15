import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '../styles/map-rotation-control.css';

/**
 * Contrôle personnalisé pour la rotation de la carte Leaflet (style Google Maps)
 */
export function MapRotationControl() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Variable globale pour stocker l'angle actuel (attachée à la carte)
    (map as any)._rotationAngle = (map as any)._rotationAngle || 0;

    // Créer le contrôle de rotation
    const RotationControl = L.Control.extend({
      options: {
        position: 'bottomright'
      },

      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-rotation-buttons');
        
        // Bouton rotation anti-horaire
        const rotateLeft = L.DomUtil.create('button', 'leaflet-control-rotate-btn', container);
        rotateLeft.type = 'button';
        rotateLeft.title = 'Rotation anti-horaire (15°)';
        rotateLeft.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M 12 20 A 8 8 0 1 0 12 4" fill="none" stroke="#1976d2" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 12 4 L 9 1 L 9 7 Z" fill="#1976d2"/>
          </svg>
        `;
        
        // Bouton rotation horaire
        const rotateRight = L.DomUtil.create('button', 'leaflet-control-rotate-btn', container);
        rotateRight.type = 'button';
        rotateRight.title = 'Rotation horaire (15°)';
        rotateRight.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M 12 4 A 8 8 0 1 0 12 20" fill="none" stroke="#d32f2f" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 12 20 L 15 23 L 15 17 Z" fill="#d32f2f"/>
          </svg>
        `;

        // Fonction pour appliquer la rotation CSS
        const applyRotation = (angle: number) => {
          const mapContainer = map.getContainer();
          const mapPane = mapContainer.querySelector('.leaflet-map-pane') as HTMLElement;
          if (mapPane) {
            // Calculer le centre de la vue
            const size = map.getSize();
            const centerX = size.x / 2;
            const centerY = size.y / 2;
            
            // Appliquer la rotation autour du centre de la vue
            mapPane.style.transform = `rotate(${angle}deg)`;
            mapPane.style.transformOrigin = `${centerX}px ${centerY}px`;
            mapPane.style.transition = 'transform 0.15s ease-out';
          }
          
          // Inverser la rotation uniquement sur les markers pour qu'ils restent droits
          const markers = mapContainer.querySelectorAll('.leaflet-marker-icon');
          markers.forEach((marker) => {
            (marker as HTMLElement).style.transform = `rotate(${-angle}deg)`;
            (marker as HTMLElement).style.transition = 'transform 0.15s ease-out';
          });
          
          // Sauvegarder l'angle sur la carte
          (map as any)._rotationAngle = angle;
        };

        // Rotation anti-horaire (gauche)
        L.DomEvent.on(rotateLeft, 'click', function (e) {
          L.DomEvent.preventDefault(e);
          L.DomEvent.stopPropagation(e);
          const currentRotation = ((map as any)._rotationAngle - 15 + 360) % 360;
          applyRotation(currentRotation);
        });

        // Rotation horaire (droite)
        L.DomEvent.on(rotateRight, 'click', function (e) {
          L.DomEvent.preventDefault(e);
          L.DomEvent.stopPropagation(e);
          const currentRotation = ((map as any)._rotationAngle + 15) % 360;
          applyRotation(currentRotation);
        });

        // Empêcher la propagation des événements de souris
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      }
    });

    // Ajouter le contrôle à la carte
    const rotationControl = new RotationControl();
    map.addControl(rotationControl);

    // Observer les changements pour réappliquer la rotation automatiquement
    const reapplyRotation = () => {
      const angle = (map as any)._rotationAngle || 0;
      if (angle !== 0) {
        setTimeout(() => {
          const mapContainer = map.getContainer();
          const mapPane = mapContainer.querySelector('.leaflet-map-pane') as HTMLElement;
          if (mapPane) {
            const size = map.getSize();
            const centerX = size.x / 2;
            const centerY = size.y / 2;
            mapPane.style.transform = `rotate(${angle}deg)`;
            mapPane.style.transformOrigin = `${centerX}px ${centerY}px`;
            mapPane.style.transition = 'none';
          }
          
          const markers = mapContainer.querySelectorAll('.leaflet-marker-icon');
          markers.forEach((marker) => {
            (marker as HTMLElement).style.transform = `rotate(${-angle}deg)`;
            (marker as HTMLElement).style.transition = 'none';
          });
        }, 10);
      }
    };

    // Écouter les événements qui pourraient réinitialiser la rotation
    map.on('resize', reapplyRotation);
    map.on('zoomend', reapplyRotation);
    map.on('moveend', reapplyRotation);

    // Nettoyer au démontage
    return () => {
      map.off('resize', reapplyRotation);
      map.off('zoomend', reapplyRotation);
      map.off('moveend', reapplyRotation);
      map.removeControl(rotationControl);
    };
  }, [map]);

  return null;
}
