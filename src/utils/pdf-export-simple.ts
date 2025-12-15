import jsPDF from 'jspdf';
import { LeafletDrawingState, CourseHole } from '../contexts/types';
import domtoimage from 'dom-to-image-more';
import { lineString, length as turfLength, bezierSpline } from '@turf/turf';

/**
 * Fait pivoter une image et retourne la nouvelle dataUrl avec dimensions correctes
 */
async function rotateImage(dataUrl: string, angleDegrees: number): Promise<{dataUrl: string, width: number, height: number}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Calculer les nouvelles dimensions après rotation
      const angleRad = (angleDegrees * Math.PI) / 180;
      const cos = Math.abs(Math.cos(angleRad));
      const sin = Math.abs(Math.sin(angleRad));
      const newWidth = Math.round(img.width * cos + img.height * sin);
      const newHeight = Math.round(img.width * sin + img.height * cos);
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Fond de couleur
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, newWidth, newHeight);
      
      // Appliquer la rotation au centre
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(angleRad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.95),
        width: newWidth,
        height: newHeight
      });
    };
    img.src = dataUrl;
  });
}

/**
 * Calcule les statistiques d'un trou individuel
 */
function calculateHoleStats(hole: CourseHole) {
  let straightDistance = 0;
  let flightPathDistance = 0;
  
  // Distance à vol d'oiseau (straight)
  const tee = hole.elements.find(el => el.type === 'tee');
  const basket = hole.elements.find(el => el.type === 'basket');
  
  if (tee && basket && tee.position && basket.position) {
    const line = lineString([
      [tee.position.lng, tee.position.lat],
      [basket.position.lng, basket.position.lat]
    ]);
    straightDistance = turfLength(line, { units: 'meters' });
  }
  
  // Distance trajectoire (flight path avec courbe de Bézier)
  const flightPath = hole.elements.find(el => el.type === 'flight-path' && el.path && el.path.length >= 2);
  if (flightPath && flightPath.path) {
    const line = lineString(flightPath.path.map(p => [p.lng, p.lat]));
    const curved = bezierSpline(line);
    flightPathDistance = turfLength(curved, { units: 'meters' });
  }
  
  return {
    straightDistance: Math.round(straightDistance),
    flightPathDistance: Math.round(flightPathDistance)
  };
}

/**
 * Calcule la distance totale d'un parcours
 */
function calculateCourseStats(state: LeafletDrawingState) {
  let totalPar = 0;
  let totalDistanceStraight = 0;
  let totalDistancePath = 0;
  
  for (const hole of state.holes) {
    totalPar += hole.par || 3;
    
    const holeStats = calculateHoleStats(hole);
    totalDistanceStraight += holeStats.straightDistance;
    totalDistancePath += holeStats.flightPathDistance || holeStats.straightDistance;
  }
  
  return {
    totalHoles: state.holes.length,
    totalPar,
    totalDistanceStraight: Math.round(totalDistanceStraight),
    totalDistancePath: Math.round(totalDistancePath)
  };
}

/**
 * Recadre une image pour enlever les zones vides (trim)
 */
