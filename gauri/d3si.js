/*
 * D3si
 *
 * D3si (D3 Simple) provides a helper class to make working with D3 easier.
 * 
 * I found these resources invaluable when creating this library:
 * 
 * https://github.com/d3/d3/wiki
 * https://github.com/d3/d3/blob/master/API.md
 * https://www.d3indepth.com/
 * https://www.d3-graph-gallery.com/index.html
 */

 /*
  * ===============================================================================================
  * Data
  * ===============================================================================================
  */

/*
 * Load a file from csv, then execute the function fn
 */
function loadCsv(file, fn) {
    // Start loading the files.  The await() function only gets called when all the data is loaded
    d3.queue()
    .defer(d3.csv, file)
    .await(fn)
}

/*
 * Load a file from csv, parse it with the parse function, then execute the function fn
 */
function loadParseCsv(file, parseFn, fn) {
    d3.csv(file)            
    .row(parseFn)
    .get(fn) 
}

/*
 * Function to convert anything that looks like a number to a number
 */
function convertNumbers(data) {
    data.forEach(function(d) {
        for (let key in d) {
          if (+d[key]===+d[key]) {
            d[key] = +d[key]
          }
        }
      });
}

/*
 * Given data returns the column values for the given column colName
 */
function getColValues(data, colName) {
    let values = []
    data.map(function(row) { 
        Object.keys(row).forEach(function(key){if (key==colName) values.push(row[key])})
    })
    return  values
}

/*
 * Given data returns the unique column values for the given column colName
 */
function getUniqueColValues(data, colName) {
    return d3.map(data, function(d){return d[colName]}).keys()
}

/*
 * Given data returns rows that match the given value in the column colName
 */
function filterByValue(data, colName, value) {
    return data.filter(function(d){return d[colName] == value})
}

/*
 * Given data returns rows that don't match the given value in the column colName
 */
function filterByNotValue(data, colName, value) {
    return data.filter(function(d){return d[colName] != value})
}


function valueMap(column) {
    return function (d) {return d[column]}
}


/* 
 * Get the min value in column colName
 */
function getMinValue(data, colName) {
    return d3.min(data, function(d) { return d[colName] })
}

/* 
 * Get the max value in column colName
 */
function getMaxValue(data, colName) {
    return d3.max(data, function(d) { return d[colName] })
}

/*
 * Sort the data by the column, ascending
 */
function sortAscending(data, colName) {
    data.sort(function(x, y){ return d3.ascending(x[colName], y[colName])  })
}

/*
 * Sort the data by the column, descending
 */
function sortDescending(data, colName) {
    data.sort(function(x, y){ return d3.descending(x[colName], y[colName]) })
}

/*
 * Get the top N items of data
 */
function topN(data, n) {
    return data.slice(0, n)
}

/*
 * Roll up the data, summing the rollupCol and grouping by groupByCol
 */
function rollup(data, groupByCol, rollupCol) {
    /*
    Alternative approach
    // https://animateddata.co.uk/articles/crossfilter/
    // https://github.com/square/crossfilter/wiki/API-Reference
    let cf = crossfilter(data)
    console.log(cf.size())
    let nationalityDimension = cf.dimension(function(d) {return d.nationality})
    console.log(nationalityDimension.top(3))
    console.log(nationalityDimension.group().reduceSum(function(d) { return d.score }).all())
    */

    return d3.nest()
        .key(function(d) {return d[groupByCol]})
        .rollup(function(d) { return d3.sum(d, function(g) {return g[rollupCol] }) })
        .entries(data)
}
/*
 * Get the decoded query string from the URL
 */
function getQueryString() {
    return decodeURIComponent(location.search.substring(1))
}

function clearElementContent(id) {
    // Clear out old chart
    let myNode = document.getElementById(id);
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
}


 /*
  * ===============================================================================================
  * Chart
  * ===============================================================================================
  */
// Returns if a value is a string
function isString (value) {
    return typeof value === 'string' || value instanceof String;
    }

/*
 * Create a D3SI chart object
 * 
 * container is a d3 selection containing the element we want to draw the chart in
 */
function D3SI(container, data, parameters) {
    
    // Remember the container element and data
    this.container = isString(container) ? d3.select(container) : container // can pass element or id
    this.data = data

    // Extract dimension attributes from the parameters
    this.width = parameters['width'] || 600
    this.height = parameters['height'] || 600

    // Extract padding attributes from the parameters.  This is where the axes will be drawn
    this.paddingLeft = parameters['paddingLeft'] || parameters['padding'] || 50
    this.paddingRight = parameters['paddingRight'] || parameters['padding'] || 50
    this.paddingTop = parameters['paddingTop'] || parameters['padding'] || 50
    this.paddingBottom = parameters['paddingBottom'] || parameters['padding'] || 50
    
    // Extract header attributes from the parameters.  This is where the title will be drawn
    this.headerLeft = parameters['headerLeft'] || 0
    this.headerRight = parameters['headerRight'] || 0
    this.headerTop = parameters['headerTop'] || 20
    this.headerBottom = parameters['headerBottom'] || 0

    // Compute dimensions of drawing area
    this.drawingLeft = this.headerLeft+this.paddingLeft
    this.drawingRight = this.width - (this.headerRight+this.paddingRight)
    this.drawingTop = this.headerTop+this.paddingTop
    this.drawingBottom = this.height - (this.headerBottom+this.paddingBottom)

    // Compute position of drawing area
    this.drawingWidth = this.width - this.drawingLeft - this.headerRight-this.paddingRight
    this.drawingHeight = this.height - this.drawingTop - this.headerBottom-this.paddingBottom
    this.drawingCentreX = this.drawingLeft + this.drawingWidth/2
    this.drawingCentreY = this.drawingTop + this.drawingHeight/2

    // Compute max radius of drawing area
    this.drawingRadius = Math.min(this.drawingWidth, this.drawingHeight) / 2

    // Add the svg element, in which we will draw the chart
    this.svg = this.container.append("svg")
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('id', "chartsvg")    

    // Add a chart title if provided
    this.title = parameters['titleTop']
    if (this.title !== undefined)
        this.drawTitleTop(this.title)

    // Create the tooltip if the tooltip div is present
    this.tooltipCreate()
}

 /*
  * ===============================================================================================
  * Data
  * ===============================================================================================
  */

