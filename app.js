// Configurator State (Dynamic Client-Side Canvas Version with Alpha Masks)
let state = {
  activeMode: 'sync', // 'sync' or 'separate'
  activeTarget: 'shelves', // 'shelves' or 'walls'
  selectedFabrics: {
    shelves: null, // Starts as neutral GRAY
    walls: null    // Starts as neutral GRAY
  },
  fabrics: [], // Full catalog loaded from fabrics.json
  filters: {
    search: '',
    category: 'all',
    catalog: 'Camira'
  }
};

// Global Asset Objects
const assets = {
  baseGray: null,
  baseGrayBright: null,
  maskGreen: null,
  maskBunks: null,
  maskBackrest: null,
  maskCushion: null
};

// Swatch Image DOM Object cache
const swatchCache = {};

// Neutral Gray fabric object
const grayFabric = {
  code: "GRAY",
  url: "swatches/GRAY.jpg",
  r: 140,
  g: 140,
  b: 140,
  category: "neutral"
};

// Initialize Configurator
document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true, 'Завантаження графічних ресурсів...');
  
  try {
    // 1. Preload base images and masks
    await preloadBaseAssets();
    
    showLoading(true, 'Завантаження каталогу тканин...');
    
    // 2. Load fabrics catalog
    const response = await fetch('fabrics.json');
    const allFabrics = await response.json();
    
    // Merge neutral GRAY at the beginning, then include all catalog fabrics
    state.fabrics = [grayFabric, ...allFabrics];
    
    // Set default selected fabrics to neutral GRAY (сірий колір)
    state.selectedFabrics.shelves = grayFabric;
    state.selectedFabrics.walls = grayFabric;
    
    // Update Catalog UI texts (description, badge counters)
    updateCatalogUI();
    
    // 3. Render UI controls
    renderSwatches();
    renderFilters();
    updateSummary();
    
    // 4. Initial rendering on Canvas
    await renderCanvasDesign();
    
    // 5. Setup UI Event Listeners
    setupEventListeners();
    
    showLoading(false);
  } catch (error) {
    console.error('Initialization error:', error);
    showLoading(true, 'Помилка завантаження графіки.');
  }
});

// Preload Base Image and Mask assets
function preloadBaseAssets() {
  const loadImg = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    });
  };
  
  return Promise.all([
    loadImg('base_gray.png'),
    loadImg('base_gray_bright.png'),
    loadImg('mask_green.png'),
    loadImg('mask_red.png')
  ]).then(([baseGray, baseGrayBright, maskGreen, maskRed]) => {
    assets.baseGray = baseGray;
    assets.baseGrayBright = baseGrayBright;
    
    // Convert grayscale mask_green to transparent alpha mask
    assets.maskGreen = convertGrayscaleToAlpha(maskGreen);
    
    // Split mask_red and convert to transparent alpha sub-masks
    splitRedMask(maskRed);
  });
}

