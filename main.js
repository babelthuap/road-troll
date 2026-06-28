const GAMEBOARD_EL = document.getElementById('game-board');
const CANVAS = document.createElement('canvas');
CANVAS.width = window.innerWidth;
CANVAS.height = window.innerHeight;
GAMEBOARD_EL.append(CANVAS);
const ctx = CANVAS.getContext('2d', {alpha: false});
CANVAS.addEventListener('mousedown', handleMapClick);
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
function handleMapClick(event) {
  const x = Math.floor(event.offsetX / mapData.pixelsPerUnit);
  const y = Math.floor(event.offsetY / mapData.pixelsPerUnit);
  const i = x + mapData.width * y;
  mapData.tiles[i] = parseInt(PAINT_SELECT.value);
  render();
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

function clear(canvas, ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function mod(n, m) {
  return n < 0 ? (n % m + m) % m : n % m;
}
