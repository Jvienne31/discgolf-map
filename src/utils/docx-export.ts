import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, HeadingLevel, AlignmentType, WidthType, BorderStyle, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { LeafletDrawingState, CourseHole } from '../contexts/types';
import domtoimage from 'dom-to-image-more';
import { lineString, length as turfLength, bezierSpline } from '@turf/turf';

/**
 * Calcule les statistiques d'un trou individuel
 */
function calculateHoleStats(hole: CourseHole) {
  let straightDistance = 0;
  let flightPathDistance = 0;

  // Trouver le tee et le basket pour distance à vol d'oiseau
  const tee = hole.elements.find(el => el.type === 'tee');
  const basket = hole.elements.find(el => el.type === 'basket');

  if (tee && basket && tee.position && basket.position) {
    const teeCoords: [number, number] = [tee.position.lng, tee.position.lat];
    const basketCoords: [number, number] = [basket.position.lng, basket.position.lat];
    const line = lineString([teeCoords, basketCoords]);
    straightDistance = Math.round(turfLength(line, { units: 'meters' }));
  }

  // Trouver la trajectoire calculée
  const flightPath = hole.elements.find(el => el.type === 'flight-path');
  if (flightPath && flightPath.path && flightPath.path.length >= 2) {
    const pathLine = lineString(flightPath.path.map(p => [p.lng, p.lat] as [number, number]));
    const curved = bezierSpline(pathLine);
    flightPathDistance = Math.round(turfLength(curved, { units: 'meters' }));
  }

  return { 
    straightDistance, 
    flightPathDistance: flightPathDistance || straightDistance // Fallback si pas de trajectoire
  };
}

/**
 * Calcule les statistiques globales du parcours
 */
function calculateOverallStats(holes: CourseHole[]) {
  let totalPar = 0;
  let totalDistanceStraight = 0;
  let totalDistancePath = 0;

  for (const hole of holes) {
    totalPar += hole.par || 3;
    const stats = calculateHoleStats(hole);
    totalDistanceStraight += stats.straightDistance;
    totalDistancePath += stats.flightPathDistance || stats.straightDistance; // Fallback si pas de trajectoire
  }

  return {
    totalHoles: holes.length,
    totalPar,
    totalDistanceStraight: Math.round(totalDistanceStraight),
    totalDistancePath: Math.round(totalDistancePath)
  };
}

/**
 * Recadre une image en fonction des positions GPS du tee et basket
 */
