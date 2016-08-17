export default function asyncCoreMixin (dc) {
  dc._renderId = 0
  dc._redrawId = 0
  dc._renderCount = 0
  dc._redrawCount = 0
  dc._renderIdStack = null
  dc._redrawIdStack = null
  dc._startRenderTime = null
  dc._startRedrawTime = null

  dc.incrementRedrawStack = function () {
    const queryGroupId = dc._redrawId++
    dc._redrawIdStack = queryGroupId
    return queryGroupId
  }

  dc.resetRedrawStack = function () {
    dc._redrawCount = 0
    dc._redrawIdStack = null
  }

  dc.isRedrawStackEmpty = function (queryGroupId) {
    if (queryGroupId) {
      return dc._redrawIdStack === null || dc._redrawIdStack === queryGroupId
    } else {
      return dc._redrawIdStack === null
    }
  }

  dc.isEqualToRedrawCount = function (queryCount) {
    return ++dc._redrawCount === queryCount
  }

  dc.redrawAllAsync = function (group) {
    if (dc._refreshDisabled) {
      return Promise.resolve()
    }

    dc._startRedrawTime = new Date()

    const charts = dc.chartRegistry.list(group)

    const redrawPromises = charts.map((chart) => {
      chart.expireCache()
      return chart.redrawAsync()
    })

    if (dc._renderlet !== null) {
      dc._renderlet(group)
    }

    return Promise.all(redrawPromises)
  }

  dc.redrawAllAsyncWithDebounce = function (group) {
    if (dc._refreshDisabled) {
      return Promise.resolve()
    }

    const stackEmpty = dc.isRedrawStackEmpty()
    const queryGroupId = dc.incrementRedrawStack()
    if (!stackEmpty) {
      return Promise.resolve()
    }

    dc._startRedrawTime = new Date()

    const charts = dc.chartRegistry.list(group)

    const redrawPromises = charts.map((chart) => {
      chart.expireCache()
      if (dc._sampledCount > 0) {
        return chart.redrawAsync(queryGroupId, charts.length - 1)
      } else {
        return chart.redrawAsync(queryGroupId, charts.length)
      }
    })

    if (dc._renderlet !== null) {
      dc._renderlet(group)
    }

    return Promise.all(redrawPromises)
  }

  dc.renderAllAsync = function (group) {
    if (dc._refreshDisabled) {
      return Promise.resolve()
    }

    const queryGroupId = dc._renderId++
    const stackEmpty = dc._renderIdStack === null
    dc._renderIdStack = queryGroupId

    if (!stackEmpty) {
      return Promise.resolve()
    }

    dc._startRenderTime = new Date()

    const charts = dc.chartRegistry.list(group)
    const renderPromises = charts.map((chart) => {
      chart.expireCache()
      if (dc._sampledCount > 0) {
        return chart.renderAsync(queryGroupId, charts.length - 1)
      } else {
        return chart.renderAsync(queryGroupId, charts.length)
      }
    })

    if (dc._renderlet !== null) {
      dc._renderlet(group)
    }

    return Promise.all(renderPromises)
  }

  return dc
}