async function trimImage(dataUrl: string): Promise<{dataUrl: string, width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Unable to get canvas context'));
        return;
      }
      
      // Dessiner l'image sur un canvas temporaire
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Obtenir les pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Couleur de fond à détecter (#f5f5f5 = rgb(245, 245, 245))
      const bgColor = { r: 245, g: 245, b: 245 };
      const tolerance = 15; // Tolérance augmentée
      
      // Trouver les limites du contenu non-vide
      let top = canvas.height;
      let bottom = 0;
      let left = canvas.width;
      let right = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          // Vérifier si ce pixel n'est pas du fond
          if (Math.abs(r - bgColor.r) > tolerance || 
              Math.abs(g - bgColor.g) > tolerance || 
              Math.abs(b - bgColor.b) > tolerance) {
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }
      
      // Si aucun contenu trouvé, retourner l'image originale
      if (top >= bottom || left >= right) {
        resolve({
          dataUrl: dataUrl,
          width: img.width,
          height: img.height
        });
        return;
      }
      
      // Ajouter une marge proportionnelle (5% de chaque dimension)
      const marginY = Math.floor((bottom - top) * 0.05);
      const marginX = Math.floor((right - left) * 0.05);
      
      top = Math.max(0, top - marginY);
      bottom = Math.min(canvas.height - 1, bottom + marginY);
      left = Math.max(0, left - marginX);
      right = Math.min(canvas.width - 1, right + marginX);
      
      // Créer un nouveau canvas avec les dimensions recadrées
      const croppedWidth = right - left + 1;
      const croppedHeight = bottom - top + 1;
      
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = croppedWidth;
      croppedCanvas.height = croppedHeight;
      const croppedCtx = croppedCanvas.getContext('2d');
      
      if (!croppedCtx) {
        reject(new Error('Unable to get cropped canvas context'));
        return;
      }
      
      // Copier la partie recadrée
      croppedCtx.drawImage(
        canvas,
        left, top, croppedWidth, croppedHeight,
        0, 0, croppedWidth, croppedHeight
      );
      
      resolve({
        dataUrl: croppedCanvas.toDataURL('image/jpeg', 0.95),
        width: croppedWidth,
        height: croppedHeight
      });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Capture la carte et retourne une image avec dimensions proportionnelles
 */
async function captureMap(
  mapInstance: any, 
  mapContainer: HTMLElement, 
  hole?: CourseHole,
  allHoles?: CourseHole[]
): Promise<{dataUrl: string, width: number, height: number}> {
  
  let rotationAngle = 0;
  
  // Si un trou est spécifié, zoomer dessus avec cadrage adaptatif
  if (hole) {
    const tee = hole.elements.find(el => el.type === 'tee');
    const basket = hole.elements.find(el => el.type === 'basket');
    
    if (tee && basket && tee.position && basket.position) {
      // Collecter tous les points à inclure
      const allPoints: [number, number][] = [
        [tee.position.lat, tee.position.lng],
        [basket.position.lat, basket.position.lng]
      ];
      
      // Ajouter la trajectoire
      const flightPath = hole.elements.find(el => el.type === 'flight-path');
      if (flightPath && flightPath.path) {
        flightPath.path.forEach(p => allPoints.push([p.lat, p.lng]));
      }
      
      // Calculer les limites exactes
      const lats = allPoints.map(p => p[0]);
      const lngs = allPoints.map(p => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Ajouter une marge minimale de 3 mètres de chaque côté
      const marginMeters = 3;
      const marginLat = marginMeters / 111000; // ~111km par degré
      const marginLng = marginMeters / (111000 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
      
      const bounds: [[number, number], [number, number]] = [
        [minLat - marginLat, minLng - marginLng],
        [maxLat + marginLat, maxLng + marginLng]
      ];
      
      // fitBounds SANS padding automatique et SANS limite de zoom
      mapInstance.fitBounds(bounds, { 
        padding: [0, 0],
        animate: false 
      });
    }
  } else if (allHoles && allHoles.length > 0) {
    // Vue complète du parcours - analyser tous les tees et paniers
    const allPoints: [number, number][] = [];
    
    for (const hole of allHoles) {
      const tee = hole.elements.find(el => el.type === 'tee');
      const basket = hole.elements.find(el => el.type === 'basket');
      
      if (tee && tee.position) {
        allPoints.push([tee.position.lat, tee.position.lng]);
      }
      if (basket && basket.position) {
        allPoints.push([basket.position.lat, basket.position.lng]);
      }
      
      // Ajouter aussi les trajectoires pour un cadrage complet
      const flightPath = hole.elements.find(el => el.type === 'flight-path');
      if (flightPath && flightPath.path) {
        flightPath.path.forEach(p => allPoints.push([p.lat, p.lng]));
      }
    }
    
    if (allPoints.length > 0) {
      const lats = allPoints.map(p => p[0]);
      const lngs = allPoints.map(p => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Ajouter une marge minimale pour la vue d'ensemble (2 mètres)
      const marginMeters = 2;
      const marginLat = marginMeters / 111000;
      const marginLng = marginMeters / (111000 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
      
      const bounds: [[number, number], [number, number]] = [
        [minLat - marginLat, minLng - marginLng],
        [maxLat + marginLat, maxLng + marginLng]
      ];
      
      mapInstance.fitBounds(bounds, { 
        padding: [0, 0],
        animate: false 
      });
    }
  } else {
    // Fallback : récupérer tous les éléments de la carte
    const allBounds: [number, number][] = [];
    
    for (const hole of mapInstance._layers ? Object.values(mapInstance._layers) : []) {
      if ((hole as any).getLatLng) {
        const latlng = (hole as any).getLatLng();
        allBounds.push([latlng.lat, latlng.lng]);
      }
      if ((hole as any).getLatLngs) {
        const latlngs = (hole as any).getLatLngs();
        const flat = Array.isArray(latlngs[0]) ? latlngs.flat() : latlngs;
        flat.forEach((ll: any) => {
          if (ll.lat !== undefined) allBounds.push([ll.lat, ll.lng]);
        });
      }
    }
    
    if (allBounds.length > 0) {
      mapInstance.fitBounds(allBounds, { padding: [10, 10] });
    }
  }
  
  // Attendre que la carte soit stable
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Forcer un refresh
  mapInstance.invalidateSize();
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Capturer
  let dataUrl = await domtoimage.toJpeg(mapContainer, {
    quality: 0.95,
    bgcolor: '#f5f5f5',
    width: mapContainer.offsetWidth,
    height: mapContainer.offsetHeight,
    style: {
      transform: 'none',
      transformOrigin: 'top left'
    }
  });
  
  let finalWidth = mapContainer.offsetWidth;
  let finalHeight = mapContainer.offsetHeight;
  
  // Recadrer l'image pour enlever les zones vides (trim)
  if (hole) {
    const trimResult = await trimImage(dataUrl);
    dataUrl = trimResult.dataUrl;
    finalWidth = trimResult.width;
    finalHeight = trimResult.height;
  }
  
  // Appliquer la rotation si nécessaire
  if (rotationAngle !== 0) {
    const rotated = await rotateImage(dataUrl, rotationAngle);
    dataUrl = rotated.dataUrl;
    finalWidth = rotated.width;
    finalHeight = rotated.height;
  }
  
  return {
    dataUrl,
    width: finalWidth,
    height: finalHeight
  };
}

/**
 * Ajoute une image au PDF en conservant les proportions
 */
function addImageWithAspectRatio(
  pdf: jsPDF,
  dataUrl: string,
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  x: number,
  y: number
) {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = maxWidth;
  let height = maxWidth / aspectRatio;
  
  // Si la hauteur dépasse, on ajuste par la hauteur
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }
  
  // Centrer horizontalement
  const xOffset = x + (maxWidth - width) / 2;
  
  pdf.addImage(dataUrl, 'JPEG', xOffset, y, width, height);
  
  return { width, height };
}

/**
 * Exporte le parcours en PDF avec la carte en image
 */
export async function exportCourseToPDF(
  state: LeafletDrawingState,
  mapElement: any
): Promise<void> {
  try {
    console.log('📄 Début de l\'export PDF...');
    
    // Récupérer l'instance Leaflet et le conteneur DOM
    let mapInstance: any;
    let mapContainer: HTMLElement;
    
    if (mapElement && typeof mapElement.on === 'function') {
      mapInstance = mapElement;
      mapContainer = mapInstance.getContainer();
    } else if (mapElement && (mapElement as any)._leaflet_map) {
      mapInstance = (mapElement as any)._leaflet_map;
      mapContainer = mapElement;
    } else if (mapElement && mapElement.current) {
      mapInstance = mapElement.current;
      mapContainer = mapInstance.getContainer();
    } else {
      throw new Error('Instance Leaflet non trouvée');
    }
    
    if (!mapInstance || !mapContainer) {
      throw new Error('Instance Leaflet ou conteneur invalide');
    }
    
    console.log('✅ Instance Leaflet et conteneur trouvés');
    
    // Calculer les statistiques
    const stats = calculateCourseStats(state);
    
    // Créer un PDF A4 format portrait
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    
    // ========== PAGE 1 : RÉCAPITULATIF DU PARCOURS ==========
    
    // Bannière de titre avec fond bleu
    pdf.setFillColor(41, 128, 185); // Bleu moderne
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    // Titre en blanc
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(state.name || 'Parcours Disc Golf', pageWidth / 2, 20, { align: 'center' });
    
    // Sous-titre
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 28, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    
    // Ligne de séparation décorative
    pdf.setDrawColor(52, 152, 219);
    pdf.setLineWidth(1);
    pdf.line(margin, 38, pageWidth - margin, 38);
    
    // Statistiques globales avec carte
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(52, 73, 94); // Gris foncé
    pdf.text('Statistiques du parcours', margin, 50);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    let yPos = 60;
    
    // Carte d'informations avec fond gris clair
    pdf.setFillColor(236, 240, 241);
    pdf.roundedRect(margin, yPos - 5, contentWidth, 35, 3, 3, 'F');
    
    yPos += 3;
    
    // Première colonne
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(52, 73, 94);
    pdf.text(`Nombre de trous :`, margin + 5, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(41, 128, 185); // Bleu
    pdf.text(`${stats.totalHoles}`, margin + 50, yPos);
    yPos += 8;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(52, 73, 94);
    pdf.text(`Par total :`, margin + 5, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(41, 128, 185);
    pdf.text(`${stats.totalPar}`, margin + 50, yPos);
    
    // Deuxième colonne
    yPos -= 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(52, 73, 94);
    pdf.text(`Distance à vol d'oiseau :`, margin + 100, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(41, 128, 185);
    pdf.text(`${stats.totalDistanceStraight} m`, margin + 160, yPos);
    yPos += 8;
    
    if (stats.totalDistancePath > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(52, 73, 94);
      pdf.text(`Distance trajectoire :`, margin + 100, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(46, 204, 113); // Vert
      pdf.text(`${stats.totalDistancePath} m`, margin + 160, yPos);
    }
    
    pdf.setTextColor(0, 0, 0);
    yPos += 15;
    
    // Carte complète du parcours
    console.log('📷 Capture de la carte complète du parcours...');
    try {
      const { dataUrl, width, height } = await captureMap(mapInstance, mapContainer, undefined, state.holes);
      
      // Dimensions pour la carte (moitié de la page environ)
      const maxMapWidth = contentWidth;
      const maxMapHeight = 90; // Hauteur fixe pour laisser place au tableau
      
      addImageWithAspectRatio(
        pdf,
        dataUrl,
        width,
        height,
        maxMapWidth,
        maxMapHeight,
        margin,
        yPos
      );
      
      yPos += maxMapHeight + 10;
      console.log('✅ Carte du parcours capturée');
    } catch (error) {
      console.error('❌ Erreur capture carte parcours:', error);
      pdf.setFontSize(10);
      pdf.setTextColor(255, 0, 0);
      pdf.text('[Erreur de capture de la carte]', margin, yPos);
      pdf.setTextColor(0, 0, 0);
      yPos += 10;
    }
    
    // Tableau récapitulatif des trous
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(52, 73, 94);
  pdf.text('Detail des trous', margin, yPos);
  yPos += 10;
  
  // En-têtes du tableau avec fond bleu
  const colX = [margin + 2, margin + 32, margin + 62, margin + 112];
  const colWidths = [28, 28, 48, 48];
  const rowHeight = 7;
  
  pdf.setFillColor(41, 128, 185); // Bleu
  pdf.rect(margin, yPos - 5, contentWidth, rowHeight, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Trou', colX[0], yPos);
  pdf.text('Par', colX[1], yPos);
  pdf.text('Vol oiseau', colX[2], yPos);
  pdf.text('Trajectoire', colX[3], yPos);
  yPos += rowHeight;
  
  // Lignes du tableau avec alternance de couleurs
  pdf.setFont('helvetica', 'normal');
  let rowIndex = 0;
  
  for (const hole of state.holes) {
    // Vérifier si on doit changer de page
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      yPos = 20;
      rowIndex = 0;
    }
    
    const holeStats = calculateHoleStats(hole);
    
    // Fond alternant blanc/gris très clair
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(249, 249, 249);
    } else {
      pdf.setFillColor(255, 255, 255);
    }
    pdf.rect(margin, yPos - 5, contentWidth, rowHeight, 'F');
    
    // Bordures des cellules
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.1);
    pdf.rect(margin, yPos - 5, contentWidth, rowHeight, 'S');
    
    // Contenu
    pdf.setTextColor(52, 73, 94);
    pdf.text(`${hole.number}`, colX[0], yPos);
    pdf.setTextColor(41, 128, 185);
    pdf.text(`${hole.par || 3}`, colX[1], yPos);
    pdf.setTextColor(52, 73, 94);
    pdf.text(holeStats.straightDistance ? `${holeStats.straightDistance}m` : '-', colX[2], yPos);
    pdf.setTextColor(46, 204, 113); // Vert pour trajectoire
    pdf.text(holeStats.flightPathDistance ? `${holeStats.flightPathDistance}m` : '-', colX[3], yPos);
    
    rowIndex++;
      yPos += 6;
    }
    
    // ========== PAGES SUIVANTES : DÉTAIL DE CHAQUE TROU ==========
    
    for (const hole of state.holes) {
      pdf.addPage();
      
      // Bannière d'en-tête du trou
      pdf.setFillColor(52, 152, 219); // Bleu clair
      pdf.rect(0, 0, pageWidth, 30, 'F');
      
      // Titre du trou en blanc
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Trou ${hole.number}`, pageWidth / 2, 18, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      
      // Calculer les statistiques du trou
      const holeStats = calculateHoleStats(hole);
      
      // Carte d'informations du trou
      yPos = 40;
      pdf.setFillColor(236, 240, 241);
      pdf.roundedRect(margin, yPos, contentWidth / 2, 30, 3, 3, 'F');
      
      yPos += 10;
      
      // Statistiques du trou
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(52, 73, 94);
      pdf.text('Par :', margin + 5, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(41, 128, 185);
      pdf.text(`${hole.par || 3}`, margin + 25, yPos);
      
      yPos += 8;
      
      // Distance à vol d'oiseau
      if (holeStats.straightDistance) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(52, 73, 94);
        pdf.text('Distance (vol d\'oiseau) :', margin + 5, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(41, 128, 185);
        pdf.text(`${holeStats.straightDistance} m`, margin + 65, yPos);
        yPos += 8;
      }
      
      // Distance trajectoire (si flight path existe)
      if (holeStats.flightPathDistance) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(52, 73, 94);
        pdf.text('Distance (trajectoire) :', margin + 5, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(46, 204, 113); // Vert
        pdf.text(`${holeStats.flightPathDistance} m`, margin + 65, yPos);
      }
      
      pdf.setTextColor(0, 0, 0);
      yPos = 80;
      
      // Capturer la carte pour ce trou avec zoom
      console.log(`📷 Capture du trou ${hole.number} avec zoom...`);
      
      try {
        const { dataUrl, width, height } = await captureMap(mapInstance, mapContainer, hole, state.holes);
        
        // Dimensions max pour la carte (conserver les proportions)
        const maxMapWidth = contentWidth;
        const maxMapHeight = pageHeight - yPos - margin - 10;
        
        // Ajouter l'image avec proportions conservées
        const { height: addedHeight } = addImageWithAspectRatio(
          pdf,
          dataUrl,
          width,
          height,
          maxMapWidth,
          maxMapHeight,
          margin,
          yPos
        );
        
        console.log(`✅ Trou ${hole.number} capturé avec zoom (${Math.round(addedHeight)}mm de hauteur)`);
      } catch (error) {
        console.error(`❌ Erreur capture trou ${hole.number}:`, error);
        pdf.setFontSize(10);
        pdf.setTextColor(255, 0, 0);
        pdf.text('[Erreur de capture de carte]', margin, yPos);
        pdf.setTextColor(0, 0, 0);
      }
    }
    
    // Sauvegarder le PDF
    const fileName = `${state.name || 'parcours'}_${new Date().getTime()}.pdf`;
    pdf.save(fileName);
    
    console.log('✅ PDF exporté:', fileName);
  } catch (error) {
    console.error('❌ Erreur export PDF:', error);
    throw error;
  }
}
