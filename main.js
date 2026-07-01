const GAMEBOARD_EL = document.getElementById('game-board');
const CANVAS = document.createElement('canvas');
CANVAS.width = window.innerWidth;
CANVAS.height = window.innerHeight;
GAMEBOARD_EL.append(CANVAS);
const ctx = CANVAS.getContext('2d', {alpha: false});
CANVAS.addEventListener('mousedown', handleMapMouseDown);
CANVAS.addEventListener('mousemove', handleMapMouseMove);
CANVAS.addEventListener('mouseup', handleMapMouseUp);
CANVAS.addEventListener('mouseleave', handleMapMouseUp);
CANVAS.addEventListener('wheel', handleMapWheel);
window.addEventListener('resize', handleResize);

const Terrain = {
  WATER: 0,
  GRASS: 1,
  FOREST: 2,
  VILLAGE: 3,
};
const TERRAIN_IMAGE = [
  document.getElementById('water'),
  document.getElementById('grass'),
  document.getElementById('forest'),
  document.getElementById('village'),
];
const MOVE_COST = [
  Infinity,  // water
  3,  // grass
  9,  // forest
  1,  // village
];

let mapData = window.defaultMap;
let markers = [2138, 2348];
let path = [];
const guys = [];
guys.push({
  moving: false,
  prevTile: null,
  prevTimestamp: null,
  nextTile: null,
  nextTimestamp: null,
  color: 'magenta',
});

let pathIndex = 0;
let stepDir = 1;
const moveTime = 100;
function animationLoop(now) {
  const guy = guys[0];
  if (guy.moving) {
    // update guy
    while (now > guy.nextTimestamp) {
      guy.prevTile = guy.nextTile;
      guy.prevTimestamp = guy.nextTimestamp;
      pathIndex += stepDir;
      guy.nextTile = path[pathIndex];
      const cost =
          (MOVE_COST[mapData.tiles[guy.prevTile]] + MOVE_COST[mapData.tiles[guy.nextTile]]) / 2;
      const diff = Math.abs(guy.prevTile - guy.nextTile);
      const dist = (diff === 1 || diff === mapData.width) ? 1 : Math.sqrt(2);
      guy.nextTimestamp += moveTime * cost * dist;
      if (pathIndex >= path.length - 1) {
        stepDir = -1;
      }
      if (pathIndex <= 0) {
        stepDir = 1;
      }
    }
    // interpolate between steps
    const prevTileY = Math.floor(guy.prevTile / mapData.width);
    const prevTileX = guy.prevTile - prevTileY * mapData.width;
    const nextTileY = Math.floor(guy.nextTile / mapData.width);
    const nextTileX = guy.nextTile - nextTileY * mapData.width;
    const fracPrev = (guy.nextTimestamp - now) / (guy.nextTimestamp - guy.prevTimestamp);
    const fracNext = 1 - fracPrev;
    guy.x = prevTileX * fracPrev + nextTileX * fracNext + 0.5;
    guy.y = prevTileY * fracPrev + nextTileY * fracNext + 0.5;
  } else if (path.length > 1) {
    guy.moving = true;
    pathIndex = 1;
    guy.prevTile = path[0];
    guy.prevTimestamp = now;
    guy.nextTile = path[1];
    const cost =
        (MOVE_COST[mapData.tiles[guy.prevTile]] + MOVE_COST[mapData.tiles[guy.nextTile]]) / 2;
    const diff = Math.abs(guy.prevTile - guy.nextTile);
    const dist = (diff === 1 || diff === mapData.width) ? 1 : Math.sqrt(2);
    guy.nextTimestamp = now + moveTime * cost * dist;
    const tileY = Math.floor(path[0] / mapData.width);
    const tileX = path[0] - tileY * mapData.width;
    guy.y = tileY + 0.5;
    guy.x = tileX + 0.5;
  }

  render();
  requestAnimationFrame(animationLoop);
}
requestAnimationFrame(animationLoop);

