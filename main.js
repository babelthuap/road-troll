const GAMEBOARD_EL = document.getElementById('game-board');
const CANVAS = document.createElement('canvas');
CANVAS.width = window.innerWidth;
CANVAS.height = window.innerHeight;
GAMEBOARD_EL.append(CANVAS);
const ctx = CANVAS.getContext('2d', {alpha: false});
CANVAS.addEventListener('mousedown', handleMapMouseDown);
CANVAS.addEventListener('mousemove', handleMapMouseMove);
CANVAS.addEventListener('mouseup', handleMapMouseUp);
window.addEventListener('resize', handleResize);

const Terrain = {
  WATER: 0,
  GRASS: 1,
  FOREST: 2,
  VILLAGE: 3,
};
const TERRAIN_COLOR = new Map([
  [Terrain.WATER, '#00c'],
  [Terrain.GRASS, '#0f0'],
  [Terrain.FOREST, '#070'],
  [Terrain.VILLAGE, '#8B4513'],
]);

let mapData = {
  width: 100,
  pixelsPerUnit: 15,
  tiles: new Array(5000),
};
for (let i = 0; i < 5000; i++) {
  mapData.tiles[i] = rand(Object.entries(Terrain).length);
}
render();

function render() {
  console.time('render');

  clear(CANVAS, ctx);
  const scale = mapData.pixelsPerUnit;
  let x = 0;
  let y = 0;
  for (let i = 0; i < mapData.tiles.length; i++) {
    ctx.beginPath();
    ctx.rect(x * scale, y * scale, scale, scale);
    ctx.fillStyle = TERRAIN_COLOR.get(mapData.tiles[i]);
    ctx.fill();
    x++;
    if (x === mapData.width) {
      x = 0;
      y++;
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
function handleMapMouseDown(event) {
  isMouseDown = true;
  applyBrush(event);
}

function handleMapMouseMove(event) {
  if (!isMouseDown) return;
  applyBrush(event);
}

function handleMapMouseUp() {
  isMouseDown = false;
}

const BRUSH_SELECT = document.getElementById('brush-select');


function applyBrush({offsetX, offsetY}) {
  const x = Math.floor(offsetX / mapData.pixelsPerUnit);
  const y = Math.floor(offsetY / mapData.pixelsPerUnit);
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