// Reload the data
D3SI.prototype.reloadData = function (data) {
    this.data = data
}

// Set the column which represents the index
D3SI.prototype.setIndex = function (indexCol) {
    this.indexCol = indexCol
}

// Reorganise data to be grouped by index
D3SI.prototype.groupDataByIndex = function (indexCol) {
    //indexCol = this.indexCol
    let data = this.data
    let series = data.columns.slice(1)
    let newdata = this.data.map(function(row) { // take each row
        index = row[indexCol]               // get the value of the index for that row
        values = []

        // Object.keys(row) returns the column headings
        // We take each column, other than the index column, and turn it into key/value pair, adding the pair to the list
        // This effectively pivots the data for the row
        series.forEach(function(key){ values.push({series:key , value:row[key]})})

        // Now return the list of key/value pairs for this index
        return {
            index: index, 
            values: values
            }
    })

    return newdata
}

// Reorganise data to be grouped by series
D3SI.prototype.groupDataBySeries = function(indexCol) {
    //indexCol = this.indexCol
    let data = this.data
    let series = data.columns.slice(1)
    let newdata = series.map(function(s) { // take each series column
        return {
            series: s,
            values: data.map(function(d) {return {index: d[indexCol], value: d[s]}})  // extract the data from the column
        }
      })
    
    return newdata
}

// Gets the min value from the grouping (which was generated by groupDataByIndex or groupDataBySeries)
D3SI.prototype.groupMin = function(groupData) {
    return d3.min(groupData, function(c) { return d3.min(c.values, function(d) { return d.value }) })
}

// Gets the max value from the grouping (which was generated by groupDataByIndex or groupDataBySeries)
D3SI.prototype.groupMax = function(groupData) {
    return d3.max(groupData, function(c) { return d3.max(c.values, function(d) { return d.value }) })
}

// Returns the column values for the given column colName
D3SI.prototype.getColValues = function(colName) {
    return getColValues(this.data, colName) 
}

//!! change to work on raw data so it can be used in all cases
//D3SI.prototype.getMinValue = function(structuredData) {
//    return d3.min(structuredData, function(c) { return d3.min(c.values, function(d) { return d.value }) })
//}

//D3SI.prototype.getMaxValue = function(structuredData) {
//   return d3.max(structuredData, function(c) { return d3.max(c.values, function(d) { return d.value }) })
//}

// Reorganise the data into a hierarhcy
D3SI.prototype.buildHierarchy = function(nameCol, parentCol, valueCol) {
    let stratify = d3.stratify()
        .id(function(d) { return d[nameCol]; })
        .parentId(function(d) { return d[parentCol]; })
    

    let root = stratify(this.data)
        .sum(function(d) {return d[valueCol]})
        .sort( function(a, b) {return -(a.value - b.value); });
        
    return root
}

// Get the ids of the items at the top level of the hierarchy
D3SI.prototype.hierarchyTopLevelIds = function(root) {
    let ids = []
    root.children.forEach(function(i){ids.push(i.id)})
    return ids
}


/*
* ===============================================================================================
* Data binding
*
* https://bost.ocks.org/mike/selection/
* ===============================================================================================
*/

// !!rename to selectAll?
D3SI.prototype.bind = function(chartItem, data) {
    // Get an object representing all the chart items we want in the chart
    // Matches each item in the data array with a dom element
    // Some may already match up (the update selection, because we may need to update them in the dom), 
    // some may exist in data but not in the dom (the enter selection, because we need to add them to the dom) 
    // and some may be items that are no longer in the data (the exit selection, because we need to remove them from the dom)
    data = data || this.data
    return this.svg                                     // our selection containing the main svg element
        .selectAll(chartItem)                           // select all the existing chart items (if none exist it returns an empty selection)
        .data(data)                                     // go through each data item, identifying each as update, enter or exit
}

// !!rename to selectAllOnSelection?
D3SI.prototype.bindSelection = function(selection, chartItem, data) {
    // Get an object representing all the chart items in the chart
    return selection.selectAll(chartItem).data(data)
}

// !!rename to append?
D3SI.prototype.bindDatum = function(chartItem, data) {
    data = data || this.data
    // Get an object representing all the chart items in the chart
    return this.svg.append(chartItem).datum(data)
}

//!! rename to appendOnSelection?
D3SI.prototype.bindDatumEl = function(el, chartItem, data) {
    // Get an object representing all the chart items in the chart
    return el.append(chartItem).datum(data)
}

//!!rename to merge?
D3SI.prototype.append = function(objects, chartItem) {
    return objects
        .enter() 
        .append(chartItem)
        .merge(objects)
}

D3SI.prototype.remove = function(objects) {
    objects.exit().remove()
}




 /*
  * ===============================================================================================
  * Drawing
  * ===============================================================================================
  */

/*D3SI.prototype.createSvg = function() {
    this.svg = this.container.append("svg")
        .attr('width', this.width)
        .attr('height', this.height)
        //.append("g")
    return this.svg
}*/

