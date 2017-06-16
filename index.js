const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const d3 = require('d3');
const chartFrame = require('g-chartframe');

const toTitleCase = (str) => str.split(' ')
   .map(word => word[0].toUpperCase() + word.substr(1).toLowerCase())
   .join(' ');

const data = require('./westlife.json').map(d=>{
  d.highestPosition = d.positions.reduce((acc,p)=>{
    return Math.min(acc, p.position);
  },100);
  return d;
});

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console);

// set up the virtual dom
const dom = new JSDOM(fs.readFileSync('scaffold.html'), { virtualConsole });

//get the thing we'll be draing in
const chartContainer = d3.select(dom.window.document.querySelector('body div.chart'));

//go crazy with d3
const width = 1400, height = 700;
const frame = chartFrame.webFrameL({
  margin:{left:50,right:50,top:200},

  width,
  height,
  title:"Westlife's 14 <tspan fill=\"#F00\">number one</tspan> hits",
  subtitle:""
});

const timeScale = d3.scaleTime()
  .range([0, frame.dimension().width])
  .domain([
    d3.min(data, d=>new Date(d.dates.start)),
    d3.max(data, d=>new Date(d.dates.end))
  ]);

const positionScale = d3.scaleLinear()
  .range([0, frame.dimension().height])
  .domain([1,100]);

const line = d3.line()
  .x( d=>timeScale(new Date(d.date)) )
  .y( d=>positionScale(d.position) );

const timeAxis = d3.axisBottom()
  .scale(timeScale);

const positionAxis = d3.axisLeft()
  .scale(positionScale);

chartContainer
  .append('svg')
    .attr('xmlns','http://www.w3.org/2000/svg')
    .attr('xmlns:xlink','http://www.w3.org/1999/xlink')
  .call(frame);

const plot = chartContainer.select('.chart-plot')

plot.append('g')
  .attr('transform','translate(0,' + frame.dimension().height + ')')
  .attr('class','time-axis')
  .call(timeAxis);

plot.append('g')
  .attr('class','position-axis')
  .call(positionAxis);

plot.selectAll('path.song-line')
  .data(data)
  .enter()
  .append('path')
    .attr('d', d=>line(d.positions))
    .attr('class','song-line')
    .attr('fill','none')
    .attr('stroke', (d)=>{
      if(d.highestPosition === 1) return '#F00';
      return '#000';
    })
    .attr('stroke-width',3)
    .attr('data-title',d=>d.title);

plot.selectAll('g.label')
  .data(data.filter(d=>(d.highestPosition===1)))
  .enter()
  .append('g')
    .attr('class','label')
    .attr('transform',d=>{
      return 'translate(' + timeScale(new Date(d.dates.start)) + ', 0), rotate(-45)';
    })
  .append('text')
    .attr('font-size','12')
    .text(d=>toTitleCase(d.title))



//get the resulting markup
//append the doc type and so on
const doctype = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`;
const markup = doctype + chartContainer.html().trim();

//save the resulting SVG
const dir = __dirname + '/dist';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}
fs.writeFileSync('dist/westlife.svg', markup);