function render() {
//  console.time('render');

  clear(CANVAS, ctx);
  const scale = mapData.pixelsPerUnit;
  const mapHeight = mapData.tiles.length / mapData.width;

  // draw terrain
  const minTileX = Math.floor(mapData.leftX);
  const maxTileX = Math.floor(mapData.leftX + CANVAS.width / scale);
  const minTileY = Math.floor(mapData.topY);
  const maxTileY = Math.floor(mapData.topY + CANVAS.height / scale);
  for (let y = minTileY; y <= maxTileY; y++) {
    if (y < 0 || y >= mapHeight) continue;
    for (let x = minTileX; x <= maxTileX; x++) {
      if (x < 0 || x >= mapData.width) continue;
      const i = x + y * mapData.width;
      const terrain = mapData.tiles[i];
      ctx.drawImage(
          TERRAIN_IMAGE[terrain],
          // Add a fudge factor so there aren't gaps between tiles
          (x - mapData.leftX) * scale - 0.5,
          (y - mapData.topY) * scale - 0.5,
          scale + 1,
          scale + 1);
    }
  }

  // draw markers
  for (let marker of markers) {
    ctx.beginPath();
    ctx.fillStyle = 'red';
    const y = Math.floor(marker / mapData.width);
    const x = marker - y * mapData.width;
    ctx.arc(
        (x - mapData.leftX + 0.5) * scale,
        (y - mapData.topY + 0.5) * scale,
        scale / 2,
        0,
        2 * Math.PI);
    ctx.fill();
  }

  // draw path
  if (path.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    const startY = Math.floor(path[0] / mapData.width);
    const startX = path[0] - startY * mapData.width;
    ctx.moveTo(
        (startX - mapData.leftX + 0.5) * scale,
        (startY - mapData.topY + 0.5) * scale);
    for (let i = 1; i < path.length; i++) {
      const y = Math.floor(path[i] / mapData.width);
      const x = path[i] - y * mapData.width;
      ctx.lineTo(
          (x - mapData.leftX + 0.5) * scale,
          (y - mapData.topY + 0.5) * scale);
    }
    ctx.stroke();
  }

  // draw guys
  for (const guy of guys) {
    ctx.beginPath();
    ctx.fillStyle = guy.color;
    ctx.arc(
        (guy.x - mapData.leftX) * scale,
        (guy.y - mapData.topY) * scale,
        scale / 2,
        0,
        2 * Math.PI);
    ctx.fill();
  }

//  console.timeEnd('render');
}

const PAINT_SELECT = document.getElementById('paint-select');
document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'w':
      PAINT_SELECT.value = Terrain.WATER;
      break;
    case 'g':
      PAINT_SELECT.value = Terrain.GRASS;
      break;
    case 'f':
      PAINT_SELECT.value = Terrain.FOREST;
      break;
    case 'v':
      PAINT_SELECT.value = Terrain.VILLAGE;
      break;
    case ' ':
      document.getElementById('enable-painting').click();
  }
});

let isMouseDown = false;
let isPaintingEnabled = false;
let dragOriginPixel = new Array(2);
let dragOriginTile = new Array(2);
let draggingMarker = null;
function handleMapMouseDown(event) {
  isMouseDown = true;
  const x = Math.floor(mapData.leftX + event.offsetX / mapData.pixelsPerUnit);
  const y = Math.floor(mapData.topY + event.offsetY / mapData.pixelsPerUnit);
  const tile = x + mapData.width * y;
  if (markers.includes(tile)) {
    draggingMarker = tile;
    return;
  }
  if (isPaintingEnabled) {
    applyBrush(event);
  } else {
    dragOriginPixel[0] = event.offsetX;
    dragOriginPixel[1] = event.offsetY;
    dragOriginTile[0] = mapData.leftX;
    dragOriginTile[1] = mapData.topY;
  }
}

