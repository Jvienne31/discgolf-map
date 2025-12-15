import { LeafletDrawingState, CourseHole } from '../contexts/types';
import domtoimage from 'dom-to-image-more';
import { lineString, length as turfLength, bezierSpline } from '@turf/turf';

/**
 * Calcule les statistiques d'un trou individuel
 */
function calculateHoleStats(hole: CourseHole) {
  let straightDistance = 0;
  let flightPathDistance = 0;

  const tee = hole.elements.find(el => el.type === 'tee');
  const basket = hole.elements.find(el => el.type === 'basket');

  if (tee && basket && tee.position && basket.position) {
    const teeCoords: [number, number] = [tee.position.lng, tee.position.lat];
    const basketCoords: [number, number] = [basket.position.lng, basket.position.lat];
    const line = lineString([teeCoords, basketCoords]);
    straightDistance = Math.round(turfLength(line, { units: 'meters' }));
  }

  const flightPath = hole.elements.find(el => el.type === 'flight-path');
  if (flightPath && flightPath.path && flightPath.path.length >= 2) {
    const pathLine = lineString(flightPath.path.map(p => [p.lng, p.lat] as [number, number]));
    const curved = bezierSpline(pathLine);
    flightPathDistance = Math.round(turfLength(curved, { units: 'meters' }));
  }

  return { 
    straightDistance, 
    flightPathDistance: flightPathDistance || straightDistance
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
    totalDistancePath += stats.flightPathDistance || stats.straightDistance;
  }

  return {
    totalHoles: holes.length,
    totalPar,
    totalDistanceStraight: Math.round(totalDistanceStraight),
    totalDistancePath: Math.round(totalDistancePath)
  };
}

/**
 * Capture la carte
 */