// Get the svg selection from the chart
D3SI.prototype.svg = function() {
    return this.svg
}

// Append a group element that moves the child elements to (x,y)
D3SI.prototype.moveOriginToXY = function(el, x, y) {
    this.svg = this.svg.append('g')
        .attr('transform', "translate(" + x + "," + y + ")")
    return this.svg
}

// Append a group element that moves the child elements to the centre
D3SI.prototype.moveOriginToCentre = function() {
    this.svg = this.svg.append('g')
        .attr('transform', "translate(" + this.drawingCentreX + "," + this.drawingCentreY + ")")
    return this.svg
}


// Append a clip path to clip to the drawing area
D3SI.prototype.clipDrawingArea = function() {

    this.svg.append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", this.drawingLeft)
        .attr("y", this.drawingTop)
        .attr("width", this.drawingWidth)
        .attr("height", this.drawingHeight)
    return this.svg
}


 /*
  * ===============================================================================================
  * Scales
  * ===============================================================================================
  */

// Create a banded scale for the x axis based on the column colName
D3SI.prototype.xScaleBand = function(colName) {
    let list = this.data.map(function(d){return d[colName]})
    let xScale = d3.scaleBand()
        .domain(list)                                       // domain is the list of values in the column
        .rangeRound([this.drawingLeft, this.drawingRight])  // range is the drawing width.  RangeRound to make sure all output values are rounded to whole numbers
        //.paddingInner(0.05)                                 // padding between each band, as % of band width
        //.paddingOuter(0.1)                                  // padding before first and after last band, as % of band width
    this.xScaleOffset = xScale.bandwidth()/2
    return xScale
}

// Create a linear scale for the x axis based on the column colName
D3SI.prototype.xScaleLinear = function(colName) {
    ///console.log(this.data)
    //console.log(getMaxValue(this.data, colName))
    //console.log(d3.max(this.data, function(d) { return d[colName] }))

    let xScale = d3.scaleLinear()
        .domain([0, getMaxValue(this.data, colName)])       // domain is 0 to the maximum value in the column
        .range([this.drawingLeft, this.drawingRight])       // range is the drawing width
    this.xScaleOffset = 0       
    return xScale
}

// Create a linear scale for the x axis based on the column colName
D3SI.prototype.xScaleLinearMinMax = function(miny, maxy) {
    let xScale = d3.scaleLinear() 
        .domain([miny, maxy])                               // domain is the values passed in
        .range([this.drawingLeft, this.drawingRight])       // range is the drawing width
        this.xScaleOffset = 0       
        return xScale
}

// Create a banded scale for the y axis based on the column colName
D3SI.prototype.yScaleBand = function(colName) {
    let list = this.data.map(function(d){return d[colName]})
    let yScale = d3.scaleBand()
        .domain(list)                                       // domain is the list of values in the column
        .rangeRound([this.drawingTop, this.drawingBottom])  // range is the drawing height.  RangeRound to make sure all output values are rounded to whole numbers
        //.paddingInner(0.05)                                 // padding between each band, as % of band width
        //.paddingOuter(0.1)                                  // padding before first and after last band, as % of band width
    return yScale
}

// Create a linear scale for the y axis based on the column colName
D3SI.prototype.yScaleLinear = function(colName) {
    let yScale = d3.scaleLinear()
        .domain([0, getMaxValue(this.data, colName)])       // domain is 0 to the maximum value in the column
        .range([this.drawingBottom, this.drawingTop])       // range is the drawing height (top and bottom reversed to make origin at the bottom)
    return yScale
}

// Create a linear scale for the y axis based on the column colName
D3SI.prototype.yScaleLinearMinMax = function(miny, maxy) {
    let yScale = d3.scaleLinear() 
        .domain([miny, maxy])                               // domain is the values passed in
        .range([this.drawingBottom, this.drawingTop])       // range is the drawing height (top and bottom reversed to make origin at the bottom)
    return yScale
}

// Create a banded scale for the series.
// Assumes xScale is present to place the x items
// Series scale tells us how to offset each series item within the x scale band
// E.g. if we have a bar chart with 4 groups of 3 bars ABC ABC ABC ABC, xScale covers all 4 groups, xSeriesScale covers a single group ABC
D3SI.prototype.xSeriesScaleBand = function(list, xScale) {
    this.xSeriesScale = d3.scaleBand()
        .domain(list)                                       // domain is the list of values in the column
        .rangeRound([0, xScale.bandwidth()])                // range is the width of a single band in the xScale.  RangeRound to make sure all output values are rounded to whole numbers
        .padding(0.05)                                      // padding between each band, as % of band width
        .paddingOuter(0.1)                                  // padding before first and after last band, as % of band width
    return this.xSeriesScale
}

// Creates an ordinal scale from the column colName to the colours
D3SI.prototype.colourScaleOrdinal = function(colName, colours) {
    let list = this.data.map(function(d){return d[colName]})
    let colourScale =  d3.scaleOrdinal(colours)
        .domain(list) 
    return  colourScale
}

// Creates a linear scale from the column colName to the continuous range of colours, e.g. red to green
// e.g. chart.colourScaleSequential([0,20], d3.interpolateOranges)
D3SI.prototype.colourScaleLinear = function(colName, minColour, maxColour) {
    let min = getMinValue(this.data, colName)  
    let max = getMaxValue(this.data, colName) 
    let colourScale =  d3.scaleLinear()
        .domain([min,max]) 
    	.range([minColour, maxColour])
    return  colourScale
}

