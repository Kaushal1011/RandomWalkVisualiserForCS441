let nodes = [];
let links = [];
let messages = [];
let initialNodes = [];
let simulation;
const width = 1920;
const height = 1080;
let animationTimer = null;
const svg = d3.select('svg').attr('width', width).attr('height', height);

svg
	.append('defs')
	.append('marker')
	.attr('id', 'arrowhead')
	.attr('viewBox', '-0 -5 10 10')
	.attr('refX', 13)
	.attr('refY', 0)
	.attr('orient', 'auto')
	.attr('markerWidth', 13)
	.attr('markerHeight', 13)
	.attr('xoverflow', 'visible')
	.append('svg:path')
	.attr('d', 'M 0,-5 L 10 ,0 L 0,5')
	.attr('fill', '#999')
	.style('stroke', 'none');

const g = svg.append('g');

const zoom = d3
	.zoom()
	.scaleExtent([0.1, 10])
	.on('zoom', (event) => {
		g.attr('transform', event.transform);
	});

svg.call(zoom);

document.getElementById('fileInput').addEventListener('change', readFile);

function readFile(event) {
	const file = event.target.files[0];
	const reader = new FileReader();

	reader.onload = function () {
		const lines = reader.result.split('\n');

		lines.forEach((line) => {
			if (line.includes('Initial nodes')) {
				initialNodes = line
					.split('Initial nodes,')[1]
					.split(',')
					.map((d) => parseInt(d));
			} else if (line.includes('Message Passed')) {
				const parts = line.split('Message Passed,')[1].split(',');
				messages.push({
					src: parseInt(parts[0]),
					dst: parseInt(parts[1]),
					superstep: parseInt(parts[2]),
				});
			}
		});

		// Construct nodes and links arrays
		messages.forEach((m) => {
			if (!nodes.includes(m.src)) nodes.push(m.src);
			if (!nodes.includes(m.dst)) nodes.push(m.dst);
			links.push({ source: m.src, target: m.dst });
		});

		createVisualization();
	};

	reader.readAsText(file);
}

function createVisualization() {
	nodes = nodes.map((d) => ({ id: d }));

	// Initially, all links are hidden
	links = links.map((d) => ({ ...d, visible: false }));

	simulation = d3
		.forceSimulation(nodes)
		.force(
			'link',
			d3.forceLink(links).id((d) => d.id)
		)
		.force('charge', d3.forceManyBody().strength(-20))
		.force('center', d3.forceCenter(width / 2, height / 2 - 100));

	// Links
	const link = svg
		.append('g')
		.attr('class', 'links')
		.selectAll('line')
		.data(links)
		.enter()
		.append('line')
		.attr('stroke-width', (d) => {
			const numLinks = links.filter((link) => link.source === d.source && link.target === d.target).length;
			return 0.3 + numLinks / 5; // Change the logic as needed
		})
		.attr('stroke', 'grey')
		.attr('marker-end', 'url(#arrowhead)'); // Add this line for arrowheads

	// Nodes
	const node = svg
		.append('g')
		.attr('class', 'nodes')
		.selectAll('circle')
		.data(nodes)
		.enter()
		.append('circle')
		.attr('r', (d) => {
			const numLinks = links.filter((link) => link.source === d || link.target === d).length;
			return 5 + numLinks; // Change the logic as needed
		})
		.attr('fill', (d) => (initialNodes.includes(d.id) ? 'red' : 'blue'))
		.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

	simulation.nodes(nodes).on('tick', ticked);
	simulation.force('link').links(links);

	function ticked() {
		link
			.attr('x1', (d) => d.source.x)
			.attr('y1', (d) => d.source.y)
			.attr('x2', (d) => d.target.x)
			.attr('y2', (d) => d.target.y);

		node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
	}

	function dragstarted(event, d) {
		if (!event.active) simulation.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
	}

	function dragged(event, d) {
		d.fx = event.x;
		d.fy = event.y;
	}

	function dragended(event, d) {
		if (!event.active) simulation.alphaTarget(0);
		d.fx = null;
		d.fy = null;
	}
}

function startSimulation() {
	let step = 0;
	const maxStep = d3.max(messages, (d) => d.superstep);
	console.log('maxStep', maxStep);

	// Start the animation for the first step
	animateStep(step);

	function animateStep(step) {
		console.log('called for step', step);
		const currentMessages = messages.filter((m) => m.superstep === step);
		console.log('currentMessages', currentMessages);

		currentMessages.forEach((msg) => {
			const link = links.find((l) => l.source.id === msg.src && l.target.id === msg.dst);
			const srcNode = nodes.find((n) => n.id === msg.src);
			const dstNode = nodes.find((n) => n.id === msg.dst);

			link.visible = true;
			srcNode.color = 'yellow';
			dstNode.color = 'orange';
		});

		// Transition to smoothly reveal links and color nodes
		svg
			.selectAll('line')
			.transition()
			.duration(500)
			.attr('stroke-opacity', (d) => (d.visible ? 1 : 0));

		svg
			.selectAll('circle')
			.transition()
			.duration(500)
			.attr('fill', (d) => (d.color ? d.color : initialNodes.includes(d.id) ? 'red' : 'blue'));

		// Check if there are more steps and call animateStep accordingly
		if (step < maxStep) {
			step += 1;
			animationTimer = setTimeout(() => animateStep(step), 500); // Increase the time between supersteps
		}
	}
}

function stopSimulation() {
	if (animationTimer) {
		clearTimeout(animationTimer);
	}
}

function restartSimulation() {
	stopSimulation();
	links.forEach((link) => (link.visible = false));
	nodes.forEach((node) => delete node.color);

	svg.selectAll('line').attr('stroke-opacity', 0);
	svg.selectAll('circle').attr('fill', (d) => (initialNodes.includes(d.id) ? 'red' : 'blue'));

	startSimulation();
}
