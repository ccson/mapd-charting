import {createRasterLayerGetterSetter} from "../utils/utils-vega"
import {parser} from "../utils/utils"

const MIN_AREA_IN_METERS = 30
const EARTH_DIAMETER = 40075000

function getPixelSize (neLat, width, zoom) {
  return Math.max(
    MIN_AREA_IN_METERS / (EARTH_DIAMETER * Math.cos(neLat * Math.PI / 180) / (width * Math.pow(2, zoom))),
    1.0
  )
}

function getMarkHeight (type, width) {
  switch (type) {
    case "hex_horiz":
      return 2 * width / Math.sqrt(3.0)
    default:
      return width
  }
}

export default function rasterLayerHeatmapMixin (_layer) {
  let state = {}

  _layer.type = "heatmap"
  _layer.crossfilter = createRasterLayerGetterSetter(_layer, null)
  _layer.xDim = createRasterLayerGetterSetter(_layer, null)
  _layer.yDim = createRasterLayerGetterSetter(_layer, null)
  _layer.dynamicSize = createRasterLayerGetterSetter(_layer, null)
  _layer.dynamicBinning = createRasterLayerGetterSetter(_layer, null)
  _layer._mandatoryAttributes([])

  _layer.setState = function (setterOrState) {
    if (typeof setter === "function") {
      state = setterOrState(state)
    } else {
      state = setterOrState
    }
  }

  _layer.getState = function () {
    return JSON.parse(JSON.stringify(state))
  }

  _layer._genVega = function ({table, width, height, min, max, filter, neLat, zoom}) {
    const pixelSize = getPixelSize(neLat, width, zoom)
    const numBinsX = Math.round(width / pixelSize)
    const markWidth = width / numBinsX
    const markHeight = getMarkHeight(state.mark, markWidth)
    // console.log()
    return {
      "width": width,
      "height": height,
      "data":
        {
          "name": "heatmap_query",
          "sql": parser.writeSQL({
            type: "root",
            source: table,
            transform: [
              {
                type: "filter",
                expr: filter
              },
              {
                type: "pixel_bin",
                width,
                height,
                mark: {
                  shape: state.mark,
                  width: markWidth,
                  height: markHeight,
                },
                x: {
                  field: `conv_4326_900913_x(${state.encoding.x.field})`,
                  domain: [min[0], max[0]]
                },
                y: {
                  field: `conv_4326_900913_y(${state.encoding.y.field})`,
                  domain: [min[1], max[1]]
                },
                aggregate: "COUNT(*)"
              }
            ]
          })
        },
      "scales": [
        {
          name: "heat_color",
          type: state.encoding.color.type,
          domain: state.encoding.color.scale.domain,
          range: state.encoding.color.scale.range,
          default: state.encoding.color.scale.default,
          nullValue: state.encoding.color.scale.nullValue
        }
      ],
      "mark":
        {
          "type": "symbol",
          "from": {
            "data": "heatmap_query"
          },
          "properties": {
            "shape": state.mark,
            "xc": {
              "field": "x"
            },
            "yc": {
              "field": "y"
            },
            "width": markWidth,
            "height": markHeight,
            "fillColor": {
              "scale": "heat_color",
              "field": "color"
            },
          }
        }
    };

  }

  return _layer
}
