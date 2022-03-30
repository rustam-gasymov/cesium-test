import Cartesian2 from "../Core/Cartesian2.js";
import Cartographic from "../Core/Cartographic.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import GeographicProjection from "../Core/GeographicProjection.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TileProviderError from "../Core/TileProviderError.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import when from "../ThirdParty/when.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";

/**
 * @typedef {Object} TileMapServiceImageryProvider.ConstructorOptions
 *
 * Initialization options for the TileMapServiceImageryProvider constructor
 *
 * @property {Resource|String|Promise<Resource>|Promise<String>} [url='.'] Path to image tiles on server.
 * @property {String} [fileExtension='png'] The file extension for images on the server.
 * @property {Credit|String} [credit=''] A credit for the data source, which is displayed on the canvas.
 * @property {Number} [minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @property {Number} [maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @property {TilingScheme} [tilingScheme] The tiling scheme specifying how the ellipsoidal
 * surface is broken into tiles.  If this parameter is not provided, a {@link WebMercatorTilingScheme}
 * is used.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 *                    parameter is specified, the WGS84 ellipsoid is used.
 * @property {Number} [tileWidth=256] Pixel width of image tiles.
 * @property {Number} [tileHeight=256] Pixel height of image tiles.
 * @property {Boolean} [flipXY] Older versions of gdal2tiles.py flipped X and Y values in tilemapresource.xml.
 * Specifying this option will do the same, allowing for loading of these incorrect tilesets.
 */

/**
 * An imagery provider that provides tiled imagery as generated by
 * {@link http://www.maptiler.org/|MapTiler}, {@link http://www.klokan.cz/projects/gdal2tiles/|GDAL2Tiles}, etc.
 *
 * @alias TileMapServiceImageryProvider
 * @constructor
 * @extends UrlTemplateImageryProvider
 *
 * @param {TileMapServiceImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @see ArcGisMapServerImageryProvider
 * @see BingMapsImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see OpenStreetMapImageryProvider
 * @see SingleTileImageryProvider
 * @see WebMapServiceImageryProvider
 * @see WebMapTileServiceImageryProvider
 * @see UrlTemplateImageryProvider
 *
 * @example
 * const tms = new Cesium.TileMapServiceImageryProvider({
 *    url : '../images/cesium_maptiler/Cesium_Logo_Color',
 *    fileExtension: 'png',
 *    maximumLevel: 4,
 *    rectangle: new Cesium.Rectangle(
 *        Cesium.Math.toRadians(-120.0),
 *        Cesium.Math.toRadians(20.0),
 *        Cesium.Math.toRadians(-60.0),
 *        Cesium.Math.toRadians(40.0))
 * });
 */
function TileMapServiceImageryProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.url)) {
    throw new DeveloperError("options.url is required.");
  }
  //>>includeEnd('debug');

  const deferred = when.defer();
  UrlTemplateImageryProvider.call(this, deferred.promise);

  this._tmsResource = undefined;
  this._xmlResource = undefined;
  this._options = options;
  this._deferred = deferred;
  this._metadataError = undefined;

  this._metadataSuccess = this._metadataSuccess.bind(this);
  this._metadataFailure = this._metadataFailure.bind(this);
  this._requestMetadata = this._requestMetadata.bind(this);

  let resource;
  const that = this;
  when(options.url)
    .then(function (url) {
      resource = Resource.createIfNeeded(url);
      resource.appendForwardSlash();

      that._tmsResource = resource;
      that._xmlResource = resource.getDerivedResource({
        url: "tilemapresource.xml",
      });

      that._requestMetadata();
    })
    .otherwise(function (e) {
      deferred.reject(e);
    });
}

if (defined(Object.create)) {
  TileMapServiceImageryProvider.prototype = Object.create(
    UrlTemplateImageryProvider.prototype
  );
  TileMapServiceImageryProvider.prototype.constructor = TileMapServiceImageryProvider;
}

TileMapServiceImageryProvider.prototype._requestMetadata = function () {
  // Try to load remaining parameters from XML
  this._xmlResource
    .fetchXML()
    .then(this._metadataSuccess)
    .otherwise(this._metadataFailure);
};

/**
 * Mutates the properties of a given rectangle so it does not extend outside of the given tiling scheme's rectangle
 * @private
 */
