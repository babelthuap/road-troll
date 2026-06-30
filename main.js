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

let mapData = window.defaultMap;
render();

for (const image of TERRAIN_IMAGE) {
  image.onload = render;
}

function render() {
  console.time('render');

  clear(CANVAS, ctx);
  const scale = mapData.pixelsPerUnit;
  const mapHeight = mapData.tiles.length / mapData.width;
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
      ctx.beginPath();
      ctx.drawImage(
          TERRAIN_IMAGE[terrain],
          // Add a fudge factor so there aren't gaps between tiles
          (x - mapData.leftX) * scale - 0.5,
          (y - mapData.topY) * scale - 0.5,
          scale + 1,
          scale + 1);
    }
  }

  console.timeEnd('render');
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
  }
});

let isMouseDown = false;
let isPaintingEnabled = true;
let dragOriginPixel = new Array(2);
let dragOriginTile = new Array(2);
function handleMapMouseDown(event) {
  isMouseDown = true;
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
  if (isPaintingEnabled) {
    applyBrush(event);
  } else {
    const dx = dragOriginPixel[0] - event.offsetX;
    const dy = dragOriginPixel[1] - event.offsetY;
    mapData.leftX = dragOriginTile[0] + dx / mapData.pixelsPerUnit;
    mapData.topY = dragOriginTile[1] + dy / mapData.pixelsPerUnit;
    render();
  }
}

function handleMapMouseUp() {
  isMouseDown = false;
  dragOriginX = null;
  dragOriginY = null;
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
    render();
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
  render();
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
  render();
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
        render();
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
  render();
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
