var num = 58;

var margin = {top: 60, right: 80, bottom: 60, left: 70};
var width = 950,
    height = 700;

var devicePixelRatio = window.devicePixelRatio || 1;

var canvas = d3.select("canvas")
    .attr("width", width * devicePixelRatio)
    .attr("height", height * devicePixelRatio)
    .style("width", width + "px")
    .style("height", height + "px");

var svg = d3.select("svg")
    .style("width", width + "px")
    .style("height", height + "px");

let color = d3.interpolatePuRd;
// var color = d3.scaleOrdinal()
//   .range(["#DB7F85", "#50AB84", "#4C6C86", "#C47DCB", "#B59248", "#DD6CA7", "#E15E5A", "#5DA5B3", "#725D82", "#54AF52", "#954D56"]);

const top_singles = ["Aitakatta", "Koisuru Fortune Cookie", "Shonichi", "Kimi wa Melody"];

var xscale = d3.scalePoint()
  // .domain([1959, 2017])
  .range([margin.left, width-margin.right])
  .padding(0.5);
let invertXscale = function(x) {
  let domain = xscale.domain();
  let range = xscale.range();
  let rangePoints = d3.range(range[0], range[1], xscale.step());
  return domain[d3.bisect(rangePoints, x) - 1];
}

var xAxisTop = d3.axisTop();
var xAxisBottom = d3.axisBottom();

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
  let findNickname = function(name) {
    return members.find((member) => member.name === name).nickname;
  }

  let data = [];
  let single_centers = {};
  singles.forEach(function(single) {
    let center = (single.center)? single.center.split(";") : [];
    single_centers[single.name] = center.map(findNickname);

    let single_members = single.members.split(";");
    members.forEach(function(member, i) {
      let single_member_index = single_members.indexOf(member.name);
      data.push({
        year: single.name,
        name: member.nickname,
        order: (single_member_index >= 0)? 1 : 0,
        center: (center.indexOf(member.name) >= 0)? "y" : "n"
      });
    });
    data.push({
      year: single.name,
      name: "Senbatsu",
      order: 0.5,
      center: "n"
    });
    // single_members.forEach(function(member_name, i) {
    //   data.push({
    //     year: single.name,
    //     name: findNickname(member_name),
    //     order: 100-i,
    //     center: (center.indexOf(member_name) >= 0)? "y" : "n"
    //   });
    // });
  });

  let single_names = singles.map(function(single) { return single.name; });
  xscale.domain(single_names);
  xAxisTop.scale(xscale);
  xAxisBottom.scale(xscale);

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (margin.top-10) + ")")
    .call(xAxisTop)
    .selectAll("text")
      .attr("text-anchor", "start")
      // .attr("dx", "1em")
      .attr("transform", "rotate(-15)");

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height-margin.bottom+5) + ")")
    .call(xAxisBottom)
    .selectAll("text")
      .attr("text-anchor", "start")
      // .attr("dx", "1em")
      .attr("transform", "rotate(15)");

  // Vertical guide line
  var hiddenMargin = 100;
  var highlightedYear;
  var verticalGuide = svg.append("line")
    .attr("class", "guide")
    .attr("x1", -hiddenMargin)
    .attr("y1", margin.top - 10)
    .attr("x2", -hiddenMargin)
    .attr("y2", height - margin.bottom + 5)
    .style("stroke-width", function() { return xscale.step(); })
    .style("opacity", 0);
  var mouseTrap = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("opacity", 0)
    .on("mouseover", function() { verticalGuide.style("opacity", 0.1); })
    .on("mouseout", function() { verticalGuide.style("opacity", 0); })
    .on("mousemove", function() {
      let mousex = d3.mouse(this)[0]
      let highlightedYear = invertXscale(mousex);

      // mouseTrap.style("cursor", highlightedYear? "pointer":"auto");
      verticalGuide.attr("transform", "translate(" + (xscale(highlightedYear)+hiddenMargin) + ", 0)");
    });

  // nest by name and rank by total popularity
  var nested = d3.nest()
    .key(function(d) { return d.name; })
    .rollup(function(leaves) {
      return {
        data: leaves,
        sum: d3.sum(leaves, function(d) { return d.order; })
      };
    })
    .entries(data)
    .sort(function(a, b) { return d3.ascending(a.value.sum, b.value.sum); });

  // var topnames = nested.map(function(d) { return d.key; });
  // data = data.filter(function(d) {
  //   return topnames.indexOf(d.name) > -1;
  // });

  // nest by name and rank by total popularity
  let byYear = {}
  d3.nest()
    .key(function(d) { return d.year; })
    .key(function(d) { return d.name; })
    // .sortValues(function(a, b) { return a.order - b.order; })
    .rollup(function(leaves,i) {
      return leaves[0].order;
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

  // Draw a circle for each center
  var countrySumRank = nested.map(function(d) { return d.key; });
  for (var year in single_centers) {
    single_centers[year].forEach(function(center) {
      ctx.fillStyle = color(countrySumRank.indexOf(center) / num);
      ctx.beginPath();
      ctx.arc(xscale(year), yscale(byYear[year][center]), 5, 0, 2*Math.PI);
      ctx.fill();
      ctx.closePath();
    });
  }

  nested.forEach(function(name, i) {
    var yearspopular = name.value.data;

    if (name.key === "Senbatsu") {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 5;
    } else {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color(i / num);
      ctx.lineWidth = 1;
    }

    // bump line
    ctx.globalCompositeOperation = "darken";
    ctx.lineCap = "round";

    yearspopular.forEach(function(d, j) {
      if (j > 0) {
        let previousYear = yearspopular[j-1].year;
        let curr = {
          x: xscale(previousYear),
          y: yscale(byYear[previousYear][name.key])
        };
        let next = {
          x: xscale(d.year),
          y: yscale(byYear[d.year][name.key])
        };

        ctx.beginPath();
        // if ((d.year - previousYear) > 4) { //skipping games
        //   ctx.setLineDash([5, 10]);
        // } else {
        //   ctx.setLineDash([]);
        // }
        ctx.moveTo(curr.x, curr.y)
        ctx.bezierCurveTo(
          curr.x + xscale.step()/2, curr.y,
          next.x - xscale.step()/2, next.y,
          next.x, next.y);
        // ctx.closePath();
        ctx.stroke();
      }
    });
  });

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "10px sans-serif";
  nested.forEach(function(name, i) {
    var yearspopular = name.value.data;
    if (name.key === "Senbatsu") {
      ctx.fillStyle = "white";
    } else {
      ctx.fillStyle = color(i / num);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.9;

    // start names
    ctx.save();
    ctx.textAlign = "end";
    var start = yearspopular[0].year;
    var x = xscale(start) - xscale.step()/2 - 10;
    var y = yscale(byYear[start][name.key]);
    // switch (name.key) {
    //   case "Indonesia":   x += 30; y -= 10; break;
    //   case "Philippines": x += 45; y -= 10; break;
    //   case "Cambodia":    x += 10; y -= 10; break;
    //   default: break;
    // }
    ctx.fillText(name.key, x, y);
    ctx.restore();

    // end names
    ctx.textAlign = "start";
    var end= yearspopular[yearspopular.length-1].year;
    ctx.fillText(name.key, xscale(end) + xscale.step()/2 + 10, yscale(byYear[end][name.key]));
  });

  // legend
  var legendPos = {x: width*0.12, y: height*0.80};

  ctx.fillStyle = "#888";
  ctx.beginPath();
  ctx.arc(legendPos.x, legendPos.y, 5, 0, 2*Math.PI);
  ctx.fill();
  ctx.closePath();

  ctx.textAlign = "start";
  ctx.fillText("marks the 'centers'.", legendPos.x + 10, legendPos.y - 1);
});
