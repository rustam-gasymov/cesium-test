import { IEntity, IResSchemaItems, EntityChildTypes } from "./mockTypes";
import { Cartesian3 } from "cesium";
const mocker = require("mocker-data-generator").default; // (vanilla way)

const ENTITY_TYPES = ["POLYGON", "POLYLINE", "POINT", "ELLIPSE"];
const AMOUNT_OF_ENTITIES = 3000;

// Create a class contructor with a build function (factory pattern)
const entityDataBuilder = () => {
  return {
    id: {
      incrementalId: 0,
    },
    name: {
      chance: "guid",
    },
    description: {
      faker: "lorem.paragraph",
    },
    posStart: { faker: 'random.number({"min": -1000, "max": 1000})' },
    posEnd: { faker: 'random.number({"min": -1000, "max": 1000})' },
  };
};

const childDataBuilder = () => {
  return {
    id: {
      incrementalId: 0,
    },
    type: { values: ENTITY_TYPES },
    name: {
      chance: "guid",
    },
    description: {
      faker: "lorem.paragraph",
    },
    lat: { faker: 'random.number({"min": -90, "max": 90})' },
    lon: { faker: 'random.number({"min": -180, "max": 180})' },
    'object.type=="POLYLINE",width': {
      faker: 'random.number({"min": 0, "max": 10})',
    },
    'object.type=="POINT",pixelSize': {
      faker: 'random.number({"min": 0, "max": 10})',
    },
    'object.type=="POINT",color': {
      values: ["AQUA", "YELLOWGREEN", "FIREBRICK"],
    },
    'object.type=="ELLIPSE",semiMinorAxis': {
      faker: 'random.number({"min": 150000, "max": 200000})',
    },
    'object.type=="ELLIPSE",semiMajorAxis': {
      faker: 'random.number({"min": 210000, "max": 300000})',
    },
    'object.type=="ELLIPSE",color': {
      values: ["AZURE", "CORNSILK", "MEDIUMPURPLE"],
    },
  };
};

const initEntityData = async () => {
  const HEIGHT = 100;
  try {
    const entityData = entityDataBuilder();
    const data = await mocker().schema("entityData", entityData, AMOUNT_OF_ENTITIES).build();
    if (data) {
      const { entityData } = data;
      const arr = entityData.map((item: IEntity) => {
        const { posStart, posEnd, ...restItem } = item;
        const modifiedData = {
          ...restItem,
          position: Cartesian3.fromDegrees(posStart, posEnd, HEIGHT),
        };
        return modifiedData;
      });
      return arr;
    }
  } catch (err) {
    console.error(err);
  }
};

const initEntityChildren = async () => {
  const HEIGHT = 500000;
  try {
    const childData = childDataBuilder();
    const data = await mocker().schema("childData", childData, AMOUNT_OF_ENTITIES).build();

    if (data) {
      const { childData } = data;
      const arr = childData.map((item: EntityChildTypes) => {
        const { lat, lon } = item;
        const modifiedData = {
          ...item,
          position: Cartesian3.fromDegrees(lon, lat, HEIGHT),
        };
        return modifiedData;
      });
      return arr;
    }
  } catch (err) {
    console.error("ERRRRRRRRR", err);
  }
};

const initFakeData = async (): Promise<IResSchemaItems> => {
  // Promise.all
  const entityArr = await initEntityData();
  const entityChildrenArr = await initEntityChildren();

  const fullData = mergeEntityWithRandomType(entityArr, entityChildrenArr);
  return fullData;
  // TODO: generate this random data and render these objects...
};

const mergeEntityWithRandomType = <T extends { id: number }>(
  entityArr: IEntity[],
  randomArr: T[]
): IResSchemaItems => {
  const randomObjFromArr = modifyArrToObject(randomArr);
  const mergedArr = entityArr.map((item: IEntity) => {
    const { id } = item;
    const randomObj = { ...randomObjFromArr[id] };
    return {
      entity: { ...item },
      childData: randomObj,
    };
  });
  // console.log("merged", mergedArr)
  return mergedArr;
};

const modifyArrToObject = <T extends { id: number }>(arr: T[]): any => {
  return arr.reduce((acc, curr) => {
    const { id } = curr;
    return { ...acc, [id]: curr };
  }, {});
};

export default initFakeData;
