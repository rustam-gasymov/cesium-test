import { FC, useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

import styles from "./App.module.css";
import initFakeData from "./utils/globalMock/mockGenerator";
import { createEntities } from "./utils/createEntities";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYWY4ODUyMC1kYzRkLTRkMzEtOTczNS0wY2JkNzI4ODlhYWYiLCJpZCI6ODM0NzcsImlhdCI6MTY0NTYwNzYyOH0.2hWt0sf57NEZekKTGqDp5WadUzPPX3Z4aU4__Ou400U";

export const App = () => {
  const viewerElementRef = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<any>([]);

  useEffect(() => {
    if (viewerElementRef.current) {
      viewerElementRef.current = new Cesium.Viewer(viewerElementRef?.current, {
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: true,
        // targetFrameRate: 30
        // terrainProvider: Cesium.createWorldTerrain(),
      });
      // viewerElementRef.current.scene.debugShowFramesPerSecond = true;
      // viewerElementRef.current.scene.globe.enableLighting = false;
      // viewerElementRef.current.scene.globe.depthTestAgainstTerrain = false;
    }
  }, [viewerElementRef]);

  useEffect(() => {
    (async () => {
      if (viewerElementRef && isVisible) {
        const fakeData = await initFakeData();
        createEntities(viewerElementRef, fakeData);
        // setData(fakeData);
      }

      if (!isVisible) {
        viewerElementRef.current.entities.removeAll();
      }

      // console.log("current viewer", viewerElementRef.current.entities);
    })();
  }, [viewerElementRef, isVisible]);

  return (
    <div ref={viewerElementRef}>
      <button className={styles.btn} onClick={() => setIsVisible((prev) => !prev)}>
        {!isVisible ? "Start" : "Stop"}
      </button>
    </div>
  );
};