function handleMapMouseMove(event) {
  if (!isMouseDown) return;
  if (draggingMarker !== null) {
    const x = Math.floor(mapData.leftX + event.offsetX / mapData.pixelsPerUnit);
    const y = Math.floor(mapData.topY + event.offsetY / mapData.pixelsPerUnit);
    const tile = x + mapData.width * y;
    markers = markers.filter(m => m !== draggingMarker);
    markers.push(tile);
    markers.sort();
    draggingMarker = tile;
    path = findPath(markers[0], markers[1]);
    guys[0].moving = false;
    return;
  }
  if (isPaintingEnabled) {
    applyBrush(event);
  } else {
    const dx = dragOriginPixel[0] - event.offsetX;
    const dy = dragOriginPixel[1] - event.offsetY;
    mapData.leftX = dragOriginTile[0] + dx / mapData.pixelsPerUnit;
    mapData.topY = dragOriginTile[1] + dy / mapData.pixelsPerUnit;
  }
}

function handleMapMouseUp() {
  isMouseDown = false;
  draggingMarker = null;
}

let allowZoom = true;  // Limit once per frame
function handleMapWheel({deltaY, offsetX, offsetY}) {
  if (!allowZoom) return;
  allowZoom = false;
  const prev = mapData.pixelsPerUnit;
  const updated = clamp(prev - 2 * Math.sign(deltaY), 10, 100);
  if (updated !== prev) {
    mapData.pixelsPerUnit = updated;
    // Fix the location that the cursor is hovering over.
    mapData.leftX = mapData.leftX + offsetX / prev - offsetX / updated;
    mapData.topY = mapData.topY + offsetY / prev - offsetY / updated;
  }
  requestAnimationFrame(() => {
    allowZoom = true;
  });
}

const BRUSH_SELECT = document.getElementById('brush-select');

function applyBrush({offsetX, offsetY}) {
  const x = Math.floor(mapData.leftX + offsetX / mapData.pixelsPerUnit);
  const y = Math.floor(mapData.topY + offsetY / mapData.pixelsPerUnit);
  const size = parseInt(BRUSH_SELECT.value) - 1;
  const isCircle = BRUSH_SELECT.value.endsWith('c');
  const terrain = parseInt(PAINT_SELECT.value);
  const width = mapData.width;
  const height = Math.floor(mapData.tiles.length / width);
  for (let py = clamp(y - size, 0, height); py <= clamp(y + size, 0, height); py++) {
    for (let px = clamp(x - size, 0, width); px <= clamp(x + size, 0, width); px++) {
      if (isCircle && (x - px) ** 2 + (y - py) ** 2 > (size + 0.25) ** 2) continue;
      paintTile(px, py, terrain);
    }
  }
  path = findPath(markers[0], markers[1]);
  guys[0].moving = false;
}

function paintTile(x, y, terrain) {
  const i = x + mapData.width * y;
  if (0 <= i && i < mapData.tiles.length && mapData.tiles[i] !== terrain) {
    mapData.tiles[i] = terrain;
  }
}

document.getElementById('enable-painting').addEventListener('change', function() {
  isPaintingEnabled = this.checked;
  PAINT_SELECT.disabled = !this.checked;
  BRUSH_SELECT.disabled = !this.checked;
});

document.getElementById('clear-map').addEventListener('click', () => {
  const terrain = parseInt(PAINT_SELECT.value);;
  for (let i = 0; i < mapData.tiles.length; i++) {
    mapData.tiles[i] = terrain;
  }
});

document.getElementById('save-map-data').addEventListener('click', () => {
  console.time('save');
  const blob = new Blob([JSON.stringify(mapData)], {type: 'text/json'});
  const el = document.createElement('a');
  el.href = URL.createObjectURL(blob);
  el.download = `map_${Date.now()}.json`;
  document.body.appendChild(el);
  el.click();
  el.remove();
  console.timeEnd('save');
});


document.getElementById('load-map-data').addEventListener('click', () => {
  const uploader = document.createElement('input');
  uploader.type = 'file';
  uploader.accept = '.json';
  uploader.addEventListener('change', () => {
    console.time('load');
    const file = uploader.files[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', (e) => {
        const json = e.target.result;
        mapData = JSON.parse(json);
        console.timeEnd('load');
      });
      reader.readAsText(file);
    }
  });
  document.body.appendChild(uploader);
  uploader.click();
  uploader.remove();
});

function handleResize() {
  CANVAS.width = window.innerWidth;
  CANVAS.height = window.innerHeight;
}

