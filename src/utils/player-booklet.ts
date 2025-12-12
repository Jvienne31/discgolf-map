import jsPDF from 'jspdf';
import { LeafletDrawingState } from '../contexts/types';
import { distance, point, lineString, bezierSpline, length } from '@turf/turf';
import { captureMapImage, calculateHoleBounds, calculateCourseBounds } from './capture-map';
import * as L from 'leaflet';

interface HoleStats {
  number: number;
  par: number;
  straightDistance: number | null; // Distance vol d'oiseau
  flightPathDistance: number | null; // Distance trajectoire
  hasMandatory: boolean;
}

/**
 * Calcule les dimensions pour conserver les proportions d'une image
 */
const calculateAspectRatioDimensions = (
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const imgRatio = imgWidth / imgHeight;
  const maxRatio = maxWidth / maxHeight;
  
  let width = maxWidth;
  let height = maxHeight;
  
  if (imgRatio > maxRatio) {
    // Image plus large que l'espace
    height = maxWidth / imgRatio;
  } else {
    // Image plus haute que l'espace
    width = maxHeight * imgRatio;
  }
  
  return { width, height };
};

export const generatePlayerBooklet = async (
  courseState: LeafletDrawingState, 
  courseName: string, 
  mapInstance?: L.Map
) => {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  
  // Calculer les statistiques des trous
  const holeStats: HoleStats[] = courseState.holes.map(hole => {
    const tee = hole.elements.find(el => el.type === 'tee');
    const basket = hole.elements.find(el => el.type === 'basket');
    const flightPath = hole.elements.find(el => el.type === 'flight-path');
    const hasMandatory = hole.elements.some(el => el.type === 'mandatory');
    
    let straightDistance: number | null = null;
    let flightPathDistance: number | null = null;
    
    // Distance vol d'oiseau (en mètres)
    if (tee?.position && basket?.position) {
      const from = point([tee.position.lng, tee.position.lat]);
      const to = point([basket.position.lng, basket.position.lat]);
      straightDistance = distance(from, to) * 1000; // Convertir km en mètres
    }
    
    // Distance trajectoire (en mètres) - même calcul que l'application
    if (flightPath?.path && flightPath.path.length >= 2) {
      const line = lineString(flightPath.path.map(p => [p.lng, p.lat]));
      const curved = bezierSpline(line);
      flightPathDistance = length(curved, { units: 'meters' });
    }
    
    return {
      number: hole.number,
      par: hole.par,
      straightDistance,
      flightPathDistance,
      hasMandatory
    };
  });
  
  // PAGE 1: Vue d'ensemble du parcours
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(courseName, pageWidth / 2, margin + 10, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Carnet Joueur', pageWidth / 2, margin + 20, { align: 'center' });
  
  // Statistiques globales
  const totalHoles = holeStats.length;
  const totalPar = holeStats.reduce((sum, h) => sum + h.par, 0);
  const totalDistance = holeStats.reduce((sum, h) => sum + (h.flightPathDistance || h.straightDistance || 0), 0);
  
  pdf.setFontSize(10);
  pdf.text(`${totalHoles} trous | Par ${totalPar} | Distance totale: ${Math.round(totalDistance)}m`, pageWidth / 2, margin + 28, { align: 'center' });
  
  // Zone pour l'image du parcours complet
  const courseMapY = margin + 38;
  const courseMapHeight = 80;
  const courseMapWidth = pageWidth - 2 * margin;
  
  // Capturer l'image du parcours complet si la carte est fournie
  if (mapInstance) {
    console.log('🗺️ Début capture du parcours complet...');
    try {
      const courseBounds = calculateCourseBounds(courseState.holes);
      console.log('📍 Bounds du parcours:', courseBounds);
      if (courseBounds) {
        console.log('📸 Capture de l\'image en cours...');
        
        // Récupérer tous les éléments de tous les trous
        const allElements = courseState.holes.flatMap(hole => hole.elements);
        
        const courseImage = await captureMapImage(mapInstance, courseBounds, allElements);
        console.log('✅ Image capturée, taille:', courseImage.length, 'caractères');
        
        // Créer une image temporaire pour obtenir les dimensions
        const img = new Image();
        img.src = courseImage;
        await new Promise(resolve => {
          img.onload = resolve;
        });
        
        // Calculer les dimensions en conservant les proportions
        const dims = calculateAspectRatioDimensions(img.width, img.height, courseMapWidth, courseMapHeight);
        const imgX = margin + (courseMapWidth - dims.width) / 2; // Centrer horizontalement
        
        pdf.addImage(courseImage, 'PNG', imgX, courseMapY, dims.width, dims.height);
        console.log('✅ Image ajoutée au PDF');
      } else {
        console.warn('⚠️ Pas de bounds pour le parcours');
        // Afficher placeholder si pas de bounds
        pdf.setDrawColor(200);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, courseMapY, courseMapWidth, courseMapHeight);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text('Aucun élément sur le parcours', pageWidth / 2, courseMapY + courseMapHeight / 2, { align: 'center' });
        pdf.setTextColor(0);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la capture du parcours:', error);
      // Afficher placeholder en cas d'erreur
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, courseMapY, courseMapWidth, courseMapHeight);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('Erreur lors de la capture', pageWidth / 2, courseMapY + courseMapHeight / 2, { align: 'center' });
      pdf.setTextColor(0);
    }
  } else {
    console.warn('⚠️ Pas d\'instance de carte fournie');
    // Placeholder si pas de carte fournie
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, courseMapY, courseMapWidth, courseMapHeight);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text('[Vue d\'ensemble du parcours]', pageWidth / 2, courseMapY + courseMapHeight / 2, { align: 'center' });
    pdf.setTextColor(0);
  }
  
  // Tableau récapitulatif
  const tableY = courseMapY + courseMapHeight + 10;
  const colWidths = [20, 20, 35, 35, 35, 30];
  const headers = ['Trou', 'Par', 'Vol oiseau', 'Trajectoire', 'Dist. réelle', 'Mand.'];
  
  // En-têtes
  pdf.setFillColor(52, 168, 83); // Vert
  pdf.rect(margin, tableY, pageWidth - 2 * margin, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  
  let x = margin + 2;
  headers.forEach((header, i) => {
    pdf.text(header, x, tableY + 5.5);
    x += colWidths[i];
  });
  
  // Lignes des trous
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  let y = tableY + 8;
  
  holeStats.forEach((hole, index) => {
    if (y > pageHeight - margin - 10) {
      pdf.addPage();
      y = margin;
    }
    
    // Alternance de couleur
    if (index % 2 === 0) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
    }
    
    x = margin + 2;
    pdf.text(hole.number.toString(), x, y + 5);
    x += colWidths[0];
    pdf.text(hole.par.toString(), x, y + 5);
    x += colWidths[1];
    pdf.text(hole.straightDistance ? `${Math.round(hole.straightDistance)}m` : '-', x, y + 5);
    x += colWidths[2];
    pdf.text(hole.flightPathDistance ? `${Math.round(hole.flightPathDistance)}m` : '-', x, y + 5);
    x += colWidths[3];
    pdf.text('', x, y + 5); // Colonne pour écrire la distance réelle
    x += colWidths[4];
    pdf.text(hole.hasMandatory ? 'Oui' : 'Non', x, y + 5);
    
    y += 7;
  });
  
  // Score card
  y += 10;
  if (y > pageHeight - margin - 40) {
    pdf.addPage();
    y = margin;
  }
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Carte de Score', margin, y);
  y += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Joueur: ___________________________', margin, y);
  pdf.text('Date: _____________', pageWidth - margin - 50, y);
  
  // PAGES SUIVANTES: Détail de chaque trou
  for (const hole of courseState.holes) {
    pdf.addPage();
    
    // Titre du trou
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Trou ${hole.number}`, pageWidth / 2, margin + 10, { align: 'center' });
    
    const stats = holeStats.find(h => h.number === hole.number);
    
    // Caractéristiques du trou (encadré)
    const infoX = pageWidth - margin - 50;
    const infoY = margin + 20;
    const infoWidth = 45;
    const infoHeight = 60;
    
    pdf.setDrawColor(0);
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(infoX, infoY, infoWidth, infoHeight, 3, 3, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    let infoTextY = infoY + 8;
    pdf.text('Caractéristiques', infoX + infoWidth / 2, infoTextY, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    infoTextY += 8;
    pdf.text(`Par: ${stats?.par || 3}`, infoX + 3, infoTextY);
    
    infoTextY += 7;
    if (stats?.straightDistance) {
      pdf.text(`Vol d'oiseau:`, infoX + 3, infoTextY);
      pdf.text(`${Math.round(stats.straightDistance)}m`, infoX + infoWidth - 3, infoTextY, { align: 'right' });
    }
    
    infoTextY += 7;
    if (stats?.flightPathDistance) {
      pdf.text(`Trajectoire:`, infoX + 3, infoTextY);
      pdf.text(`${Math.round(stats.flightPathDistance)}m`, infoX + infoWidth - 3, infoTextY, { align: 'right' });
    }
    
    infoTextY += 7;
    pdf.text(`Mandatory:`, infoX + 3, infoTextY);
    pdf.text(stats?.hasMandatory ? 'Oui' : 'Non', infoX + infoWidth - 3, infoTextY, { align: 'right' });
    
    infoTextY += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Mon score:', infoX + 3, infoTextY);
    pdf.setLineWidth(0.5);
    pdf.line(infoX + 3, infoTextY + 3, infoX + infoWidth - 3, infoTextY + 3);
    
    // Zone pour l'image de la carte du trou
    const mapX = margin;
    const mapY = margin + 20;
    const mapWidth = infoX - margin - 5;
    const mapHeight = pageHeight - margin - mapY - 30;
    
    // Capturer et orienter l'image du trou si la carte est fournie
    if (mapInstance) {
      try {
        const tee = hole.elements.find(el => el.type === 'tee');
        const basket = hole.elements.find(el => el.type === 'basket');
        
        if (tee?.position && basket?.position) {
          const holeBounds = calculateHoleBounds(tee.position, basket.position, hole.elements);
          
          if (holeBounds) {
            // Capturer l'image de la carte avec les éléments du trou
            const holeImage = await captureMapImage(mapInstance, holeBounds, hole.elements);
            
            // Créer une image temporaire pour obtenir les dimensions
            const img = new Image();
            img.src = holeImage;
            await new Promise(resolve => {
              img.onload = resolve;
            });
            
            // Calculer les dimensions en conservant les proportions
            const dims = calculateAspectRatioDimensions(img.width, img.height, mapWidth, mapHeight);
            const imgX = mapX + (mapWidth - dims.width) / 2; // Centrer horizontalement
            const imgY = mapY + (mapHeight - dims.height) / 2; // Centrer verticalement
            
            // Ajouter l'image directement au PDF sans rotation (vue 2D à plat)
            pdf.addImage(holeImage, 'PNG', imgX, imgY, dims.width, dims.height);
          } else {
            // Placeholder si pas de bounds
            pdf.setDrawColor(200);
            pdf.setLineWidth(0.5);
            pdf.rect(mapX, mapY, mapWidth, mapHeight);
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text('Trou incomplet', mapX + mapWidth / 2, mapY + mapHeight / 2, { align: 'center' });
            pdf.setTextColor(0);
          }
        } else {
          // Placeholder si pas de tee ou basket
          pdf.setDrawColor(200);
          pdf.setLineWidth(0.5);
          pdf.rect(mapX, mapY, mapWidth, mapHeight);
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text('Tee ou panier manquant', mapX + mapWidth / 2, mapY + mapHeight / 2, { align: 'center' });
          pdf.setTextColor(0);
        }
      } catch (error) {
        console.error(`Erreur lors de la capture du trou ${hole.number}:`, error);
        // Placeholder en cas d'erreur
        pdf.setDrawColor(200);
        pdf.setLineWidth(0.5);
        pdf.rect(mapX, mapY, mapWidth, mapHeight);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text('Erreur de capture', mapX + mapWidth / 2, mapY + mapHeight / 2, { align: 'center' });
        pdf.setTextColor(0);
      }
    } else {
      // Placeholder si pas de carte fournie
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.rect(mapX, mapY, mapWidth, mapHeight);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('[Image du trou]', mapX + mapWidth / 2, mapY + mapHeight / 2, { align: 'center' });
      pdf.setTextColor(0);
    }
    
    // Notes
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const notesY = mapY + mapHeight + 10;
    pdf.text('Notes:', margin, notesY);
    pdf.setFont('helvetica', 'normal');
    pdf.setLineWidth(0.3);
    pdf.line(margin, notesY + 3, pageWidth - margin, notesY + 3);
    pdf.line(margin, notesY + 8, pageWidth - margin, notesY + 8);
  }
  
  // Sauvegarder le PDF
  const fileName = `${courseName.replace(/[^a-z0-9]/gi, '_')}_carnet.pdf`;
  pdf.save(fileName);
};
