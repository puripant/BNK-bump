var num = 11;
var numTop = 5;

var margin = {top: 35, right: 70, bottom: 30, left: 70};
var width = 950,
    height = 500;

var devicePixelRatio = window.devicePixelRatio || 1;

var canvas = d3.select("canvas")
    .attr("width", width * devicePixelRatio)
    .attr("height", height * devicePixelRatio)
    .style("width", width + "px")
    .style("height", height + "px");

var svg = d3.select("svg")
    .style("width", width + "px")
    .style("height", height + "px");

var color = d3.scaleOrdinal()
  .range(["#DB7F85", "#50AB84", "#4C6C86", "#C47DCB", "#B59248", "#DD6CA7", "#E15E5A", "#5DA5B3", "#725D82", "#54AF52", "#954D56"]);

var xscale = d3.scaleOrdinal()
  // .domain([1959, 2017])
  .range([margin.left, width-margin.right]);

var xaxis = d3.axisBottom()
  // .scale(xscale)
  .tickFormat(d3.format(""));

var xaxis2 = d3.axisTop()
  // .scale(xscale)
  .tickFormat(d3.format(""));

var yscale = d3.scaleLinear()
  .domain([0-0.2, num-0.5])
  .range([margin.top, height-margin.bottom]);

var radius = d3.scaleSqrt()
  .domain([0,0.1])
  .range([0,4]);