// Creates an sequential scale from the domain to the colours
D3SI.prototype.colourScaleSequential = function(domain, colours) {
    let colourScale =  d3.scaleSequential()
        .domain(domain) 
        .interpolator(colours);
    return  colourScale
}

// Creates an ordinal scale from the list of names to the colours
// Use this to create scales across multiple charts, passing a consistent set of names 
// so the names are all associated with the same colour across all charts
D3SI.prototype.consistentColourScale = function(names, colours) {
    let colourScale = d3.scaleOrdinal(colours)
        .domain(names) 
    return  colourScale
}

// Creates a scale from column colName to the min and max circle radius
// We use the sqrt scale to ensure the value is proportional to the area of the circle rather than the radius
D3SI.prototype.scaleCircleRadius = function(colName, min, max) {
    let rScale = d3.scaleSqrt()
            .domain([0, getMaxValue(this.data, colName)])
            .range([min, max]);
    return rScale
}

// Helper to make it easy to set a colour scale
D3SI.prototype.colourMap = function(column, colourScale) {
    let chart = this
    return function(d) { return colourScale(d[column]) } 
}


 /*
  * ===============================================================================================
  * Axes
  * ===============================================================================================
  */

// Draw an x axis at the top of the chart.  
// The axis line is drawn at the border of the drawing area and padding area
// The label is draw at the outer border of the padding area
D3SI.prototype.drawAxisXTop = function(xScale, text, ticks, ticksRotateAngle) {
    const ticks1 = ticks || this.data.length        // default ticks to length of data
    const rotate = ticksRotateAngle || 0

    // Define the axis
    let xAxis = d3.axisTop()                       // draw the axis at the top
        .scale(xScale)                         // use the x scaler, which must be defined first
        .ticks(ticks1)                              // set the number of ticks

    // Draw the axis
    let t = this.svg.append("g")                                            // add a group element
        .attr("class", "xaxis")
        .attr("transform", "translate(0," + this.drawingTop + ")")  // move up to the top of the drawing area
        .call(xAxis)                                           // draw the axis elements

    if (rotate!=0) {
        t.selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")    
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");
    }        
        
    // Draw the axis label
    let posx = this.drawingCentreX
    let posy = this.headerTop 
    this.svg.append("text")       
        .text(text)
        .attr("class", "xlabel")     
        .attr("y", posy)
        .attr("x", posx)     
        .attr("dominant-baseline", "hanging") // Hang below the baseline
        .style("text-anchor", "middle")    

    return xAxis
}

// Draw an x axis at the bottom of the chart.  
// The axis line is drawn at the border of the drawing area and padding area
// The label is draw at the outer border of the padding area
D3SI.prototype.drawAxisXBottom = function(xScale, text, ticks, ticksRotateAngle) {
    const ticks1 = ticks || this.data.length        // default ticks to length of data
    const rotate = ticksRotateAngle || 0

    // Define the axis
    let xAxis = d3.axisBottom()                    // draw the axis at the bottom
        .scale(xScale)                             // use the x scaler, which must be defined first
        .ticks(ticks1)                             // set the number of ticks

    // Draw the axis
    let t = this.svg.append("g")                                                // add a group element
        .attr("class", "xaxis")
        .attr("transform", "translate(0," + this.drawingBottom + ")")   // move down to the bottom of the drawing area
        .call(xAxis)   

    if (rotate!=0) {
        t.selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")    
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");
    }

    // Draw the axis label
    let posx = this.drawingCentreX
    let posy = this.height - this.headerBottom
    this.svg.append("text")       
      .text(text)
      .attr("class", "xlabel")     
      .attr("y", posy)
      .attr("x", posx)     
      .attr("dominant-baseline", "hanging") // Hang below the baseline
      .attr("dy", "-1em")                   // and shift up one line
      .style("text-anchor", "middle")    

    return xAxis
}

// Update the x-axis 
D3SI.prototype.updateXAxis = function(xAxis, xScale, ticks) {
    const ticks1 = ticks || this.data.length

    // Redefine the axis
    xAxis
        .scale(xScale)                 // use the x scaler, which must be defined first
        .ticks(ticks1)                 // set the number of ticks

    // Redraw the axis
    this.svg.select(".xaxis")
        .transition()
        .duration(1000)
        .call(xAxis)
}

// Draw a y axis at the left of the chart.  
// The axis line is drawn at the border of the drawing area and padding area
// The label is draw at the outer border of the padding area
D3SI.prototype.drawAxisYLeft = function(yScale, text, ticks) {
    const ticks1 = ticks || this.data.length

    // Define the axis    
    let yAxis = d3.axisLeft()
        .scale(yScale)
        .ticks(ticks1)

    // Draw the axis
    this.svg.append("g")
        .attr("class", "yaxis")
        .attr("transform", "translate(" + this.drawingLeft + ",0)")
        .call(yAxis)  

    // Draw the axis label, rotated 90 degrees
    let posx = 0
    let posy = (this.height/2)    
    let el = this.svg.append("text")
        .text(text)
        .attr("class", "ylabel")
        .attr("transform", "rotate(-90," + posx + "," + posy +")") 
        .attr("y", posy)
        .attr("x", posx)
        .attr("dominant-baseline", "hanging")
        .style("text-anchor", "middle")     
        
    return yAxis
}

