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
 * Recadre une image pour enlever les zones vides (trim) - copié du PDF
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
 * Capture une vue de la carte Leaflet - IDENTIQUE au PDF
 */
async function captureMap(
  mapInstance: any,
  mapContainer: HTMLElement,
  hole?: CourseHole,
  allHoles?: CourseHole[]
): Promise<Uint8Array> {
  
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
    const trimResult = await trimImage(dataUrl);
    dataUrl = trimResult.dataUrl;
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