d3.queue()
.defer(d3.csv, "members.csv")
.defer(d3.csv, "singles.csv")
.await(function(error, members, singles) {
  let data = [];
  singles.forEach(function(single) {
    let single_members = single.members.split(";");
    let center = (single.center)? single.center.split(";") : [];
    single_members.forEach(function(member_name, i) {
      data.push({
        year: single.name,
        name: members.find((member) => member.name === member_name).nickname,
        gold: 100-i,
        host: (center.indexOf(member_name) >= 0)? "y" : "n"
      });
    });
  });

  xscale.domain(singles.map(function(single) { return single.name; }));
  xaxis.scale(xscale);
  xaxis2.scale(xscale);

  var hostCountries = {}; // Find host countries by year
  data.forEach(function(d) {
    // d.gold = +d.gold;
    // d.year = +d.year;
    if (d.host === "y") {
      hostCountries[d.year] = d.name;
    }
  });

  var years = Object.keys(hostCountries).map(function(d) {return +d;});
  xaxis.tickValues(years);
  xaxis2.tickValues(years);

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height-margin.bottom) + ")")
    .call(xaxis);

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (margin.top-10) + ")")
    .call(xaxis2);

  // Vertical guide line
  var hiddenMargin = 100;
  var highlightedYear;
  var verticalGuide = svg.append("line")
    .attr("class", "guide")
    .attr("x1", -hiddenMargin)
    .attr("y1", margin.top - 10)
    .attr("x2", -hiddenMargin)
    .attr("y2", height - margin.bottom)
    .style("stroke-width", function() { return xscale(2) - xscale(0); }) //two year interval
    .style("opacity", 0);
  var mouseTrap = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("opacity", 0)
    .on("mouseover", function() { verticalGuide.style("opacity", 0.1); })
    .on("mouseout", function() { verticalGuide.style("opacity", 0); })
    .on("mousemove", function() {
      var mousex = d3.mouse(this)[0]
      var x = xscale.domain()[d3.bisect(xscale.range(), mousex) - 1]; //xscale.invert(mousex);
      var found = false;
      for (var i = 0; i < years.length; i++) {
        if (Math.abs(years[i] - x) <= 1) { // game interval (2 years) in half
          highlightedYear = years[i];
          found = true;
          break;
        }
      }
      if (!found) {
        highlightedYear = undefined;
      }

      mouseTrap.style("cursor", highlightedYear? "pointer":"auto");
      verticalGuide.attr("transform", "translate(" + (xscale(highlightedYear)+hiddenMargin) + ", 0)");
    })
    .on("click", function() {
      if (highlightedYear) {
        var url = "https://en.wikipedia.org/wiki/" + highlightedYear + ((highlightedYear <= 1975) ? "_Southeast_Asian_Peninsular_Games":"_Southeast_Asian_Games");
        window.open(url, "_blank");
      }
    });

  // nest by name and rank by total popularity
  var nested = d3.nest()
    .key(function(d) { return d.name; })
    .rollup(function(leaves) {
      return {
        data: leaves,
        sum: d3.sum(leaves, function(d) { return d.gold; })
      };
    })
    .entries(data)
    .sort(function(a, b) { return d3.descending(a.value.sum, b.value.sum); })

  var topnames = nested.slice(0, num).map(function(d) { return d.key; });
  data = data.filter(function(d) {
    return topnames.indexOf(d.name) > -1;
  });

  // nest by name and rank by total popularity
  window.byYear = {}
  d3.nest()
    .key(function(d) { return d.year; })
    .key(function(d) { return d.name; })
    // .sortValues(function(a, b) { return a.gold - b.gold; })
    .rollup(function(leaves,i) {
      return leaves[0].gold;
    })
    .entries(data)
    .forEach(function(year) {
      byYear[year.key] = {};
      year.values
        .sort(function(a, b) { return d3.descending(a.value, b.value); })
        .forEach(function(name, i) {
          byYear[year.key][name.key] = i;
        });
    });

  var ctx = canvas.node().getContext("2d");
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Draw a circle for each host country
  var countrySumRank = nested.map(function(d) { return d.key; });
  for (var year in hostCountries) {
    if (countrySumRank.indexOf(hostCountries[year]) < numTop) {
      ctx.fillStyle = color(hostCountries[year]);
    } else {
      ctx.fillStyle = "#888";
    }

    if (byYear[year] && byYear[year][hostCountries[year]]) {
      ctx.beginPath();
      ctx.arc(xscale(year), yscale(byYear[year][hostCountries[year]]), 5, 0, 2*Math.PI);
      ctx.fill();
      ctx.closePath();
    }
  }

  nested.slice(0, num).reverse().forEach(function(name, i) {
    var yearspopular = name.value.data;

    if (i >= num-numTop) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = color(name.key);
      ctx.lineWidth = 2.5;
    } else {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 1;
    }

    // bump line
    ctx.globalCompositeOperation = "darken";
    ctx.lineCap = "round";
    yearspopular.forEach(function(d, j) {
      if (j > 0) {
        var previousYear = yearspopular[j-1].year;

        ctx.beginPath();
        if ((d.year - previousYear) > 4) { //skipping games
          ctx.setLineDash([5, 10]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.moveTo(xscale(previousYear), yscale(byYear[previousYear][name.key]))
        // ctx.lineTo(xscale(d.year), yscale(byYear[d.year][name.key]));
        ctx.bezierCurveTo(
          xscale(previousYear)+15, yscale(byYear[previousYear][name.key]),
          xscale(d.year)-15, yscale(byYear[d.year][name.key]),
          xscale(d.year), yscale(byYear[d.year][name.key]));
        // ctx.closePath();
        ctx.stroke();
      }
    });
  });

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "10px sans-serif";
  nested.slice(0, num).reverse().forEach(function(name, i) {
    var yearspopular = name.value.data;
    if (i >= num-numTop) {
      ctx.fillStyle = color(name.key);
    } else {
      ctx.fillStyle = "#555";
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.9;

    // start names
    ctx.save();
    ctx.textAlign = "end";
    var start = yearspopular[0].year;
    var x = xscale(start)-10;
    var y = yscale(byYear[start][name.key]);
    switch (name.key) {
      case "Indonesia":   x += 30; y -= 10; break;
      case "Philippines": x += 45; y -= 10; break;
      case "Cambodia":    x += 10; y -= 10; break;
      default: break;
    }
    ctx.fillText(name.key, x, y);
    ctx.restore();

    // end names
    ctx.textAlign = "start";
    var end= yearspopular[yearspopular.length-1].year;
    ctx.fillText(name.key, xscale(end)+10, yscale(byYear[end][name.key]));
  });

  // legend
  var legendPos = {x: width*0.12, y: height*0.78};

  ctx.fillStyle = "#888";
  ctx.beginPath();
  ctx.arc(legendPos.x, legendPos.y, 5, 0, 2*Math.PI);
  ctx.fill();
  ctx.closePath();

  ctx.textAlign = "start";
  ctx.fillText("marks the years that each country hosts the SEA Games.", legendPos.x + 10, legendPos.y - 1);
});
