import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

import styles from "./App.module.css";
import initFakeData from "./utils/globalMock/mockGenerator";
import { createEntities } from "./utils/createEntities";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYWY4ODUyMC1kYzRkLTRkMzEtOTczNS0wY2JkNzI4ODlhYWYiLCJpZCI6ODM0NzcsImlhdCI6MTY0NTYwNzYyOH0.2hWt0sf57NEZekKTGqDp5WadUzPPX3Z4aU4__Ou400U";

export const App = () => {
  const viewerElementRef = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const fakeDataRef = useRef<any>(null);

  useEffect(() => {
    if (viewerElementRef.current) {
      viewerElementRef.current = new Cesium.Viewer(viewerElementRef?.current, {
        maximumRenderTimeChange: Infinity,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: true,
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (viewerElementRef && isVisible) {
        fakeDataRef.current = await initFakeData();
        createEntities(viewerElementRef, fakeDataRef.current);
      }

      if (!isVisible) {
        fakeDataRef.current = null;
        viewerElementRef.current.entities.removeAll();
      }
    })();
  }, [viewerElementRef, isVisible, fakeDataRef]);

  return (
    <div ref={viewerElementRef}>
      <button className={styles.btn} onClick={() => setIsVisible((prev) => !prev)}>
        {!isVisible ? "Start" : "Stop"}
      </button>
    </div>
  );
};