async function captureMap(
  mapInstance: any,
  mapContainer: HTMLElement,
  hole?: CourseHole,
  allHoles?: CourseHole[]
): Promise<string> {
  
  if (hole) {
    const tee = hole.elements.find(el => el.type === 'tee');
    const basket = hole.elements.find(el => el.type === 'basket');
    
    if (tee && basket && tee.position && basket.position) {
      const allPoints: [number, number][] = [
        [tee.position.lat, tee.position.lng],
        [basket.position.lat, basket.position.lng]
      ];
      
      const flightPath = hole.elements.find(el => el.type === 'flight-path');
      if (flightPath && flightPath.path) {
        flightPath.path.forEach(p => allPoints.push([p.lat, p.lng]));
      }
      
      const lats = allPoints.map(p => p[0]);
      const lngs = allPoints.map(p => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      const marginMeters = 3;
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
  } else if (allHoles && allHoles.length > 0) {
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

  await new Promise(resolve => setTimeout(resolve, 500));
  mapInstance.invalidateSize();
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const dataUrl = await domtoimage.toJpeg(mapContainer, {
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

  return dataUrl;
}

/**
 * Exporte le parcours en format HTML
 */
export async function exportCourseToHtml(
  state: LeafletDrawingState,
  mapInstance: any,
  mapContainer: HTMLElement
): Promise<void> {
  console.log('📝 Début de l\'export HTML...');

  const stats = calculateOverallStats(state.holes);
  
  // Capture de la vue d'ensemble
  console.log('📷 Capture de la carte complète...');
  const overviewImage = await captureMap(mapInstance, mapContainer, undefined, state.holes);
  
  // Capture de chaque trou
  const holeImages: string[] = [];
  for (const hole of state.holes) {
    console.log(`📷 Capture du trou ${hole.number}...`);
    const holeImage = await captureMap(mapInstance, mapContainer, hole, state.holes);
    holeImages.push(holeImage);
  }

  // Générer le HTML
  let html = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv=Content-Type content="text/html; charset=UTF-8">
<meta name=ProgId content=Word.Document>
<meta name=Generator content="Microsoft Word 15">
<title>${state.name || 'Parcours de Disc Golf'}</title>
<style>
body {
  font-family: Arial, sans-serif;
  margin: 10px;
  background: white;
  line-height: 115%;
}
p {
  margin: 0;
}
h1 {
  margin: 10.0pt 0cm 10.0pt 0cm;
  background: #156082;
  color: white;
  padding: 10px;
  font-size: 14.0pt;
  font-weight: bold;
  border: solid #156082 3.0pt;
  text-transform: uppercase;
  letter-spacing: .75pt;
}
h2 {
  margin: 5.0pt 0cm 6.0pt 0cm;
  background: #C1E4F5;
  color: black;
  padding: 10px;
  font-size: 10.0pt;
  font-weight: normal;
  border: solid #C1E4F5 3.0pt;
  text-transform: uppercase;
  letter-spacing: .75pt;
}
.title {
  text-align: center;
  font-size: 20.0pt;
  font-weight: bold;
  margin-bottom: 10.0pt;
  line-height: 115%;
}
.date {
  text-align: center;
  margin-bottom: 20.0pt;
  font-size: 11.0pt;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 5px 0 10px 0;
}
table p {
  margin: 0;
  padding: 0;
}
table.stats-table td {
  border: 1pt solid #156082;
  padding: 2pt 5pt;
  background: white;
}
table.stats-table td:first-child {
  font-weight: bold;
  background: #ECF0F1;
}
table.holes-table {
  margin: 5px 0 10px 0;
}
table.holes-table th {
  border: 1pt solid #2980B9;
  padding: 2pt 5pt;
  background: #2980B9;
  color: white;
  font-weight: bold;
  text-align: left;
}
table.holes-table td {
  border: 1pt solid #E0E0E0;
  padding: 2pt 5pt;
  background: white;
}
table.hole-info-table {
  width: 50%;
  margin: 5px 0 10px 0;
}
table.hole-info-table td {
  border: 1pt solid #3498DB;
  padding: 2pt 5pt;
  background: white;
}
table.hole-info-table td:first-child {
  font-weight: bold;
  background: #ECF0F1;
}
img {
  display: block;
  margin: 5px auto;
  max-width: 650px;
  width: 100%;
  height: auto;
}
.page-break {
  page-break-before: always;
}
@media print {
  .page-break {
    page-break-before: always;
  }
  img {
    max-width: 650px;
    page-break-inside: avoid;
  }
}
</style>
</head>
<body>

<p class="title">${state.name || 'Parcours de Disc Golf'}</p>
<p class="date">Généré le ${new Date().toLocaleDateString('fr-FR')}</p>

<h1>Statistiques du parcours</h1>

<table class="stats-table">
  <tr>
    <td>Nombre de trous</td>
    <td>${stats.totalHoles}</td>
  </tr>
  <tr>
    <td>Par total</td>
    <td>${stats.totalPar}</td>
  </tr>
  <tr>
    <td>Distance à vol d'oiseau</td>
    <td>${stats.totalDistanceStraight} m</td>
  </tr>
  <tr>
    <td>Distance trajectoire</td>
    <td>${stats.totalDistancePath} m</td>
  </tr>
</table>

<h2>Vue d'ensemble du parcours</h2>
<p align="center"><img src="${overviewImage}" alt="Vue d'ensemble"></p>

<h2>Détail des trous</h2>

<table class="holes-table">
  <tr>
    <th>Trou</th>
    <th>Par</th>
    <th>Vol d'oiseau</th>
    <th>Trajectoire</th>
  </tr>`;

  // Ajouter chaque trou dans le tableau récapitulatif
  for (const hole of state.holes) {
    const holeStats = calculateHoleStats(hole);
    html += `
  <tr>
    <td>${hole.number}</td>
    <td>${hole.par || 3}</td>
    <td>${holeStats.straightDistance}m</td>
    <td>${holeStats.flightPathDistance}m</td>
  </tr>`;
  }

  html += `
</table>
`;

  // Ajouter les pages détaillées de chaque trou
  for (let i = 0; i < state.holes.length; i++) {
    const hole = state.holes[i];
    const holeStats = calculateHoleStats(hole);
    
    html += `
<div class="page-break"></div>

<h1>Trou ${hole.number}</h1>

<table class="hole-info-table">
  <tr>
    <td>Par</td>
    <td>${hole.par || 3}</td>
  </tr>
  <tr>
    <td>Distance (vol d'oiseau)</td>
    <td>${holeStats.straightDistance} m</td>
  </tr>
  <tr>
    <td>Distance (trajectoire)</td>
    <td>${holeStats.flightPathDistance} m</td>
  </tr>
</table>

<p align="center"><img src="${holeImages[i]}" alt="Trou ${hole.number}"></p>
`;
  }

  html += `
</body>
</html>`;

  // Télécharger le fichier HTML
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.name || 'parcours'}_${new Date().toISOString().split('T')[0]}.htm`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('✅ Export HTML terminé !');
}