// Convert a grayscale black-and-white image to a transparent alpha mask
function convertGrayscaleToAlpha(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    // Map the red channel brightness directly to the alpha channel
    data[i + 3] = r;
  }
  
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Split the red mask into sub-masks based on height (Y-coordinate) and map grayscale to alpha
function splitRedMask(maskRedImg) {
  const W = maskRedImg.width;
  const H = maskRedImg.height;
  
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(maskRedImg, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;
  
  const canvasBunks = document.createElement('canvas');
  canvasBunks.width = W;
  canvasBunks.height = H;
  const ctxBunks = canvasBunks.getContext('2d');
  const imgDataBunks = ctxBunks.createImageData(W, H);
  
  const canvasBackrest = document.createElement('canvas');
  canvasBackrest.width = W;
  canvasBackrest.height = H;
  const ctxBackrest = canvasBackrest.getContext('2d');
  const imgDataBackrest = ctxBackrest.createImageData(W, H);
  
  const canvasCushion = document.createElement('canvas');
  canvasCushion.width = W;
  canvasCushion.height = H;
  const ctxCushion = canvasCushion.getContext('2d');
  const imgDataCushion = ctxCushion.createImageData(W, H);
  
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // If the grayscale mask pixel is active (white/gray)
      if (r > 10) {
        if (y < 1000) {
          imgDataBunks.data[idx] = r;
          imgDataBunks.data[idx+1] = g;
          imgDataBunks.data[idx+2] = b;
          imgDataBunks.data[idx+3] = r; // Set alpha channel = red brightness
        } else if (y < 1140) {
          imgDataBackrest.data[idx] = r;
          imgDataBackrest.data[idx+1] = g;
          imgDataBackrest.data[idx+2] = b;
          imgDataBackrest.data[idx+3] = r; // Set alpha channel = red brightness
        } else {
          imgDataCushion.data[idx] = r;
          imgDataCushion.data[idx+1] = g;
          imgDataCushion.data[idx+2] = b;
          imgDataCushion.data[idx+3] = r; // Set alpha channel = red brightness
        }
      }
    }
  }
  
  ctxBunks.putImageData(imgDataBunks, 0, 0);
  ctxBackrest.putImageData(imgDataBackrest, 0, 0);
  ctxCushion.putImageData(imgDataCushion, 0, 0);
  
  assets.maskBunks = canvasBunks;
  assets.maskBackrest = canvasBackrest;
  assets.maskCushion = canvasCushion;
}

