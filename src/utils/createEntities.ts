import { IEllipse, IEntity, IPoint, IPolygon, IPolyline } from "./globalMock/mockTypes";
import * as Cesium from "cesium";

export const createEntities = (viewer: any, data: any) => {
  if (viewer) {
    // console.log("viewer", viewer?.current);
    // console.log("data", data);

    data?.forEach((item: any) => {
      const { childData, entity } = item;

      switch (childData.type) {
        case "POLYLINE": {
          const data = childData as IPolyline;
          renderPolyline(viewer, data, entity);
          break;
        }
        case "POLYGON": {
          const data = childData as IPolygon;
          renderPolygon(viewer, data, entity);
          break;
        }
        case "POINT": {
          const data = childData as IPoint;
          renderPoint(viewer, data, entity);
          break;
        }
        case "ELLIPSE": {
          const data = childData as IEllipse;
          renderEllipse(viewer, data, entity);
          break;
        }
        default:
          break;
      }
    });
  }
};

const renderPolyline = (viewer: any, polylineData: IPolyline, entity: IEntity) => {
  const { lon: childLong, lat: childLat, width: childWidth } = polylineData;

  viewer.current.entities.add({
    name: entity.name,
    id: entity.id,
    description: entity.description,
    position: entity.position,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        childLong,
        childLat,
        500000,
        childLong - 10,
        childLat - 10,
        500000,
      ]),
      width: childWidth,
      material: new Cesium.PolylineDashMaterialProperty({}),
    },
  });
};

const renderPolygon = (viewer: any, polygonData: IPolygon, entity: IEntity) => {
  const { lon: childLong, lat: childLat } = polygonData;
  viewer.current.entities.add({
    name: entity.name,
    id: entity.id,
    description: entity.description,
    position: entity.position,
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        childLong,
        childLat,
        childLong - 10,
        childLat,
        childLong - 10,
        childLat - 1,
        childLong - 5,
        childLat - 1.5,
      ]),
      material: Cesium.Color.RED,
    },
  });
};

const renderPoint = (viewer: any, pointData: IPoint, entity: IEntity) => {
  const { pixelSize, color } = pointData;
  viewer.current.entities.add({
    name: entity.name,
    id: entity.id,
    description: entity.description,
    position: entity.position,
    point: {
      pixelSize: pixelSize,
      color: Cesium.Color.fromCssColorString(color),
    },
  });
};

const renderEllipse = (viewer: any, ellipseData: IEllipse, entity: IEntity) => {
  const { semiMinorAxis, semiMajorAxis, color } = ellipseData;
  viewer.current.entities.add({
    name: entity.name,
    id: entity.id,
    description: entity.description,
    position: entity.position,
    ellipse: {
      semiMinorAxis: semiMinorAxis,
      semiMajorAxis: semiMajorAxis,
      material: Cesium.Color.fromCssColorString(color).withAlpha(0.5),
    },
  });
};
