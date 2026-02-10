// 1) Configura aquí tu WhatsApp (México: 52, y normalmente 521 + tu número)
const WHATSAPP_NUMBER = "5574642090"; 

const grid = document.getElementById("grid");
const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("category");

let productos = [];

function moneyMXN(n) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

function buildProductUrl(p) {
  // Por ahora, usamos el home. Después si quieres, hacemos página por producto.
  return window.location.href.split("#")[0];
}

function formatPriceLine(p) {
  // Si hay precio original, mostramos "Antes" y "Ahora"
  if (typeof p.precio_original === "number" && p.precio_original > p.precio) {
    return `Antes: ${moneyMXN(p.precio_original)} | Ahora: ${moneyMXN(p.precio)}`;
  }
  // Si no, solo precio normal
  return `${moneyMXN(p.precio)}`;
}

function waLinkToMyNumber(p, urlProducto) {
  const msg = `Hola, me interesa: ${p.nombre}. ${formatPriceLine(p)}. ${urlProducto}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function waShareLink(p, urlProducto) {
  const msg = `Mira este producto: ${p.nombre}. ${formatPriceLine(p)}. ${urlProducto}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

function render(list) {
  grid.innerHTML = "";

  if (list.length === 0) {
    grid.innerHTML = `<p>No hay productos con esos filtros.</p>`;
    return;
  }

  for (const p of list) {
    const urlProducto = buildProductUrl(p);

    const hasDiscount =
      typeof p.precio_original === "number" &&
      typeof p.precio === "number" &&
      p.precio_original > p.precio;

    const priceHtml = hasDiscount
      ? `
        <div class="price-row">
          <span class="price-original">${moneyMXN(p.precio_original)}</span>
          <span class="price-offer">${moneyMXN(p.precio)}</span>
        </div>
      `
      : `<div class="price">${moneyMXN(p.precio)}</div>`;

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}">
      <div class="content">
        <span class="badge">${p.categoria}</span>
        <h3 style="margin:0;">${p.nombre}</h3>
        <p style="margin:0; color:#444;">${p.descripcion}</p>
        ${priceHtml}
      </div>
      <div class="actions">
        <a class="btn btn-wa" target="_blank" rel="noopener"
           href="${waLinkToMyNumber(p, urlProducto)}">Pedir por WhatsApp</a>
        <a class="btn btn-share" target="_blank" rel="noopener"
           href="${waShareLink(p, urlProducto)}">Compartir</a>
      </div>
    `;
    grid.appendChild(card);
  }
}

function fillCategories(items) {
  const cats = Array.from(new Set(items.map(p => p.categoria))).sort();
  categorySelect.innerHTML = `<option value="all">Todas las categorías</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
}

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const cat = categorySelect.value;

  const filtered = productos.filter(p => {
    const matchesText =
      p.nombre.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q);

    const matchesCat = (cat === "all") ? true : p.categoria === cat;
    return matchesText && matchesCat;
  });

  render(filtered);
}

async function init() {
  const res = await fetch("data/productos.json");
  productos = await res.json();

  fillCategories(productos);
  render(productos);

  searchInput.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);
}

init().catch(err => {
  console.error(err);
  grid.innerHTML = `<p>Error cargando productos. Revisa consola.</p>`;
});