// Draw a y axis at the right of the chart.  
// The axis line is drawn at the border of the drawing area and padding area
// The label is draw at the outer border of the padding area
D3SI.prototype.drawAxisYRight = function(yScale, text, ticks) {
    const ticks1 = ticks || this.data.length

    // Define the axis    
    let yAxis = d3.axisRight()
        .scale(yScale)
        .ticks(ticks1)

    // Draw the axis
    this.svg.append("g")
        .attr("class", "yaxis")
        .attr("transform", "translate(" + (this.width-(this.headerRight+this.paddingRight)) + ",0)")
        .call(yAxis)  

    // Draw the axis label, rotated 90 degrees
    let posx = this.width
    let posy = (this.height/2)    
    let el = this.svg.append("text")
        .text(text)
        .attr("class", "ylabel")
        .attr("transform", "rotate(-90," + posx + "," + posy +")") 
        .attr("y", posy)
        .attr("x", posx)
        .attr("dominant-baseline", "hanging")
        .attr("dy", "-1em")
        .style("text-anchor", "middle")        
        
    return yAxis
}

// Update the y-axis 
D3SI.prototype.updateYAxis = function(yAxis, yScale, ticks) {
    const ticks1 = ticks || this.data.length

    // Redefine the axis
    yAxis
        .scale(yScale)                 // use the y scaler, which must be defined first
        .ticks(ticks1)                 // set the number of ticks

    // Redraw the axis
    this.svg.select(".yaxis")
        .transition()
        .duration(1000)
        .call(yAxis)
}


// Remove the x axis
D3SI.prototype.removeXAxis = function() {
    this.svg.selectAll(".xaxis").remove()
    this.svg.selectAll(".xlabel").remove()
}

// Remove the y axis
D3SI.prototype.removeYAxis = function() {
    this.svg.selectAll(".yaxis").remove()
    this.svg.selectAll(".ylabel").remove()
}

// Remove the x and y axes
D3SI.prototype.removeAxes = function() {
    this.svg.selectAll(".xaxis").remove()
    this.svg.selectAll(".yaxis").remove()
    this.svg.selectAll(".xlabel").remove()
    this.svg.selectAll(".ylabel").remove()
}

/*
* ===============================================================================================
* Title
* ===============================================================================================
*/

// Add a title at the top of the chart
// Titles are drawn in the header area
D3SI.prototype.drawTitleTop = function(title) {
    let posx = this.width/2
    let posy = 0 
    /*
    this.svg.append("text")       
      .text(title)
      .attr("class", "title")     
      .attr("y", posy)
      .attr("x", posx)     
      .attr("dominant-baseline", "hanging") // Hang below the baseline
      .style("text-anchor", "middle")  
*/

    let ob = this.svg.selectAll("text")
      .data([title])

      ob.enter()
      .append("text")       
      .merge(ob)
      .text(title)
      .attr("class", "title")     
      .attr("y", posy)
      .attr("x", posx)     
      .attr("dominant-baseline", "hanging") // Hang below the baseline
      .style("text-anchor", "middle") 
}

//!! TODO: drawTitleBottom, Left and Right

// Update the title text
D3SI.prototype.updateTitle = function(title) {
    this.svg.select("text.title").text(title)    
}


/*
* ===============================================================================================
* Pie Layout Helpers 
* ===============================================================================================
*/

// Create a function to add a pie layout to the data based on values in column valueCol
// Adds the following
//      data - the input datum; the corresponding element in the input data array.
//      value - the numeric value of the arc.
//      index - the zero-based sorted index of the arc.
//      startAngle - the start angle of the arc.
//      endAngle - the end angle of the arc.
//      padAngle - the pad angle of the arc.
// 
// Full details here: https://github.com/d3/d3-shape#pies
D3SI.prototype.addPieLayout = function(valueCol) {
    let pie = d3.pie()
        .value(d => d[valueCol])  
    return pie(this.data)  
}

// Create a function that generates pie arcs a pie layout
// Requires the data to have a startAngle and endAngle, as generated by addPieLayout
// The generated arcs can be passed to the d attribute of an svg path
// innerRadiusPercent is a value between 0 (no donut inner circle) to 1 (donut inner circle occupies whole chart)
//
// Full details here: https://github.com/d3/d3-shape#arcs
D3SI.prototype.getPieArcGenerator = function(innerRadiusPercent) {
    this.outerRadius = this.drawingRadius 
    let innerRadius = innerRadiusPercent * this.outerRadius 
    return d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(this.outerRadius)    
}

/*
* ===============================================================================================
* Partition Layout Helpers 
* ===============================================================================================
*/

// Create a function to add a partition layout to the data
// Partition layouts represent a hierarchy as a set of rectangles
// root is the top node of the hierarchy, as generated by buildHierarchy()
// w and h are the width and height of the overall rectangle
// padding is the pixel space between rectangles
// Each node gets attributes x0, y0, x1, y1, representing left, top, right, bottom of rectangle
//
// Full details here: https://github.com/d3/d3-hierarchy#partition  
D3SI.prototype.addPartitionLayout = function(root, w, h, padding) {
    padding = padding || 0
    let partition = d3.partition()
        .size([w, h])
        .padding(padding )
    return partition(root)
}

// Create a function to generate arcs from a partition layout
// Requires data to have x0, y0, x1, y1 as generated by addPartitionLayout
// The generated arcs can be passed to the d attribute of an svg path
//
// Full details here: https://github.com/d3/d3-shape#arcs
D3SI.prototype.getPartitionArcGenerator = function() {
    return d3.arc()
        .startAngle(function(d) { return d.x0; })
        .endAngle(function(d) { return d.x1; })
        //.padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        //.padRadius(radius / 2)
        .innerRadius(function(d) { return d.y0; })
        .outerRadius(function(d) { return d.y1; });  
}

