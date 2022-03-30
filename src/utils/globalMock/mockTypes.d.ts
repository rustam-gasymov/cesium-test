import { Cartesian3 } from "cesium";
export interface IEntity extends genericFields {
  name: string;
  description: string;
  posStart: number;
  posEnd: number;
  position: Cartesian3;
}

export type ENTITY_LITERALS = "POLYGON" | "POLYLINE" | "POINT" | "ELLIPSE";

interface coordinates {
  lat: number;
  lon: number;
}

interface genericFields {
  id: number;
  type: ENTITY_LITERALS;
}

export interface IPolyline extends genericFields, coordinates {
  width: number;
}

export interface IPolygon extends genericFields, coordinates {}

export interface IPoint extends genericFields, coordinates {
  pixelSize: number;
  color: string;
}

export interface IEllipse extends genericFields, coordinates {
  semiMinorAxis: number;
  semiMajorAxis: number;
  color: string;
}

export type EntityChildTypes = IEllipse | IPoint | IPolygon | IPolyline;
export interface IResSchema {
  entity: IEntity;
  childData: EntityChildTypes;
}

export type IResSchemaItems = Array<IResSchema>;