// Fetch and Cache Swatch Images
function getSwatchImage(url) {
  if (swatchCache[url]) {
    return Promise.resolve(swatchCache[url]);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      // Automatically detect if the swatch has vertical stripes
      img.needsRotation = detectVerticalOrientation(img);
      swatchCache[url] = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load swatch: ${url}`));
  });
}

// Detect if fabric swatch has vertical stripes (requires 90deg rotation to become horizontal)
function detectVerticalOrientation(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 64, 64);
    
    const imgData = ctx.getImageData(0, 0, 64, 64);
    const data = imgData.data;
    
    // Convert to grayscale
    const gray = new Uint8Array(64 * 64);
    for (let i = 0; i < 64 * 64; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    let diffX = 0;
    let diffY = 0;
    
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 63; x++) {
        diffX += Math.abs(gray[y * 64 + x + 1] - gray[y * 64 + x]);
      }
    }
    
    for (let y = 0; y < 63; y++) {
      for (let x = 0; x < 64; x++) {
        diffY += Math.abs(gray[(y + 1) * 64 + x] - gray[y * 64 + x]);
      }
    }
    
    // ratio > 1.05 means vertical lines (horizontal changes are larger than vertical changes)
    return diffX > diffY * 1.05;
  } catch (e) {
    console.error("Orientation detection failed (possibly CORS cross-origin taint):", e);
    return false;
  }
}

// Temporary canvases to offload composition memory
const offCanvasTiled = document.createElement('canvas');
const offCanvasLayer = document.createElement('canvas');

// Render the entire design on high-resolution canvas
async function renderCanvasDesign() {
  const canvas = document.getElementById('visualizer-canvas');
  if (!canvas || !assets.baseGray || !assets.baseGrayBright) return;
  
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  
  offCanvasTiled.width = W;
  offCanvasTiled.height = H;
  offCanvasLayer.width = W;
  offCanvasLayer.height = H;
  
  const ctxTiled = offCanvasTiled.getContext('2d');
  const ctxLayer = offCanvasLayer.getContext('2d');
  
  showLoading(true, 'Малювання дизайну...');
  
  // 1. Draw original base image (background walls, wood panels, ceiling)
  ctx.drawImage(assets.baseGray, 0, 0);
  
  try {
    // 2. Draw walls layer if not GRAY
    const wallsFabric = state.selectedFabrics.walls;
    if (wallsFabric && wallsFabric.code !== 'GRAY') {
      const swatch = await getSwatchImage(wallsFabric.url);
      
      // Step A: Create rotated and scaled swatch (smaller scale for Camira)
      const isCamira = wallsFabric.catalog && wallsFabric.catalog.startsWith('Camira');
      const scale = isCamira ? 0.22 : 0.32;
      const swatchCanvas = document.createElement('canvas');
      const rotateSwatch = swatch.needsRotation;
      
      if (rotateSwatch) {
        swatchCanvas.width = Math.round(swatch.height * scale);
        swatchCanvas.height = Math.round(swatch.width * scale);
      } else {
        swatchCanvas.width = Math.round(swatch.width * scale);
        swatchCanvas.height = Math.round(swatch.height * scale);
      }
      
      const sCtx = swatchCanvas.getContext('2d');
      
      // Apply GPU-accelerated contrast and saturation filters (disabled for Lantal)
      if (wallsFabric.catalog === 'Lantal') {
        sCtx.filter = 'none';
      } else {
        sCtx.filter = 'saturate(1.35) contrast(1.1)';
      }
      
      if (rotateSwatch) {
        // Rotate 90 degrees clockwise Lossless
        sCtx.translate(swatchCanvas.width, 0);
        sCtx.rotate(Math.PI / 2);
        sCtx.drawImage(swatch, 0, 0, swatch.width, swatch.height, 0, 0, swatchCanvas.height, swatchCanvas.width);
      } else {
        // Draw flat without rotation
        sCtx.drawImage(swatch, 0, 0, swatch.width, swatch.height, 0, 0, swatchCanvas.width, swatchCanvas.height);
      }
      
      // Step B: Tile and shear walls fabric onto offCanvasTiled (padded)
      ctxTiled.clearRect(0, 0, W, H);
      const padY = 300;
      ctxTiled.save();
      
      // k_walls = 0.09
      ctxTiled.transform(1, 0.09, 0, 1, 0, -padY);
      const pattern = ctxTiled.createPattern(swatchCanvas, 'repeat');
      ctxTiled.fillStyle = pattern;
      ctxTiled.fillRect(0, 0, W, H + 2 * padY);
      ctxTiled.restore();
      
      // Step C: Multiply tiled fabric with base on offCanvasLayer (use bright base to avoid darkening)
      ctxLayer.clearRect(0, 0, W, H);
      const baseImg = assets.baseGrayBright;
      ctxLayer.drawImage(baseImg, 0, 0);
      ctxLayer.globalCompositeOperation = 'multiply';
      ctxLayer.drawImage(offCanvasTiled, 0, 0);
      
      // Step D: Mask walls with maskGreen
      ctxLayer.globalCompositeOperation = 'destination-in';
      ctxLayer.drawImage(assets.maskGreen, 0, 0);
      ctxLayer.globalCompositeOperation = 'source-over';
      
      // Step E: Draw on main canvas
      ctx.drawImage(offCanvasLayer, 0, 0);
    }
    
    // 3. Draw shelves/seats layer if not GRAY
    const shelvesFabric = state.selectedFabrics.shelves;
    if (shelvesFabric && shelvesFabric.code !== 'GRAY') {
      const swatch = await getSwatchImage(shelvesFabric.url);
      
      // Step A: Create rotated & scaled swatch canvas (smaller scale for Camira)
      const isCamira = shelvesFabric.catalog && shelvesFabric.catalog.startsWith('Camira');
      const scale = isCamira ? 0.22 : 0.32;
      const swatchCanvas = document.createElement('canvas');
      const rotateSwatch = swatch.needsRotation;
      
      if (rotateSwatch) {
        swatchCanvas.width = Math.round(swatch.height * scale);
        swatchCanvas.height = Math.round(swatch.width * scale);
      } else {
        swatchCanvas.width = Math.round(swatch.width * scale);
        swatchCanvas.height = Math.round(swatch.height * scale);
      }
      
      const sCtx = swatchCanvas.getContext('2d');
      
      if (shelvesFabric.catalog === 'Lantal') {
        sCtx.filter = 'none';
      } else {
        sCtx.filter = 'saturate(1.35) contrast(1.1)';
      }
      
      if (rotateSwatch) {
        sCtx.translate(swatchCanvas.width, 0);
        sCtx.rotate(Math.PI / 2);
        sCtx.drawImage(swatch, 0, 0, swatch.width, swatch.height, 0, 0, swatchCanvas.height, swatchCanvas.width);
      } else {
        sCtx.drawImage(swatch, 0, 0, swatch.width, swatch.height, 0, 0, swatchCanvas.width, swatchCanvas.height);
      }
      
      // Render the three sub-layers for shelves/seats perspective slants
      const subLayers = [
        { mask: assets.maskBunks, k: 0.04 },
        { mask: assets.maskBackrest, k: 0.05 },
        { mask: assets.maskCushion, k: -0.17 }
      ];
      
      for (const layer of subLayers) {
        ctxTiled.clearRect(0, 0, W, H);
        const padY = 300;
        ctxTiled.save();
        ctxTiled.transform(1, layer.k, 0, 1, 0, -padY);
        const pattern = ctxTiled.createPattern(swatchCanvas, 'repeat');
        ctxTiled.fillStyle = pattern;
        ctxTiled.fillRect(0, 0, W, H + 2 * padY);
        ctxTiled.restore();
        
        ctxLayer.clearRect(0, 0, W, H);
        const baseImg = assets.baseGrayBright;
        ctxLayer.drawImage(baseImg, 0, 0);
        ctxLayer.globalCompositeOperation = 'multiply';
        ctxLayer.drawImage(offCanvasTiled, 0, 0);
        
        ctxLayer.globalCompositeOperation = 'destination-in';
        ctxLayer.drawImage(layer.mask, 0, 0);
        ctxLayer.globalCompositeOperation = 'source-over';
        
        ctx.drawImage(offCanvasLayer, 0, 0);
      }
    }
  } catch (error) {
    console.error('Real-time composition failed:', error);
  } finally {
    showLoading(false);
  }
}

// Render Swatches in Grid
function renderSwatches() {
  const grid = document.getElementById('swatches-grid');
  grid.innerHTML = '';
  
  const filtered = state.fabrics.filter(fab => {
    const isGray = fab.code === 'GRAY';
    const matchesCatalog = isGray || fab.catalog === state.filters.catalog;
    const matchesSearch = fab.code.toLowerCase().includes(state.filters.search.toLowerCase());
    const matchesCategory = state.filters.category === 'all' || fab.category === state.filters.category;
    return matchesCatalog && matchesSearch && matchesCategory;
  });
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <span>🔍</span>
        <p>Нічого не знайдено</p>
      </div>
    `;
    return;
  }
  
  filtered.forEach(fab => {
    const isSelected = isFabricSelected(fab);
    
    const card = document.createElement('div');
    card.className = `swatch-card ${isSelected ? 'active' : ''}`;
    card.dataset.code = fab.code;
    
    let displayName = `${fab.catalog || 'Camira'} ${fab.code}`;
    if (fab.code === 'GRAY') displayName = 'Базовий Сірий';
    
    card.title = displayName;
    
    card.innerHTML = `
      <div class="swatch-check">✓</div>
      <div class="swatch-image-wrapper">
        <img src="${fab.url}" alt="${fab.code}" loading="lazy">
      </div>
      <div class="swatch-code">${fab.code === 'GRAY' ? 'СІРИЙ' : fab.code}</div>
    `;
    
    card.addEventListener('click', () => selectFabric(fab));
    grid.appendChild(card);
  });
}

