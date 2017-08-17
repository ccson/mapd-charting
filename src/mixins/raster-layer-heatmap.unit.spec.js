import { expect } from "chai"
import rasterLayer from "./raster-layer"
import rasterLayerHeatmapMixin from "./raster-layer-heatmap-mixin"

const spec = {
  mark: "square",
  encoding: {
    x: {
      type: "quantitative",
      field: "lon",
      size: 1000
    },
    y: {
      type: "quantitative",
      field: "lat",
      size: 1000
    },
    color: {
      type: "quantize",
      aggregate: "count",
      field: "*",
      scale: {
        domain: [0, 25],
        range: [
          "#0d0887",
          "#f7e425",
          "#f0f921"
        ],
        default: "#0d0887",
        nullValue: "#0d0887"
      }
    },
    size: "auto"
  }
}

describe("rasterLayerHeatmapMixin", () => {
  it("should have the correct getters/setters", () => {
    const layer = rasterLayer("heat")
    const xDim = "xDim"
    const yDim = "yDim"
    layer.xDim(xDim)
    layer.yDim(yDim)
    expect(layer.xDim()).to.equal(xDim)
    expect(layer.yDim()).to.equal(yDim)
  })

  describe("layer state", () => {
    it("should be able to be set and retrieved", () => {
      const layer = rasterLayer("heat")
      layer.setState(spec)
      expect(layer.getState()).to.not.equal(spec)
      expect(layer.getState()).to.deep.equal(spec)
    })
  })

  describe("_genVega", () => {
    it("should transform vega-lite spec (state) to full vega spec", () => {
      const layer = rasterLayer("heat")
      layer.setState(spec)

      const vegaSpec = layer._genVega({
        table: "tweets_nov_feb",
        width: 100,
        height: 100,
        filter: "lon = 100",
        min: [-50, 50],
        max: [-50, 50],
        neLat: 1000,
        zoom: 10
      })

       expect(vegaSpec).to.deep.equal({
         data: {
           name: "heatmap_query",
           sql: "SELECT rect_pixel_bin(conv_4326_900913_x(lon), -50, -50, 100, 100) as x, "
            + "rect_pixel_bin(conv_4326_900913_y(lat), 50, 50, 100, 100) as y, "
            + "COUNT(*) as color FROM tweets_nov_feb WHERE (lon = 100) GROUP BY x, y"
         },
         scales: [
           {
             name: "heat_color",
             type: "quantize",
             domain: [0, 25],
             range: [
               "#0d0887",
               "#f7e425",
               "#f0f921"
             ],
             default: "#0d0887",
             nullValue: "#0d0887"
           }
         ],
         mark: {
           type: "symbol",
           from: {
             data: "heatmap_query"
           },
           properties: {
             shape: "square",
             x: {
               field: "x"
             },
             y: {
               field: "y"
             },
             width: 1,
             height: 1,
             fillColor: {
               scale: "heat_color",
               field: "color"
             }
           }
         }
       })
    })
  })
})