function confineRectangleToTilingScheme(rectangle, tilingScheme) {
  if (rectangle.west < tilingScheme.rectangle.west) {
    rectangle.west = tilingScheme.rectangle.west;
  }
  if (rectangle.east > tilingScheme.rectangle.east) {
    rectangle.east = tilingScheme.rectangle.east;
  }
  if (rectangle.south < tilingScheme.rectangle.south) {
    rectangle.south = tilingScheme.rectangle.south;
  }
  if (rectangle.north > tilingScheme.rectangle.north) {
    rectangle.north = tilingScheme.rectangle.north;
  }
  return rectangle;
}

function calculateSafeMinimumDetailLevel(
  tilingScheme,
  rectangle,
  minimumLevel
) {
  // Check the number of tiles at the minimum level.  If it's more than four,
  // try requesting the lower levels anyway, because starting at the higher minimum
  // level will cause too many tiles to be downloaded and rendered.
  const swTile = tilingScheme.positionToTileXY(
    Rectangle.southwest(rectangle),
    minimumLevel
  );
  const neTile = tilingScheme.positionToTileXY(
    Rectangle.northeast(rectangle),
    minimumLevel
  );
  const tileCount =
    (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
  if (tileCount > 4) {
    return 0;
  }
  return minimumLevel;
}

TileMapServiceImageryProvider.prototype._metadataSuccess = function (xml) {
  const tileFormatRegex = /tileformat/i;
  const tileSetRegex = /tileset/i;
  const tileSetsRegex = /tilesets/i;
  const bboxRegex = /boundingbox/i;
  let format, bbox, tilesets;
  const tilesetsList = []; //list of TileSets
  const xmlResource = this._xmlResource;
  let metadataError = this._metadataError;
  const deferred = this._deferred;
  const requestMetadata = this._requestMetadata;

  // Allowing options properties (already copied to that) to override XML values

  // Iterate XML Document nodes for properties
  const nodeList = xml.childNodes[0].childNodes;
  for (let i = 0; i < nodeList.length; i++) {
    if (tileFormatRegex.test(nodeList.item(i).nodeName)) {
      format = nodeList.item(i);
    } else if (tileSetsRegex.test(nodeList.item(i).nodeName)) {
      tilesets = nodeList.item(i); // Node list of TileSets
      const tileSetNodes = nodeList.item(i).childNodes;
      // Iterate the nodes to find all TileSets
      for (let j = 0; j < tileSetNodes.length; j++) {
        if (tileSetRegex.test(tileSetNodes.item(j).nodeName)) {
          // Add them to tilesets list
          tilesetsList.push(tileSetNodes.item(j));
        }
      }
    } else if (bboxRegex.test(nodeList.item(i).nodeName)) {
      bbox = nodeList.item(i);
    }
  }

  let message;
  if (!defined(tilesets) || !defined(bbox)) {
    message = `Unable to find expected tilesets or bbox attributes in ${xmlResource.url}.`;
    metadataError = TileProviderError.handleError(
      metadataError,
      this,
      this.errorEvent,
      message,
      undefined,
      undefined,
      undefined,
      requestMetadata
    );
    if (!metadataError.retry) {
      deferred.reject(new RuntimeError(message));
    }
    this._metadataError = metadataError;
    return;
  }

  const options = this._options;
  const fileExtension = defaultValue(
    options.fileExtension,
    format.getAttribute("extension")
  );
  const tileWidth = defaultValue(
    options.tileWidth,
    parseInt(format.getAttribute("width"), 10)
  );
  const tileHeight = defaultValue(
    options.tileHeight,
    parseInt(format.getAttribute("height"), 10)
  );
  let minimumLevel = defaultValue(
    options.minimumLevel,
    parseInt(tilesetsList[0].getAttribute("order"), 10)
  );
  const maximumLevel = defaultValue(
    options.maximumLevel,
    parseInt(tilesetsList[tilesetsList.length - 1].getAttribute("order"), 10)
  );
  const tilingSchemeName = tilesets.getAttribute("profile");
  let tilingScheme = options.tilingScheme;

  if (!defined(tilingScheme)) {
    if (
      tilingSchemeName === "geodetic" ||
      tilingSchemeName === "global-geodetic"
    ) {
      tilingScheme = new GeographicTilingScheme({
        ellipsoid: options.ellipsoid,
      });
    } else if (
      tilingSchemeName === "mercator" ||
      tilingSchemeName === "global-mercator"
    ) {
      tilingScheme = new WebMercatorTilingScheme({
        ellipsoid: options.ellipsoid,
      });
    } else {
      message = `${xmlResource.url}specifies an unsupported profile attribute, ${tilingSchemeName}.`;
      metadataError = TileProviderError.handleError(
        metadataError,
        this,
        this.errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestMetadata
      );
      if (!metadataError.retry) {
        deferred.reject(new RuntimeError(message));
      }
      this._metadataError = metadataError;
      return;
    }
  }

  // rectangle handling
  let rectangle = Rectangle.clone(options.rectangle);

  if (!defined(rectangle)) {
    let sw;
    let ne;
    let swXY;
    let neXY;

    // In older versions of gdal x and y values were flipped, which is why we check for an option to flip
    // the values here as well. Unfortunately there is no way to autodetect whether flipping is needed.
    const flipXY = defaultValue(options.flipXY, false);
    if (flipXY) {
      swXY = new Cartesian2(
        parseFloat(bbox.getAttribute("miny")),
        parseFloat(bbox.getAttribute("minx"))
      );
      neXY = new Cartesian2(
        parseFloat(bbox.getAttribute("maxy")),
        parseFloat(bbox.getAttribute("maxx"))
      );
    } else {
      swXY = new Cartesian2(
        parseFloat(bbox.getAttribute("minx")),
        parseFloat(bbox.getAttribute("miny"))
      );
      neXY = new Cartesian2(
        parseFloat(bbox.getAttribute("maxx")),
        parseFloat(bbox.getAttribute("maxy"))
      );
    }

    // Determine based on the profile attribute if this tileset was generated by gdal2tiles.py, which
    // uses 'mercator' and 'geodetic' profiles, or by a tool compliant with the TMS standard, which is
    // 'global-mercator' and 'global-geodetic' profiles. In the gdal2Tiles case, X and Y are always in
    // geodetic degrees.
    const isGdal2tiles =
      tilingSchemeName === "geodetic" || tilingSchemeName === "mercator";
    if (
      tilingScheme.projection instanceof GeographicProjection ||
      isGdal2tiles
    ) {
      sw = Cartographic.fromDegrees(swXY.x, swXY.y);
      ne = Cartographic.fromDegrees(neXY.x, neXY.y);
    } else {
      const projection = tilingScheme.projection;
      sw = projection.unproject(swXY);
      ne = projection.unproject(neXY);
    }

    rectangle = new Rectangle(
      sw.longitude,
      sw.latitude,
      ne.longitude,
      ne.latitude
    );
  }

  // The rectangle must not be outside the bounds allowed by the tiling scheme.
  rectangle = confineRectangleToTilingScheme(rectangle, tilingScheme);
  // clamp our minimum detail level to something that isn't going to request a ridiculous number of tiles
  minimumLevel = calculateSafeMinimumDetailLevel(
    tilingScheme,
    rectangle,
    minimumLevel
  );

  const templateResource = this._tmsResource.getDerivedResource({
    url: `{z}/{x}/{reverseY}.${fileExtension}`,
  });

  deferred.resolve({
    url: templateResource,
    tilingScheme: tilingScheme,
    rectangle: rectangle,
    tileWidth: tileWidth,
    tileHeight: tileHeight,
    minimumLevel: minimumLevel,
    maximumLevel: maximumLevel,
    tileDiscardPolicy: options.tileDiscardPolicy,
    credit: options.credit,
  });
};

TileMapServiceImageryProvider.prototype._metadataFailure = function (error) {
  // Can't load XML, still allow options and defaults
  const options = this._options;
  const fileExtension = defaultValue(options.fileExtension, "png");
  const tileWidth = defaultValue(options.tileWidth, 256);
  const tileHeight = defaultValue(options.tileHeight, 256);
  const maximumLevel = options.maximumLevel;
  const tilingScheme = defined(options.tilingScheme)
    ? options.tilingScheme
    : new WebMercatorTilingScheme({ ellipsoid: options.ellipsoid });

  let rectangle = defaultValue(options.rectangle, tilingScheme.rectangle);
  // The rectangle must not be outside the bounds allowed by the tiling scheme.
  rectangle = confineRectangleToTilingScheme(rectangle, tilingScheme);

  // make sure we use a safe minimum detail level, so we don't request a ridiculous number of tiles
  const minimumLevel = calculateSafeMinimumDetailLevel(
    tilingScheme,
    rectangle,
    options.maximumLevel
  );

  const templateResource = this._tmsResource.getDerivedResource({
    url: `{z}/{x}/{reverseY}.${fileExtension}`,
  });

  this._deferred.resolve({
    url: templateResource,
    tilingScheme: tilingScheme,
    rectangle: rectangle,
    tileWidth: tileWidth,
    tileHeight: tileHeight,
    minimumLevel: minimumLevel,
    maximumLevel: maximumLevel,
    tileDiscardPolicy: options.tileDiscardPolicy,
    credit: options.credit,
  });
};

export default TileMapServiceImageryProvider;