// Render dynamic filter tabs count
function renderFilters() {
  const catalogFabrics = state.fabrics.filter(f => f.code === 'GRAY' || f.catalog === state.filters.catalog);
  const counts = { all: catalogFabrics.length };
  catalogFabrics.forEach(f => {
    counts[f.category] = (counts[f.category] || 0) + 1;
  });
  
  document.querySelectorAll('.filter-chip').forEach(chip => {
    const cat = chip.dataset.category;
    const badge = chip.querySelector('.count-badge');
    if (badge) {
      badge.textContent = `(${counts[cat] || 0})`;
    }
  });
}

// Check if fabric is selected in active target
function isFabricSelected(fab) {
  if (state.activeMode === 'sync') {
    return state.selectedFabrics.shelves?.code === fab.code;
  } else {
    return state.selectedFabrics[state.activeTarget]?.code === fab.code;
  }
}

// Select Fabric Handler
async function selectFabric(fab) {
  if (state.activeMode === 'sync') {
    state.selectedFabrics.shelves = fab;
    state.selectedFabrics.walls = fab;
  } else {
    state.selectedFabrics[state.activeTarget] = fab;
  }
  
  // Refresh active states in swatch list
  document.querySelectorAll('.swatch-card').forEach(card => {
    const code = card.dataset.code;
    const isSel = (state.activeMode === 'sync' && state.selectedFabrics.shelves?.code === code) ||
                  (state.activeMode === 'separate' && state.selectedFabrics[state.activeTarget]?.code === code);
    card.classList.toggle('active', isSel);
  });
  
  updateSummary();
  await renderCanvasDesign();
}