// Create a function that can generate the transform attribute for labels to appear in a partition layout
// Requires data to have x0, y0, x1, y1 as generated by addPartitionLayout
// The generated transformations can be passed to the transform attribute of an svg text
D3SI.prototype.getPartitionLabelGenerator = function() {
    let padLeft = this.paddingLeft+this.headerLeft
    let padTop = this.paddingTop+this.headerTop
    return function(d) {
        const y = - (padLeft + d.x0 + (d.x1-d.x0) / 2)      // calculate the y position
        const x = padTop + d.y0 + (d.y1-d.y0) / 2           // calculate the x position
        return `rotate(90) translate(${x},${y})`            // rotate by 90 degrees and move into position
    }
}

// Create a function that can generate the transform attribute for labels to appear in a partition layout
// that has been transformed into arcs
// Requires data to have x0, y0, x1, y1 as generated by addPartitionLayout
// The generated transformations can be passed to the transform attribute of an svg text
D3SI.prototype.getPartitionArcLabelGenerator = function() {
    return function(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI         // calculate the y position
        const y = (d.y0 + d.y1) / 2                          // calculate the x position
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`       // rotate by the required amount and move into position
    }
}


/*
* ===============================================================================================
* Force Layout Helpers
* ===============================================================================================
*   // https://www.d3indepth.com/force-layout/
*   // An important aspect of simulations is alpha. 
alpha is a number between 0 and 1 and defines how far the simulation has progressed. 
When a simulation starts alpha is set to 1 and this value slowly decays, 
based on the alphaDecay rate, until it reaches the alphaTarget of the simulation. 
Once the alpha value is less than the alphaTarget, the simulation comes to a halt. The alphaTarget by default is set to 0.1

*/
 /*
 D3SI.prototype.forceCentreSimulation = function(data, nodesSelection, charge, collide, sizeFn) {
     

    force =  d3.forceSimulation()
    .force("center", d3.forceCenter(this.width / 2, this.height / 2)) // Attraction to the center of the svg area
    .force("charge", d3.forceManyBody().strength(charge)) // +ve strength causes attraction, -ve cause repulsion As a rule of thumb, when creating network diagrams we want the elements to repel one another while for visualisations where we’re clumping elements together, attractive forces are necessary.
//      .force("collide", d3.forceCollide().strength(.2).radius(function(d){ return (size(d[bubbleSizeCol])+3) }).iterations(1)) // Force that avoids circle overlapping
    .force("collide", d3.forceCollide().strength(collide).radius(sizeFn)) // Force that avoids circle overlapping

        // Apply these forces to the nodes and update their positions.
    // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
    force
        .nodes(data)
        .on("tick", function(d){
            nodesSelection
                .attr("cx", function(d){ return d.x; })
                .attr("cy", function(d){ return d.y; })
        })

    return force
}*/

// Creates a force simulation
// Full details here: https://www.d3indepth.com/force-layout/
D3SI.prototype.forceSimulation = function(nodesSelection, data) {
    data = data || this.data
    // Apply these forces to the nodes and update their positions.
    // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
    this.force =  d3.forceSimulation()        
        .nodes(data)
        .on("tick", function(d){
            nodesSelection
            .attr("cx", function(d){ return d.x; })
            .attr("cy", function(d){ return d.y; })
        })
    return this.force
}

// Add a force to pull objects towards the centre of the drawing area
D3SI.prototype.addForceCentre = function() {
    //this.force.force("center", d3.forceCenter(this.width / 2, this.height / 2)) // Attraction to the center of the svg area
    this.addForceX(this.drawingCentreX)
    this.addForceY(this.drawingCentreY)
}

// Add a force to pull objects towards a line on the x dimension
D3SI.prototype.addForceX = function(xFn) {
    this.force.force("x", d3.forceX(xFn)) 
}

// Add a force to pull objects towards a line on the y dimension
D3SI.prototype.addForceY = function(yFn) {
    this.force.force("y", d3.forceY(yFn)) // Attraction to the center of the svg area
}

// Add a force to add charge to the objects
// +ve strength causes attraction (objects clump together), -ve cause repulsion (objects space themselves out)
D3SI.prototype.addForceCharge = function(chargeStrength) {
    this.force.force("charge", d3.forceManyBody().strength(chargeStrength)) 
}

// Add a force to make objects bounce off when colliding
// It stops elements overlapping
D3SI.prototype.addForceCollide = function(collisionStrength, sizeFn) {
    this.force.force("collide", d3.forceCollide().strength(collisionStrength).radius(sizeFn))
}



/*
* ===============================================================================================
* Bars Helpers
* ===============================================================================================
*/
// Generate a set of bars
D3SI.prototype.bars = function(bindings, xCol, yCol, xScale, yScale) {
    //xScale = this.xScale
    //yScale = this.yScale    
    let miny = 0 //or may want to use d3.min to find min y

    return this.append(bindings, "rect")
        .attr("x",        function(d) { return xScale(d[xCol]) })
        .attr("y",        function(d) { return yScale(d[yCol]) })
        .attr("width",    xScale.bandwidth())
        .attr("height",   function(d) { return yScale(miny)-yScale(d[yCol]) })
}

// Generate a set of horizontal bars
D3SI.prototype.hbars = function(bindings, xCol, yCol, xScale, yScale) {
    //xScale = this.xScale
    //yScale = this.yScale    
    let chart = this
    let minx = 0 //or may want to use d3.min to find min x

    return this.append(bindings, "rect")
        .attr("x",        function(d) { return chart.paddingLeft })
        .attr("y",        function(d) { return yScale(d[yCol]) })
        .attr("height",    yScale.bandwidth())
        .attr("width",   function(d) { return xScale(d[xCol])-xScale(minx) })
}


// Generate a set of series bars
D3SI.prototype.seriesBars = function(bindings, xScale, yScale) {
    //xScale = this.xSeriesScale
    //yScale = this.yScale    
    let miny = 0 //this.minSeriesValue

    return this.append(bindings, "rect")
        .attr("x",        function(d) { return xScale(d["series"]) })
        .attr("y",        function(d) { return yScale(d["value"]) })
        .attr("width",    xScale.bandwidth())
        .attr("height",   function(d) { return yScale(miny)-yScale(d["value"]) })
}

/*
* ===============================================================================================
* Lines Helpers
* ===============================================================================================
*/

// Create a function to generate lines
D3SI.prototype.getLineGenerator = function(xCol, yCol, xScale, yScale) {
    return d3.line()
        .x(function(d) { return xScale(d[xCol]); })
        .y(function(d) { return yScale(d[yCol]); });
}

// Create a single line
D3SI.prototype.line = function(bindings, linepoints, xScale) {
    return bindings
        //.append('path')
        .attr("class", "line")
        .attr("d", linepoints)
        .attr("transform", "translate(" + xScale.bandwidth()/2 + ",0)")    
}

// Create a set of series lines
D3SI.prototype.seriesLines = function(bindings, linepoints, xScale) {
    return this.append(bindings, "g")
        .attr("class", "series")
        .append('path')
        .attr("class", "line")
        .attr("d", function(d) { return linepoints(d.values) })
        .attr("transform", "translate(" + xScale.bandwidth()/2 + ",0)")    
}

/*
* ===============================================================================================
* Glyphs
* 
* Glyphs are individual drawing elements that we can place on charts
* ===============================================================================================
*/

// Fill cell at top left x y position and size determined by the band size
// Use this for heatmaps
D3SI.prototype.fillxy = function(bindings, xCol, yCol, xScale, yScale) { 
    return this.append(bindings, "rect")
        .attr("x",        function(d) { return xScale(d[xCol]) })
        .attr("y",        function(d) { return yScale(d[yCol]) })
        .attr("width",    xScale.bandwidth())
        .attr("height",   yScale.bandwidth())
}

// Place a diamond centred at x y and size specified by sizeCol
D3SI.prototype.diamondsxy = function(bindings, xCol, yCol, sizeCol, xScale, yScale) {
    let xOffset = this.xScaleOffset
    let xScaleOffset1 = function(d) { return xScale(d[xCol]) + xOffset }
    let yScaleOffset1 = function(d) { return yScale(d[yCol]) + d[sizeCol]/2 }
    return this.append(bindings, "rect")
        .attr("x",        function(d) { return xScale(d[xCol]) + xOffset - d[sizeCol]/2 })
        .attr("y",        function(d) { return yScale(d[yCol]) })
        .attr("width",    function (d) { return d[sizeCol] })
        .attr("height",   function (d) { return d[sizeCol] })
        .attr("transform", function (d) { return "rotate(-45 " + xScaleOffset1(d) + " " + yScaleOffset1(d) + ")"})
}

// Place a circle centred at x y and size specified by sizeCol
D3SI.prototype.circlesxy = function(bindings, xCol, yCol, sizeCol, xScale, yScale) {
    let xOffset = this.xScaleOffset //xScale.bandwidth()/2
    return this.append(bindings, "circle")
        .attr("cx",  function (d) { return xScale(d[xCol]) + xOffset})
        .attr("cy", function (d) { return yScale(d[yCol]) })
        .attr("r", function (d) { return d[sizeCol] })
}

// Place a circle centred at x position and size specified by data.  y specified as absolute position
D3SI.prototype.circlesx = function(bindings, xCol, y, sizeCol, xScale) {
    let xOffset = this.xScaleOffset
    return this.append(bindings, "circle")
        .attr("cx",  function (d) { return xScale(d[xCol]) + xOffset })
        .attr("cy", y)
        .attr("r", function (d) { return d[sizeCol] })
}



 /*
  * ===============================================================================================
  * Multichart
  * ===============================================================================================
  */

function buildMulticharts(chartFn, chartId, data, chartParams, chartCol) {

                   
    let chartEl = d3.select(chartId)

    // Get unique years
    let chartsData = getUniqueColValues(data, chartCol) 

    // Create DIVs, one for each multichart
    let containers = chartEl
        .selectAll('div')
        .data(chartsData)
        .enter()
        .append("div")
        .attr('class', 'multichart-item')    

    // Take each div and create a chart in it
    containers.each(function(chartDataItem) {
        // Get the actual div that will contain the chart
        div = d3.select(this)

        // Filter just the data we need for this chart and pack it
        valuesDatafiltered = filterByValue(data, chartCol, chartDataItem) 
        valuesDatafiltered.columns = data.columns

        // Draw the chart
        chartFn(div, valuesDatafiltered, chartParams)
    })

    // Add the chart name
    containers
        .append("div")
        .attr('class', 'multichart-text')
        .html(function(d){return d})    
}



 /*
  * ===============================================================================================
  * Tooltip
  * ===============================================================================================
  */

D3SI.prototype.tooltipCreate = function() {
    let ttSelection = d3.select("#tooltip")
    //if (!ttSelection.empty())
        ttSelection  
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
        
}

D3SI.prototype.tooltipShow = function(el, fn) {
    d3.select(".tooltip")
        .style("opacity", 1)
        fn(el)
        /*
    d3.select(el)
        .style("stroke", "black")
        .style("opacity", 1) */
}

D3SI.prototype.tooltipMove = function(el, d) {
    let tooltip = 
        "<center><span class='tt1'>"
        + d.tt1

    if (typeof d.tt2 !== 'undefined') {        
        tooltip += "</span><br><span class='tt2'>"
            + d.tt2
    }

    if (typeof d.tt3 !== 'undefined') {
        tooltip += "</span><br><hr><span class='tt3'>"
            + d.tt3
    }    
    if (typeof d.tt4 !== 'undefined') {
        tooltip += "</span><br><hr><span class='tt4'>"
            + d.tt4
    }
    tooltip += "</span></center>"

    d3.select(".tooltip")
        .html(tooltip)
        //.style("left", (d3.mouse(el)[0]+50) + "px")
        //.style("top", (d3.mouse(el)[1]) + "px")
        .style("left", (d3.event.pageX+50) + "px")
        .style("top", (d3.event.pageY) + "px")
}

D3SI.prototype.tooltipHide = function(el, fn) {
    d3.select(".tooltip")
      .style("opacity", 0)
      fn(el)
      /*
    d3.select(el)
      .style("stroke", "none")
      .style("opacity", 0.8)  */
}

function ttStyleThick(el) {
    d3.select(el)
    .style("stroke-width", 2)
}

function ttStyleNormal(el) {

    d3.select(el)
    .style("stroke-width", 1)
}  

D3SI.prototype.addStandardTooltip = function(nodesSelection, getTooltipData) {
        // Add the event handlers for the tooltip
    tooltipShow = this.tooltipShow
    tooltipMove = this.tooltipMove
    tooltipHide = this.tooltipHide
    return nodesSelection
        .on('mouseover',  function (d) { tooltipShow(this, ttStyleThick) })
        .on('mousemove',  function (d) { tooltipMove(this, getTooltipData(d)) })
        .on('mouseout',   function (d) { tooltipHide(this, ttStyleNormal)  })    
}

 /*
  * ===============================================================================================
  * Legend
  * ===============================================================================================
  */
/*
 * Draw a legend.  We use the names data so colours are consistent across all charts.
 */
function drawSimpleLegend(legendId, data, parameters={}) {

    let el = d3.select(legendId)

    // Select the default parameters or select from provided parameters
    const title = parameters['title'] || ""
    const colours = parameters["colours"] || d3.schemeCategory10    
    const itemHeight = parameters["itemHeight"] || 20
    const boxWidth = parameters["boxWidth"] || 50
    const boxHeight = parameters["boxHeight"] || 10
    const width = parameters['width'] || 400
    const height = parameters['height'] || 400
    const x = parameters['x'] 
    const y = parameters['y'] 
    //const titleHeight = 30

    // Unpack the data from the data array
    //namesData = data[0]

    // Define a colour scale mapping the names to the colours
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(function(d) {return d} ))
        .range(colours)
    
    // Add the SVG element
    let svg = el.append("svg")
        //.attr('width', "2000")
        //.attr('height', height)
        .attr('id', 'legendd')

    // Add the overall group element
    const g = svg.append('g')    

    // Create groups, one for each legend item
    let legendItems = g.selectAll('g')
        .data(data)
        .enter()
        .append('g')

    // Add the title
    let titleSelection = svg.append("text")       
        .text(title)
        .attr("class", "legend-title")     
        .attr("y", 5)
        .attr("x", 0)     
        .attr("dominant-baseline", "hanging") // Hang below the baseline
        .style("text-anchor", "start")          

    let titleHeight = 5 + titleSelection.node().getBBox().height
    let yoffset = titleHeight + itemHeight/2-boxHeight/2

    // Add the rect to each group
    legendItems
        .append('rect')
        .attr("x", function(d,i){return 0})
        .attr("y", function(d,i){return yoffset + i*itemHeight})
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .style('fill', function(d, i) {return colorScale(d)}) 

    // Add the text to each group
    legendItems
        .append('text')
        .attr('class', 'legend-label')
        .attr("x", function(d,i){return boxWidth + 10;})
        .attr("y", function(d,i){return yoffset + i*itemHeight})        
        .attr("dominant-baseline", "hanging")
        .text(function(d, i) {return d})

    // Resize SVG to fit
    svg
        .attr('width', width)
        .attr('height', yoffset + data.length*itemHeight)

    // Position the legend
    console.log(x)
    if (x !== undefined)
        el    
            .style("left", x+"px")
            .style("top", y+"px")

}


 /*
  * ===============================================================================================
  * Drag / drop
  * ===============================================================================================
  */

 D3SI.prototype.addStandardDragDrop = function(nodesSelection, force) {
    // Add the event handlers for dragging - https://github.com/d3/d3-drag
    return nodesSelection
        .call(d3.drag() 
            .on("start", function (d) {
                // Started dragging, so restart the force simulation and update the circle's position
                if (!d3.event.active) force.alphaTarget(.03).restart()
                d.fx = d.x
                d.fy = d.y
                })
            .on("drag", function (d) {
                // In the middle of dragging, so update the circle's position
                d.fx = d3.event.x
                d.fy = d3.event.y
                })
            .on("end", function (d) {
                // Dragging stopped
                if (!d3.event.active) force.alphaTarget(.03)
                d.fx = null
                d.fy = null
                }))         
 }
 
 
// Define handlers for drag events
function dragstarted(d) {
    // Started dragging, so restart the force simulation and update the circle's position
    if (!d3.event.active) force.alphaTarget(.03).restart()
    d.fx = d.x
    d.fy = d.y
}
function dragged(d) {
    // In the middle of dragging, so update the circle's position
    d.fx = d3.event.x
    d.fy = d3.event.y
}
function dragended(d) {
    // Dragging stopped
    if (!d3.event.active) force.alphaTarget(.03)
    d.fx = null
    d.fy = null
}            