async function trimImage(dataUrl: string, hole?: CourseHole, mapInstance?: any, mapContainer?: HTMLElement): Promise<{dataUrl: string, width: number, height: number}> {
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
      
      let top = 0;
      let bottom = canvas.height;
      let left = 0;
      let right = canvas.width;
      
      // Si on a les données du trou et de la carte, calculer les positions pixel
      if (hole && mapInstance && mapContainer) {
        const tee = hole.elements.find(el => el.type === 'tee');
        const basket = hole.elements.find(el => el.type === 'basket');
        const flightPath = hole.elements.find(el => el.type === 'flight-path');
        
        const positions: [number, number][] = [];
        
        if (tee?.position) {
          const point = mapInstance.latLngToContainerPoint([tee.position.lat, tee.position.lng]);
          positions.push([point.x, point.y]);
        }
        if (basket?.position) {
          const point = mapInstance.latLngToContainerPoint([basket.position.lat, basket.position.lng]);
          positions.push([point.x, point.y]);
        }
        if (flightPath?.path) {
          flightPath.path.forEach(p => {
            const point = mapInstance.latLngToContainerPoint([p.lat, p.lng]);
            positions.push([point.x, point.y]);
          });
        }
        
        if (positions.length > 0) {
          const xs = positions.map(p => p[0]);
          const ys = positions.map(p => p[1]);
          
          left = Math.floor(Math.min(...xs));
          right = Math.ceil(Math.max(...xs));
          top = Math.floor(Math.min(...ys));
          bottom = Math.ceil(Math.max(...ys));
          
          // Ajouter une marge de 5% pour bien voir les éléments
          const marginX = Math.floor((right - left) * 0.05);
          const marginY = Math.floor((bottom - top) * 0.05);
          
          top = Math.max(0, top - marginY);
          bottom = Math.min(canvas.height - 1, bottom + marginY);
          left = Math.max(0, left - marginX);
          right = Math.min(canvas.width - 1, right + marginX);
          
          // Forcer un ratio 4:3 pour garantir la cohérence entre les trous
          let width = right - left + 1;
          let height = bottom - top + 1;
          const targetRatio = 4 / 3;
          const currentRatio = width / height;
          
          if (currentRatio > targetRatio) {
            // Trop large, augmenter la hauteur
            const newHeight = width / targetRatio;
            const heightDiff = newHeight - height;
            top = Math.max(0, Math.floor(top - heightDiff / 2));
            bottom = Math.min(canvas.height - 1, Math.floor(bottom + heightDiff / 2));
          } else if (currentRatio < targetRatio) {
            // Trop haut, augmenter la largeur
            const newWidth = height * targetRatio;
            const widthDiff = newWidth - width;
            left = Math.max(0, Math.floor(left - widthDiff / 2));
            right = Math.min(canvas.width - 1, Math.floor(right + widthDiff / 2));
          }
        }
      }
      
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
      
      // Ajouter du padding pour atteindre une taille fixe (ratio 4:3)
      const targetWidth = 800;
      const targetHeight = 600;
      
      // Calculer le ratio pour fit le contenu
      const scaleX = targetWidth / croppedWidth;
      const scaleY = targetHeight / croppedHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Ne pas agrandir, seulement réduire si nécessaire
      
      const scaledWidth = Math.floor(croppedWidth * scale);
      const scaledHeight = Math.floor(croppedHeight * scale);
      
      // Centrer le contenu
      const offsetX = Math.floor((targetWidth - scaledWidth) / 2);
      const offsetY = Math.floor((targetHeight - scaledHeight) / 2);
      
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetWidth;
      finalCanvas.height = targetHeight;
      const finalCtx = finalCanvas.getContext('2d');
      
      if (!finalCtx) {
        reject(new Error('Unable to get final canvas context'));
        return;
      }
      
      // Fond blanc
      finalCtx.fillStyle = '#ffffff';
      finalCtx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Dessiner le contenu centré
      finalCtx.drawImage(
        croppedCanvas,
        0, 0, croppedWidth, croppedHeight,
        offsetX, offsetY, scaledWidth, scaledHeight
      );
      
      resolve({
        dataUrl: finalCanvas.toDataURL('image/jpeg', 0.95),
        width: targetWidth,
        height: targetHeight
      });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Masque temporairement les éléments qui n'appartiennent pas au trou spécifié
 * Retourne une fonction pour restaurer la visibilité
 */
function hideOtherHoles(
  mapInstance: any,
  currentHoleNumber: number,
  allHoles: CourseHole[]
): () => void {
  const hiddenLayers: Array<{ layer: any, originalStyle: any }> = [];
  
  // Récupérer les coordonnées du trou actuel pour les identifier
  const currentHole = allHoles.find(h => h.number === currentHoleNumber);
  if (!currentHole) return () => {};
  
  const currentPositions = new Set<string>();
  currentHole.elements.forEach(el => {
    if (el.position) {
      const key = `${el.position.lat.toFixed(6)},${el.position.lng.toFixed(6)}`;
      currentPositions.add(key);
    }
    if (el.path) {
      el.path.forEach(p => {
        const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
        currentPositions.add(key);
      });
    }
  });

  // Parcourir tous les layers de la carte
  mapInstance.eachLayer((layer: any) => {
    // Ignorer les layers de base (tiles)
    if (!layer.getLatLng && !layer.getLatLngs) return;
    
    let belongsToCurrentHole = false;
    
    // Vérifier si le layer appartient au trou actuel
    if (layer.getLatLng) {
      const latlng = layer.getLatLng();
      const key = `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
      belongsToCurrentHole = currentPositions.has(key);
    } else if (layer.getLatLngs) {
      const latlngs = layer.getLatLngs();
      const flat = Array.isArray(latlngs[0]) ? latlngs.flat() : latlngs;
      belongsToCurrentHole = flat.some((ll: any) => {
        if (ll.lat !== undefined) {
          const key = `${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}`;
          return currentPositions.has(key);
        }
        return false;
      });
    }
    
    // Si le layer n'appartient pas au trou actuel, le masquer
    if (!belongsToCurrentHole) {
      const originalStyle: any = {};
      
      if (layer.options) {
        originalStyle.opacity = layer.options.opacity ?? 1;
        originalStyle.fillOpacity = layer.options.fillOpacity ?? 0.4;
      }
      
      hiddenLayers.push({ layer, originalStyle });
      
      // Masquer le layer
      if (layer.setStyle) {
        layer.setStyle({ opacity: 0, fillOpacity: 0 });
      } else if (layer.setOpacity) {
        layer.setOpacity(0);
      }
    }
  });

  // Retourner une fonction pour restaurer
  return () => {
    hiddenLayers.forEach(({ layer, originalStyle }) => {
      if (layer.setStyle) {
        layer.setStyle({ 
          opacity: originalStyle.opacity, 
          fillOpacity: originalStyle.fillOpacity 
        });
      } else if (layer.setOpacity) {
        layer.setOpacity(originalStyle.opacity);
      }
    });
  };
}

/**
 * Capture une vue de la carte Leaflet - IDENTIQUE au PDF
 */
async function captureMap(
  mapInstance: any,
  mapContainer: HTMLElement,
  hole?: CourseHole,
  allHoles?: CourseHole[]
): Promise<Uint8Array> {
  
  let restoreVisibility: (() => void) | null = null;
  
  // Si un trou est spécifié, masquer les autres trous
  if (hole && allHoles) {
    restoreVisibility = hideOtherHoles(mapInstance, hole.number, allHoles);
  }
  
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
      
      // Marge minimale de 1 mètre
      const marginMeters = 1;
      const marginLat = marginMeters / 111000; // ~111km par degré
      const marginLng = marginMeters / (111000 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
      
      const bounds: [[number, number], [number, number]] = [
        [minLat - marginLat, minLng - marginLng],
        [maxLat + marginLat, maxLng + marginLng]
      ];
      
      // Calculer le zoom optimal avec getBoundsZoom
      const zoom = mapInstance.getBoundsZoom(bounds, false, [0, 0]);
      const center = [
        (minLat + maxLat) / 2,
        (minLng + maxLng) / 2
      ];
      
      // Appliquer le zoom (Leaflet arrondit à l'entier)
      mapInstance.setView(center, zoom, { animate: false });
    }
  } else if (allHoles && allHoles.length > 0) {
    // Vue complète du parcours - analyser tous les tees et paniers
    const allPoints: [number, number][] = [];
    
    for (const h of allHoles) {
      const tee = h.elements.find(el => el.type === 'tee');
      const basket = h.elements.find(el => el.type === 'basket');
      
      if (tee && tee.position) {
        allPoints.push([tee.position.lat, tee.position.lng]);
      }
      if (basket && basket.position) {
        allPoints.push([basket.position.lat, basket.position.lng]);
      }
      
      // Ajouter aussi les trajectoires pour un cadrage complet
      const flightPath = h.elements.find(el => el.type === 'flight-path');
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
    },
    filter: (node: HTMLElement) => {
      // Filtrer les contrôles Leaflet
      if (node.classList) {
        return !node.classList.contains('leaflet-control-container') &&
               !node.classList.contains('leaflet-control');
      }
      return true;
    },
    // Ignorer les erreurs CORS des feuilles de style externes
    cacheBust: false,
    imagePlaceholder: undefined
  });
  
  // Recadrer l'image pour enlever les zones vides (trim)
  if (hole) {
    const trimResult = await trimImage(dataUrl, hole, mapInstance, mapContainer);
    dataUrl = trimResult.dataUrl;
  }

  // Restaurer la visibilité des autres trous
  if (restoreVisibility) {
    restoreVisibility();
  }

  // Convertir dataUrl en Uint8Array
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * Exporte le parcours en format DOCX
 */
export async function exportCourseToDocx(
  state: LeafletDrawingState,
  mapInstance: any,
  mapContainer: HTMLElement
): Promise<void> {
  console.log('📝 Début de l\'export DOCX...');

  const stats = calculateOverallStats(state.holes);
  const sections = [];

  // ========== SECTION 1 : PAGE DE TITRE ET STATISTIQUES ==========
  
  const titleParagraphs = [
    new Paragraph({
      children: [
        new TextRun({
          text: state.name || 'Parcours de Disc Golf',
          font: 'Arial',
          size: 40, // 20pt = 40 half-points
          bold: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
          font: 'Arial',
          size: 22 // 11pt = 22 half-points
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Statistiques du parcours',
          font: 'Arial',
          size: 28, // 14pt = 28 half-points
          bold: true,
          color: 'FFFFFF'
        })
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 200, after: 200 },
      shading: {
        fill: '156082' // Bleu foncé comme le modèle
      },
      border: {
        top: { style: BorderStyle.SINGLE, size: 18, color: '156082' },
        bottom: { style: BorderStyle.SINGLE, size: 18, color: '156082' },
        left: { style: BorderStyle.SINGLE, size: 18, color: '156082' },
        right: { style: BorderStyle.SINGLE, size: 18, color: '156082' }
      }
    })
  ];

  // Tableau des statistiques - structure simplifiée
  const statsTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    columnWidths: [5000, 5000],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Nombre de trous', bold: true, font: 'Arial' })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: stats.totalHoles.toString(), font: 'Arial' })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Par total', bold: true, font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: stats.totalPar.toString(), font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Distance à vol d\'oiseau', bold: true, font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${stats.totalDistanceStraight} m`, font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Distance trajectoire', bold: true, font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${stats.totalDistancePath} m`, font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          })
        ]
      })
    ]
  });

  const firstSectionElements = [
    ...titleParagraphs,
    statsTable,
    new Paragraph({ text: '', spacing: { after: 400 } })
  ];

  // Carte du parcours complet
  console.log('📷 Capture de la carte complète...');
  try {
    const overviewImageBytes = await captureMap(mapInstance, mapContainer, undefined, state.holes);
    firstSectionElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Vue d\'ensemble du parcours',
            font: 'Arial',
            size: 20, // 10pt = 20 half-points
            color: '000000'
          })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { before: 200, after: 120 },
        shading: {
          fill: 'C1E4F5' // Bleu clair comme le modèle
        },
        border: {
          top: { style: BorderStyle.SINGLE, size: 18, color: 'C1E4F5' },
          bottom: { style: BorderStyle.SINGLE, size: 18, color: 'C1E4F5' },
          left: { style: BorderStyle.SINGLE, size: 18, color: 'C1E4F5' },
          right: { style: BorderStyle.SINGLE, size: 18, color: 'C1E4F5' }
        }
      }),
      new Paragraph({
        children: [
          new ImageRun({
            data: overviewImageBytes,
            transformation: {
              width: 600,
              height: 400
            }
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
    console.log('✅ Carte complète capturée');
  } catch (error) {
    console.error('❌ Erreur capture carte complète:', error);
  }

  // Tableau récapitulatif des trous - structure simplifiée
  const holesTableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Trou', bold: true, font: 'Arial' })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Par', bold: true, font: 'Arial' })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Vol d\'oiseau', bold: true, font: 'Arial' })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Trajectoire', bold: true, font: 'Arial' })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        })
      ]
    })
  ];

  for (const hole of state.holes) {
    const holeStats = calculateHoleStats(hole);
    holesTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: hole.number.toString(), font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: (hole.par || 3).toString(), font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${holeStats.straightDistance}m`, font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${holeStats.flightPathDistance}m`, font: 'Arial' })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          })
        ]
      })
    );
  }

  const holesTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    columnWidths: [2500, 2500, 2500, 2500],
    rows: holesTableRows
  });

  firstSectionElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Detail des trous',
          font: 'Arial',
          size: 20, // 10pt = 20 half-points
          color: '000000'
        })
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 400, after: 120 },
      shading: {
        fill: 'C1E4F5' // Bleu clair comme le modèle
      },
      border: {
        top: { style: BorderStyle.SINGLE, size: 18, color: 'C1E4F5' },
        bottom: { style: BorderStyle.SINGLE, size: 18, color: 'C1E4F5' },
        left: { style: BorderStyle.SINGLE, size: 18, color: 'C1E4F5' },
        right: { style: BorderStyle.SINGLE, size: 18, color: 'C1E4F5' }
      }
    }),
    holesTable
  );

  sections.push({
    children: firstSectionElements
  });

  // ========== PAGES SUIVANTES : DÉTAIL DE CHAQUE TROU ==========
  
  for (const hole of state.holes) {
    const holeStats = calculateHoleStats(hole);
    const holeElements = [
      new Paragraph({
        children: [
          new TextRun({
            text: `Trou ${hole.number}`,
            font: 'Arial',
            size: 28, // 14pt = 28 half-points
            bold: true,
            color: 'FFFFFF'
          })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 200 },
        shading: {
          fill: '156082' // Bleu foncé comme le modèle
        },
        border: {
          top: { style: BorderStyle.SINGLE, size: 18, color: '156082' },
          bottom: { style: BorderStyle.SINGLE, size: 18, color: '156082' },
          left: { style: BorderStyle.SINGLE, size: 18, color: '156082' },
          right: { style: BorderStyle.SINGLE, size: 18, color: '156082' }
        }
      })
    ];

    // Tableau d'informations du trou - structure simplifiée
    const holeInfoTable = new Table({
      width: {
        size: 50,
        type: WidthType.PERCENTAGE
      },
      columnWidths: [5000, 5000],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Par', bold: true, font: 'Arial' })] })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: (hole.par || 3).toString(), font: 'Arial' })] })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Distance (vol d\'oiseau)', bold: true, font: 'Arial' })] })],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${holeStats.straightDistance} m`, font: 'Arial' })] })],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Distance (trajectoire)', bold: true, font: 'Arial' })] })],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${holeStats.flightPathDistance} m`, font: 'Arial' })] })],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            })
          ]
        })
      ]
    });

    holeElements.push(
      holeInfoTable,
      new Paragraph({ text: '', spacing: { after: 200 } })
    );

    // Capture de la carte du trou
    console.log(`📷 Capture du trou ${hole.number}...`);
    try {
      const holeImageBytes = await captureMap(mapInstance, mapContainer, hole, state.holes);
      holeElements.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: holeImageBytes,
              transformation: {
                width: 600,
                height: 400
              }
            })
          ],
          alignment: AlignmentType.CENTER
        })
      );
      console.log(`✅ Trou ${hole.number} capturé`);
    } catch (error) {
      console.error(`❌ Erreur capture trou ${hole.number}:`, error);
    }

    sections.push({
      properties: {
        type: 'nextPage'
      },
      children: holeElements
    });
  }

  // Créer le document
  const doc = new Document({
    sections: sections as any
  });

  // Générer et télécharger le fichier
  console.log('💾 Génération du fichier DOCX...');
  const blob = await Packer.toBlob(doc);
  const fileName = `${state.name || 'parcours'}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
  
  console.log('✅ Export DOCX terminé !');
}