// Update Active UI States
function updateUI() {
  // Sync vs Separate Tabs
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.activeMode);
  });
  
  // Target Selection Container
  const targetContainer = document.getElementById('targets-container');
  if (state.activeMode === 'sync') {
    targetContainer.style.opacity = '0.5';
    targetContainer.style.pointerEvents = 'none';
  } else {
    targetContainer.style.opacity = '1';
    targetContainer.style.pointerEvents = 'all';
  }
  
  // Active Target Row
  document.querySelectorAll('.target-row').forEach(row => {
    row.classList.toggle('active', row.dataset.target === state.activeTarget);
  });
  
  renderSwatches();
  updateSummary();
}

// Update Selected Fabrics Summary Text
function updateSummary() {
  const shelvesSummary = document.getElementById('summary-shelves');
  const wallsSummary = document.getElementById('summary-walls');
  
  const shelvesFabric = state.selectedFabrics.shelves;
  const wallsFabric = state.selectedFabrics.walls;
  
  shelvesSummary.textContent = shelvesFabric ? (shelvesFabric.code === 'GRAY' ? 'Базовий Сірий' : `${shelvesFabric.catalog || 'Camira'} ${shelvesFabric.code}`) : 'Не вибрано';
  wallsSummary.textContent = wallsFabric ? (wallsFabric.code === 'GRAY' ? 'Базовий Сірий' : `${wallsFabric.catalog || 'Camira'} ${wallsFabric.code}`) : 'Не вибрано';
  
  const shelvesTag = document.getElementById('tag-shelves');
  const wallsTag = document.getElementById('tag-walls');
  
  if (shelvesTag) shelvesTag.textContent = shelvesFabric ? (shelvesFabric.code === 'GRAY' ? 'СІРИЙ' : shelvesFabric.code) : '—';
  if (wallsTag) wallsTag.textContent = wallsFabric ? (wallsFabric.code === 'GRAY' ? 'СІРИЙ' : wallsFabric.code) : '—';
}

// Show/Hide Spinner overlay
function showLoading(show, message = 'Завантаження...') {
  const loader = document.getElementById('canvas-loader');
  const loaderText = document.getElementById('loader-text');
  if (loader) {
    loaderText.textContent = message;
    loader.classList.toggle('hidden', !show);
  }
}

