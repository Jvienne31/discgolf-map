
import { useEffect } from 'react';
import * as L from 'leaflet';
import { useLeafletDrawing } from '../contexts/LeafletDrawingContext';

const MeasurementLayer = () => {
  const { state } = useLeafletDrawing();
  const { map, measurement } = state;

  useEffect(() => {
    if (!map) return;

    const layerGroup = new L.LayerGroup().addTo(map);

    if (measurement && measurement.points.length > 0) {
      const latLngPoints = measurement.points.map(p => L.latLng(p.lat, p.lng));

      // Draw the main line
      const polyline = L.polyline(latLngPoints, {
        color: '#FFD700', // Gold color
        weight: 3,
        dashArray: '5, 10',
      }).addTo(layerGroup);

      let totalDistance = 0;

      // Draw circles for each point and tooltips for segments
      latLngPoints.forEach((point, index) => {
        L.circleMarker(point, { 
            radius: 4, 
            fillColor: '#FFD700',
            color: '#000',
            weight: 1,
            fillOpacity: 1
        }).addTo(layerGroup);

        if (index > 0) {
          const prevPoint = latLngPoints[index - 1];
          const segmentDistance = prevPoint.distanceTo(point);
          totalDistance += segmentDistance;

          // Segment tooltip
          const midPoint = L.latLng(
            (prevPoint.lat + point.lat) / 2,
            (prevPoint.lng + point.lng) / 2
          );
          L.tooltip({
            permanent: true,
            direction: 'bottom',
            className: 'measurement-tooltip',
            offset: [0, 10],
          })
          .setLatLng(midPoint)
          .setContent(`${segmentDistance.toFixed(1)} m`)
          .addTo(layerGroup);
        }
      });

      // Total distance tooltip at the end of the line
      if (latLngPoints.length > 1) {
        const lastPoint = latLngPoints[latLngPoints.length - 1];
        L.tooltip({
          permanent: true,
          direction: 'right',
          className: 'measurement-tooltip-total',
          offset: [10, 0],
        })
        .setLatLng(lastPoint)
        .setContent(`<strong>Total: ${totalDistance.toFixed(1)} m</strong>`)
        .addTo(layerGroup);
      }
    }

    // Cleanup function
    return () => {
      layerGroup.clearLayers();
      map.removeLayer(layerGroup);
    };
  }, [measurement, map]);

  return null; // This component does not render anything itself
};

export default MeasurementLayer;
