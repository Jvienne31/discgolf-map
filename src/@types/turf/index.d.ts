declare module '@turf/turf' {
  import {
    Feature,
    Point,
    Polygon,
    LineString,
    Geometry,
    Position,
    Properties,
  } from 'geojson';

  // Define any necessary types or interfaces used by Turf functions

  export type Units =
    | 'degrees'
    | 'radians'
    | 'miles'
    | 'kilometers';

  export type GeoJsonProperties = Properties;

  // Define options interfaces for Turf functions

  export interface BufferOptions {
    units?: Units;
    steps?: number;
    dissolve?: boolean;
  }

  export interface DistanceOptions {
    units?: Units;
  }

  export interface BezierSplineOptions {
    /** The number of steps to interpolate along the Bezier spline (default: 10000). */
    resolution?: number;
    tessa?: number;
  }

  export interface FeatureOptions {
    bbox?: number[];
    id?: string | number;
  }


  /**
   * Buffers a GeoJSON feature.
   *
   * @param feature - The GeoJSON feature to buffer.
   * @param radius - The radius of the buffer.
   * @param options - Optional parameters.
   * @returns The buffered GeoJSON feature.
   */
  export function buffer<G extends Geometry, P = GeoJsonProperties>(
    feature: Feature<G, P> | G,
    radius: number,
    options?: BufferOptions
  ): Feature<Polygon, P>;

  /**
   * Calculates the distance between two points.
   *
   * @param from - The starting point.
   * @param to - The ending point.
   * @param options - Optional parameters.
   * @returns The distance between the points.
   */
  export function distance<G1 extends Geometry, P1 = GeoJsonProperties, G2 extends Geometry, P2 = GeoJsonProperties>(
    from: Feature<G1, P1> | G1,
    to: Feature<G2, P2> | G2,
    options?: DistanceOptions
  ): number;

  /**
   * Creates a Point feature.
   *
   * @param coordinates - The coordinates of the point [longitude, latitude].
   * @param properties - Optional properties for the feature.
   * @param options - Optional parameters.
   * @returns A Point feature.
   */
  export function point<P = GeoJsonProperties>(
    coordinates: Position,
    properties?: P,
    options?: FeatureOptions
  ): Feature<Point, P>;

  /**
   * Creates a Polygon feature.
   *
   * @param coordinates - The coordinates of the polygon [ring].
   * @param properties - Optional properties for the feature.
   * @param options - Optional parameters.
   * @returns A Polygon feature.
   */
  export function polygon<P = GeoJsonProperties>(
    coordinates: Position[][],
    properties?: P,
    options?: FeatureOptions
  ): Feature<Polygon, P>;

  export function bezierSpline<P = GeoJsonProperties>(
    line: Feature<LineString, P> | LineString,
    options?: BezierSplineOptions & { sharpness?: number }
  ): Feature<LineString, P>;

  export function length<G extends LineString | MultiLineString>(
    geojson: Feature<G> | G,
    options?: { units?: 'meters' | 'kilometers' | 'miles' }
  ): number;

  // Add more function declarations as needed

}