// Setup Interactive Listeners
function setupEventListeners() {
  // 1. Sync vs Separate mode switch
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.activeMode = btn.dataset.mode;
      if (state.activeMode === 'sync') {
        state.selectedFabrics.walls = state.selectedFabrics.shelves;
      }
      updateUI();
      await renderCanvasDesign();
    });
  });
  
  // 2. Separate Target Switcher
  document.querySelectorAll('.target-row').forEach(row => {
    row.addEventListener('click', () => {
      if (state.activeMode === 'separate') {
        state.activeTarget = row.dataset.target;
        updateUI();
      }
    });
  });
  
  // 3. Search input
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderSwatches();
  });
  
  // 4. Color Filters Chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filters.category = chip.dataset.category;
      renderSwatches();
    });
  });
  
  // 5. Download Button
  document.getElementById('download-btn').addEventListener('click', () => {
    const canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;
    
    const shelvesCode = state.selectedFabrics.shelves?.code || 'none';
    const wallsCode = state.selectedFabrics.walls?.code || 'none';
    
    const link = document.createElement('a');
    link.download = `compartment_design_${shelvesCode.replace(/\s+/g, '_')}_${wallsCode.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
  
  // 6. Catalog Switcher Buttons
  document.querySelectorAll('.catalog-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('active')) return;
      
      document.querySelectorAll('.catalog-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.catalog = btn.dataset.catalog;
      
      // Update catalog specific texts and descriptors
      updateCatalogUI();
      
      // Reset active category filter to 'all'
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      const allChip = document.querySelector('.filter-chip[data-category="all"]');
      if (allChip) allChip.classList.add('active');
      state.filters.category = 'all';
      
      renderSwatches();
      renderFilters();
    });
  });
}

// Update UI text descriptors based on active catalog
function updateCatalogUI() {
  const headerDesc = document.getElementById('header-desc');
  const headerBadge = document.getElementById('header-badge');
  const catalogTitle = document.getElementById('catalog-title');
  const infoBannerText = document.getElementById('info-banner-text');
  const searchInput = document.getElementById('search-input');
  
  const catalogFabrics = state.fabrics.filter(f => f.code !== 'GRAY' && f.catalog === state.filters.catalog);
  const count = catalogFabrics.length;
  
  if (state.filters.catalog === 'Camira') {
    if (headerDesc) headerDesc.textContent = 'Інтерактивний підбір тканин Aura від Camira Fabrics';
    if (headerBadge) headerBadge.textContent = `Колекція Aura (${count} кольорів)`;
    if (catalogTitle) catalogTitle.textContent = 'Каталог тканин Camira Aura';
    if (infoBannerText) infoBannerText.textContent = 'Всі зразки Camira підвантажуються в реальному часі безпосередньо з оригінального сховища Camira Fabrics.';
    if (searchInput) searchInput.placeholder = 'Пошук тканини за кодом (наприклад, CAA321)...';
  } else if (state.filters.catalog === 'Camira Fusion') {
    if (headerDesc) headerDesc.textContent = 'Інтерактивний підбір тканин Fusion від Camira Fabrics';
    if (headerBadge) headerBadge.textContent = `Колекція Fusion (${count} кольорів)`;
    if (catalogTitle) catalogTitle.textContent = 'Каталог тканин Camira Fusion';
    if (infoBannerText) infoBannerText.textContent = 'Текстури Camira Fusion завантажуються локально з офіційного каталогу Camira Fabrics.';
    if (searchInput) searchInput.placeholder = 'Пошук тканини за кодом (наприклад, NBRB09)...';
  } else {
    if (headerDesc) headerDesc.textContent = 'Інтерактивний підбір тканин Best Buys від Lantal Textiles';
    if (headerBadge) headerBadge.textContent = `Колекція Railway (${count} кольорів)`;
    if (catalogTitle) catalogTitle.textContent = 'Каталог тканин Lantal Railway';
    if (infoBannerText) infoBannerText.textContent = 'Текстури Lantal завантажуються локально з офіційного залізничного каталогу Best Buys.';
    if (searchInput) searchInput.placeholder = 'Пошук тканини за артикулом (наприклад, 3857 LS)...';
  }
}
