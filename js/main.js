//main.js
//Written by Jackson Myatt, 2019

//Encapsulate entire script within a function
(function(){    
    
//create (pseudo) global variables
//list of attributes    
var attrArray = [ "POP_DENS", "PER_DEM", "PER_GOP"]; 
//first attribute
var expressed = attrArray[0]; 
  
//create chart frame
var chartWidth = window.innerWidth * 0.45,
    chartHeight = 500;

//create a scale for sizing bars
var yScale = d3.scale.linear()
    .range([500, 0])
    .domain([-1000, 30000]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //define map frame
    var width = window.innerWidth * 0.95,
        height = 500;

    //create svg to contain map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers projection customized for the USA
    var projection = d3.geo.albersUsa()
        .scale(1000)
	    .translate([width / 2, height / 2]);

    //this exact script is necessary to put up map
    var path = d3.geo.path()
        .projection(projection);
    
    //queue to load data
    queue()
        .defer(d3.csv, "data/states.csv")
        .defer(d3.json, "data/states.json")
        .defer(d3.json, "data/states.json")
        .await(callback);

    //callback function
    function callback(error, csvData, usa, states){

        //place graticule
        setGraticule(map, path);

        //create variables for json data for later use
        var usStates = topojson.feature(usa, usa.objects.usStates),
            unitedStates = topojson.feature(states, states.objects.usStates).features;

        //add US States
        var usaStates = map.append("path")
            .datum(usStates)
            .attr("class", "states")
            .attr("d", path);

        //join csv data to json enumeration units
        usaStates = joinData(unitedStates, csvData);
        
        //create the color scale
        var colorScale = makeColorScale(csvData);
        
        //add dropdown menu
        createDropdown(csvData);
        
        //add enumeration units to the map
        setEnumerationUnits(usaStates, map, path, colorScale);
        
        //add coordinated visualization to the map
        setChart(csvData, colorScale);   
    };
};
    

//generate color scale
function makeColorScale(data){
    var colorClasses = [
        "#894444",
        "#CD6666",
        "#F57A7A",
        "#D79E9E",
        "#9EAAD7",
        "#7A8EF5",
        "#6677CD",
        "#444F89"       
    ];

    //create color scale generator
    var colorScale = d3.scale.quantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
};
    
function setGraticule(map, path){
        //create graticule
        var graticule = d3.geo.graticule()
            .step([10, 10]); //place graticule lines every 10 degrees of longitude and latitude
        
        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path)

        
        //create graticule lines
        var gratLines = map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines")
            .attr("d", path);
};

function joinData(usaStates, csvData){
    //loop through csv to assign each set of csv attribute values to json state
    for (var i=0; i<csvData.length; i++){
        var csvState = csvData[i];
        var csvKey = csvState.STATE_ABBR;
        

        //loop through json states to find correct state
        for (var a=0; a<usaStates.length; a++){
            var geojsonProps = usaStates[a].properties;
            var geojsonKey = geojsonProps.STATE_ABBR;
            
            //join where primary key is identical
            if (geojsonKey == csvKey){

                //assign values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvState[attr]);
                    geojsonProps[attr] = val;
    
   
                });
            }
        }
    }
 return usaStates;
}      
   

function setEnumerationUnits(usaStates, map, path, colorScale){
        //add US States to map
        var theUSA = map.selectAll(".states")
            .data(usaStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.STATE_ABBR;
            })
            .attr("d", path)
            .style("fill", function(d){
            return colorScale(d.properties[expressed]);
        })
            .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
            .on("mouseover", function(d){
            highlight(d.properties);
        })
            .on("mouseout", function(d){
            dehighlight(d.properties)
        })
            .on("mousemove", moveLabel);
    
        //add style descriptor to each rect
        var desc = theUSA.append("desc")
            .text('{"stroke": "black", "stroke-width": "1px"}');
};

//coordinate chart
function setChart(csvData, colorScale){
    //chart from frame dimensions
    var chartWidth = window.innerWidth * 0.4,
        chartHeight = 500;

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each 
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.STATE_ABBR;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    
    //add style descriptor to each rect
    var desc = bars.append("desc")
        .text('{"stroke": "white", "stroke-width": "0px"}');

    //create the chart title
    var chartTitle = chart.append("text")
        .attr("x", 100)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Population Density " + expressed[0] + " in each state")
        .text(expressed[2] + "Percent seats won by Republicans in 2018");

    //create vertical axis generator
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //setup bar
    updateChart(bars, csvData.length, colorScale);
};
    
//create drop down menu
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });
    
    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
    
};
    
//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    
    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    
    //build two-value array of minimum and maximum values
    var minmax = [
        d3.min(data, function(d){ return parseFloat(d[expressed]); }),
        d3.max(data, function(d){ return parseFloat(d[expressed]); })
    ];
    
    //assign two-value array as scale domain
    colorScale.domain(minmax);
    updateChart(bars, csvData.length, colorScale);
}

//position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size and resize bars
        .attr("height", function(d, i){
            return  Math.abs(400 - yScale(parseFloat(d[expressed])));
    })
        .attr("y", function(d, i){
            if (parseFloat(d[expressed]) > 0) { 
                return yScale(parseFloat(d[expressed]));
            } else {
                return yScale(0);
            }
        })
        //color and recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
        
    
    var chartTitle = d3.select(".chartTitle")
    .text("Population Density: " + expressed[0] + " in each county")
    .text(expressed[2] + " seats won by Republicans in 2018");
};
    
//highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.STATE_ABBR)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    
    //set label
    setLabel(props);
    
};
    
//highlight enumeration units and bars
function dehighlight(props){
    var selected = d3.selectAll("." + props.STATE_ABBR)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    //remove info label
    d3.select(".infolabel")
        .remove();
};
    
//reate dynamic label
function setLabel(props){
    //label
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.STATE_ABBR + "_label")
        .html(labelAttribute);

    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.STATE_ABBR);
};
    
//function to move info label with mouse
function moveLabel(){
    //get label width
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1; 


    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
})
();