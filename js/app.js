import { supabase } from "./supabase.js";

const WHATSAPP_NUMBER = "5215574642090";

// Referencias a elementos del DOM
const grid = document.getElementById("grid");
const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("category");

const modal = document.getElementById("quickViewModal");
const modalName = document.getElementById("modalProductName");
const modalImg = document.getElementById("modalProductImage");
const modalDesc = document.getElementById("modalProductDescription");
const modalPrice = document.getElementById("modalProductPrice");
const modalWaBuy = document.getElementById("modalWaBuy");
const modalWaShare = document.getElementById("modalWaShare");
const closeModalBtn = document.getElementById("closeModalBtn");

const scrollTopBtn = document.getElementById("scrollTopBtn");

let productos = [];

// Formatear precio en pesos MXN
function moneyMXN(n) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(n);
}

// Construye la URL para compartir un producto
function buildProductUrl(p) {
  const base = window.location.href.split("#")[0];
  return `${base}#${encodeURIComponent(p.id)}`;
}

// Formatea el precio con y sin descuento
function formatPriceLine(p) {
  if (typeof p.precio_original === "number" && p.precio_original > p.precio) {
    return `Antes: ${moneyMXN(p.precio_original)} | Ahora: ${moneyMXN(p.precio)}`;
  }
  return `${moneyMXN(p.precio)}`;
}

// Enlace de WhatsApp para comprar un producto
function waLinkToMyNumber(p, urlProducto) {
  const msg = `Hola, me interesa: ${p.nombre}. ${formatPriceLine(p)}. ${urlProducto}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// Enlace de WhatsApp para compartir un producto
function waShareLink(p, urlProducto) {
  const msg = `Mira este producto: ${p.nombre}. ${formatPriceLine(p)}. ${urlProducto}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

// Renderiza las tarjetas
function render(list) {
  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = `<p class="col-span-full text-center text-gray-500">No hay productos con esos filtros.</p>`;
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove("opacity-0", "translate-y-4");
        entry.target.classList.add("opacity-100", "translate-y-0");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  for (const p of list) {
    const urlProducto = buildProductUrl(p);
    const hasDiscount =
      typeof p.precio_original === "number" &&
      typeof p.precio === "number" &&
      p.precio_original > p.precio;

    const isAgotado = p.agotado === true;

    const card = document.createElement("article");
    card.className =
      "relative bg-white rounded-lg shadow-md overflow-hidden transform transition-opacity duration-500 ease-out opacity-0 translate-y-4 hover:shadow-xl";

    if (isAgotado) {
      card.classList.add("grayscale", "opacity-50", "cursor-not-allowed");
    }

    card.innerHTML = `
      <div class="relative">
        <img src="${p.imagen}" alt="${p.nombre}" class="w-full h-48 object-cover" loading="lazy">
        ${isAgotado ? '<span class="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">Agotado</span>' : ""}
      </div>

     <div class="p-4 flex flex-col justify-between min-h-[170px]">
        <div>
          <div class="flex justify-between items-center mb-2">
            <span class="bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">${p.categoria}</span>
            ${hasDiscount ? '<span class="text-xs font-medium text-red-600">Oferta</span>' : ""}
          </div>

          <h3 class="text-lg font-semibold truncate" title="${p.nombre}">${p.nombre}</h3>
          <p class="text-sm text-gray-600 mt-1 truncate">${p.descripcion}</p>
        </div>

        <div class="mt-4">
          ${
            hasDiscount
              ? `<div class="flex items-baseline space-x-2">
                   <span class="text-gray-400 line-through text-sm">${moneyMXN(p.precio_original)}</span>
                   <span class="text-lg font-bold text-red-600">${moneyMXN(p.precio)}</span>
                 </div>`
              : `<div class="text-lg font-bold text-gray-800">${moneyMXN(p.precio)}</div>`
          }
        </div>
      </div>

      <div class="p-4 flex space-x-2 border-t">
        ${
          isAgotado
            ? '<span class="flex-1 bg-gray-300 text-gray-700 text-center py-2 rounded-md cursor-not-allowed" title="Producto agotado">Agotado</span>'
            : `<a class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 rounded-md" target="_blank" rel="noopener" href="${waLinkToMyNumber(p, urlProducto)}">Pedir</a>`
        }
        <a class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md" target="_blank" rel="noopener" href="${waShareLink(p, urlProducto)}">Compartir</a>
        <button class="bg-white border border-gray-300 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-md" data-id="${p.id}">Ver</button>
      </div>
    `;

    const viewBtn = card.querySelector("button[data-id]");
    viewBtn.addEventListener("click", () => openModal(p));

    const img = card.querySelector("img");
    img.addEventListener("error", () => {
      img.onerror = null;
      img.src = "placeholder_light_gray_block.png";
    });

    observer.observe(card);
    grid.appendChild(card);
  }
}

// Llena las opciones del select de categorías
function fillCategories(items) {
  const cats = Array.from(new Set(items.map(p => p.categoria))).sort();

  categorySelect.innerHTML =
    `<option value="all">Todas las categorías</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
}

// Filtrado por búsqueda y categoría
function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const cat = categorySelect.value;

  const filtered = productos.filter(p => {
    const nombre = (p.nombre || "").toLowerCase();
    const descripcion = (p.descripcion || "").toLowerCase();
    const categoria = (p.categoria || "").toLowerCase();

    const matchesText =
      nombre.includes(q) ||
      descripcion.includes(q) ||
      categoria.includes(q);

    const matchesCat = cat === "all" ? true : p.categoria === cat;

    return matchesText && matchesCat;
  });

  filtered.sort((a, b) => {
    if (a.agotado === b.agotado) {
      return String(a.id).localeCompare(String(b.id));
    }
    return a.agotado ? 1 : -1;
  });

  render(filtered);
}

// Abre el modal de vista rápida
function openModal(p) {
  modalName.textContent = p.nombre;
  modalImg.src = p.imagen;
  modalImg.alt = p.nombre;

  modalImg.onerror = function () {
    modalImg.onerror = null;
    modalImg.src = "placeholder_light_gray_block.png";
  };

  modalDesc.textContent = p.descripcion;

  if (typeof p.precio_original === "number" && p.precio_original > p.precio) {
    modalPrice.innerHTML = `
      <span class="text-gray-400 line-through mr-2">${moneyMXN(p.precio_original)}</span>
      <span class="text-lg font-bold text-red-600">${moneyMXN(p.precio)}</span>
    `;
  } else {
    modalPrice.innerHTML = `<span class="text-lg font-bold text-gray-800">${moneyMXN(p.precio)}</span>`;
  }

  const urlProducto = buildProductUrl(p);
  modalWaBuy.href = waLinkToMyNumber(p, urlProducto);
  modalWaShare.href = waShareLink(p, urlProducto);

  modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

// Cierra el modal
function closeModal() {
  modal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

// Inicializa la app
async function init() {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("*");

    if (error) throw error;

    productos = (data || []).sort((a, b) => {
      if (a.agotado === b.agotado) {
        return String(a.id).localeCompare(String(b.id));
      }
      return a.agotado ? 1 : -1;
    });

    fillCategories(productos);
    render(productos);

    searchInput.addEventListener("input", applyFilters);
    categorySelect.addEventListener("change", applyFilters);

    closeModalBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", e => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        closeModal();
      }
    });

    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        scrollTopBtn.classList.remove("hidden");
      } else {
        scrollTopBtn.classList.add("hidden");
      }
    });

    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="col-span-full text-center text-red-600">Error cargando productos desde Supabase. Revisa consola.</p>`;
  }
}

init();