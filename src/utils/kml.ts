
import { CourseHole, CourseElement } from '../contexts/types';
import * as L from 'leaflet';
import * as turf from '@turf/turf';

const generateKMLContent = (courseName: string, holes: CourseHole[]): string => {
  const placemarks = holes
    .flatMap(hole => hole.elements.map(element => createPlacemark(element, hole.number)))
    .filter(Boolean)
    .join('\n');

  // Générer les styles de mandatories dynamiquement
  const mandatoryStyles = new Set<string>();
  holes.forEach(hole => {
    hole.elements.forEach(element => {
        if (element.type === 'mandatory' && element.position) {
            const kmlHeading = (-(element.properties?.angle || 0) + 360) % 360;
            const styleId = `mandatory-style-${kmlHeading}`;
            mandatoryStyles.add(`
    <Style id="${styleId}">
        <IconStyle>
            <Icon><href>http://maps.google.com/mapfiles/kml/shapes/arrow.png</href></Icon>
            <heading>${kmlHeading}</heading>
            <hotSpot x="0.5" y="0.5" xunits="fraction" yunits="fraction"/>
        </IconStyle>
    </Style>`);
        }
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${courseName}</name>
    
    {/* --- STYLES PARTAGÉS --- */}
    <Style id="tee-style">
        <IconStyle>
            <Icon><href>http://maps.google.com/mapfiles/kml/paddle/T.png</href></Icon>
            <hotSpot x="0.5" y="0.5" xunits="fraction" yunits="fraction"/>
        </IconStyle>
    </Style>
    <Style id="basket-style">
        <IconStyle>
            <Icon><href>http://maps.google.com/mapfiles/kml/shapes/target.png</href></Icon>
            <hotSpot x="0.5" y="0.5" xunits="fraction" yunits="fraction"/>
        </IconStyle>
    </Style>
    <Style id="flight-path-style">
        <LineStyle><color>ff3bfbeb</color><width>4</width></LineStyle>
    </Style>
    <Style id="ob-zone-style">
        <LineStyle><color>ff0000ff</color><width>2</width></LineStyle>
        <PolyStyle><color>880000ff</color></PolyStyle>
    </Style>
    <Style id="hazard-zone-style">
        <LineStyle><color>ff00aaff</color><width>2</width></LineStyle>
        <PolyStyle><color>8800aaff</color></PolyStyle>
    </Style>
    ${[...mandatoryStyles].join('\n')}

    ${placemarks}
  </Document>
</kml>`;
};

const createPlacemark = (element: CourseElement, holeNumber: number): string => {
    const name = element.properties?.name || `${element.type} - Trou ${holeNumber}`;

    switch (element.type) {
        case 'tee':
            return element.position ? createPointPlacemark(name, '#tee-style', element.position) : '';
        case 'basket':
            return element.position ? createPointPlacemark(name, '#basket-style', element.position) : '';
        case 'mandatory':
            if (!element.position) return '';
            const kmlHeading = (-(element.properties?.angle || 0) + 360) % 360;
            const styleUrl = `#mandatory-style-${kmlHeading}`;
            return createPointPlacemark(name, styleUrl, element.position);
        case 'flight-path':
            return (element.path && element.path.length >= 2) ? createFlightPathPlacemark(name, '#flight-path-style', element.path) : '';
        case 'ob-zone':
            return element.coordinates ? createPolygonPlacemark(name, element.coordinates, '#ob-zone-style') : '';
        case 'hazard':
            return element.coordinates ? createPolygonPlacemark(name, element.coordinates, '#hazard-zone-style') : '';
        default:
            return '';
    }
};

const createPointPlacemark = (name: string, styleUrl: string, position: L.LatLngLiteral): string => `
<Placemark>
  <name>${name}</name>
  <styleUrl>${styleUrl}</styleUrl>
  <Point><coordinates>${position.lng},${position.lat},0</coordinates></Point>
</Placemark>`;

const createPolygonPlacemark = (name: string, path: L.LatLngLiteral[], styleUrl: string): string => {
    const coordinates = [...path, path[0]].map((p) => `${p.lng},${p.lat},0`).join('\n              ');
    return `
      <Placemark>
        <name>${name}</name>
        <styleUrl>${styleUrl}</styleUrl>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <tessellate>1</tessellate>
              <coordinates>
              ${coordinates}
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`;
};

const createFlightPathPlacemark = (name: string, styleUrl: string, path: L.LatLngLiteral[]): string => {
    const line = turf.lineString(path.map((p: L.LatLngLiteral) => [p.lng, p.lat]));
    const curved = turf.bezierSpline(line, { resolution: 5000 });
    const coordinates = curved.geometry.coordinates.map(p => `${p[0]},${p[1]},0`).join(' ');
    return `
    <Placemark>
      <name>${name}</name>
      <styleUrl>${styleUrl}</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>`;
};

export default generateKMLContent;