function rand(n) {
  return Math.floor(Math.random() * n);
}

function clamp(n, low, high) {
  return n < low ? low : (n > high ? high : n);
}

function clear(canvas, ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function mod(n, m) {
  return n < 0 ? (n % m + m) % m : n % m;
}

const NBR_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];
const RT2_2 = Math.sqrt(2) / 2;
let prevStepArray;
function findPath(start, end) {
  if (MOVE_COST[mapData.tiles[start]] === Infinity) {
    return [];
  }
  if (start === end) {
    return [start];
  }
  console.time('findPath');

  if (prevStepArray && prevStepArray.length === mapData.tiles.length) {
    prevStepArray.fill(0);
  } else {
    if (mapData.tiles.length > 2**16 - 2) {
      prevStepArray = new Uint32Array(mapData.tiles.length);
    } else if (mapData.tiles.length > 2**8 - 2) {
      prevStepArray = new Uint16Array(mapData.tiles.length);
    } else {
      prevStepArray = new Uint8Array(mapData.tiles.length);
    }
  }
  prevStepArray[start] = -1;
  const q = new PriorityQueue((a, b) => a.cost < b.cost);
  q.push({
    tile: start,
    cost: 0,
  });

  const width = mapData.width;
  const height = mapData.tiles.length / mapData.width;
  const neighbors = (tile) => {
    const y = Math.floor(tile / width);
    const x = tile - y * width;
    return NBR_OFFSETS
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => 0 < nx && nx < width && 0 < ny && ny < height)
        .map(([nx, ny]) => ({
          tile: nx + width * ny,
          dist: x === nx || y === ny ? 0.5 : RT2_2,
        }));
  };

  let foundPath = false;
  while (!foundPath && !q.isEmpty()) {
    const curr = q.pop();
    // add neighbors
    for (const nbr of neighbors(curr.tile)) {
      const nbrMoveCost = MOVE_COST[mapData.tiles[nbr.tile]];
      if (nbrMoveCost === Infinity) {
        continue;
      }
      const stepCost = nbr.dist * (MOVE_COST[mapData.tiles[curr.tile]] + nbrMoveCost);
      if (prevStepArray[nbr.tile] === 0) {
        prevStepArray[nbr.tile] = curr.tile;
        q.push({
          tile: nbr.tile,
          cost: curr.cost + stepCost,
        });
      }
      // if neighbor is end, exit
      if (nbr.tile === end) {
        foundPath = true;
        break;
      }
    }
  }
  if (!foundPath) {
    console.timeEnd('findPath');
    return [];
  }
  const path = [end];
  let node = prevStepArray[end];
  while (node !== start) {
    path.push(node);
    node = prevStepArray[node];
  }
  path.push(start);

  console.timeEnd('findPath');
  return path.reverse();
}

// Source - https://stackoverflow.com/a/42919752
class PriorityQueue {
  constructor(comparator = (a, b) => a > b) {
    this._heap = [];
    this._comparator = comparator;
    this._top = 0;
    this._parent = i => ((i + 1) >>> 1) - 1;
    this._left = i => (i << 1) + 1;
    this._right = i => (i + 1) << 1;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() === 0;
  }
  peek() {
    return this._heap[this._top];
  }
  push(...values) {
    values.forEach(value => {
      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > this._top) {
      this._swap(this._top, bottom);
    }
    this._heap.pop();
    this._siftDown();
    return poppedValue;
  }
  replace(value) {
    const replacedValue = this.peek();
    this._heap[this._top] = value;
    this._siftDown();
    return replacedValue;
  }
  _greater(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > this._top && this._greater(node, this._parent(node))) {
      this._swap(node, this._parent(node));
      node = this._parent(node);
    }
  }
  _siftDown() {
    let node = this._top;
    while (
      (this._left(node) < this.size() && this._greater(this._left(node), node)) ||
      (this._right(node) < this.size() && this._greater(this._right(node), node))
    ) {
      let maxChild =
          (this._right(node) < this.size() && this._greater(this._right(node), this._left(node))) ?
          this._right(node) :
          this._left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}

path = findPath(markers[0], markers[1]);
