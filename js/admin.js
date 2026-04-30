import { supabase } from "./supabase.js";

const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMsg = document.getElementById("loginMsg");
const sessionInfo = document.getElementById("sessionInfo");

const productForm = document.getElementById("productForm");
const formTitle = document.getElementById("formTitle");
const resetBtn = document.getElementById("resetBtn");
const tableBody = document.getElementById("productsTableBody");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const stockFilter = document.getElementById("stockFilter");
const tableStatus = document.getElementById("tableStatus");
const toast = document.getElementById("toast");

const metricTotal = document.getElementById("metricTotal");
const metricAvailable = document.getElementById("metricAvailable");
const metricOut = document.getElementById("metricOut");
const metricCategories = document.getElementById("metricCategories");

const fields = {
  id: document.getElementById("id"),
  nombre: document.getElementById("nombre"),
  precio_original: document.getElementById("precio_original"),
  precio: document.getElementById("precio"),
  categoria: document.getElementById("categoria"),
  imagen: document.getElementById("imagen"),
  descripcion: document.getElementById("descripcion"),
  agotado: document.getElementById("agotado")
};

let editingId = null;
let allProducts = [];
let toastTimer = null;

document.querySelectorAll(".price-step").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const step = Number(btn.dataset.step);
    const input = document.getElementById(targetId);

    const currentValue = Number(input.value || 0);
    const newValue = Math.max(0, currentValue + step);

    input.value = newValue;
  });
});

function showLogin() {
  loginSection.classList.remove("hidden");
  adminSection.classList.add("hidden");
}

function showAdmin(email) {
  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");
  sessionInfo.textContent = `Sesión activa: ${email}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2400);
}

function clearForm() {
  productForm.reset();
  editingId = null;
  fields.id.disabled = false;
  formTitle.textContent = "Agregar producto";
}

function updateMetrics(items) {
  const total = items.length;
  const out = items.filter(p => p.agotado).length;
  const available = total - out;
  const categories = new Set(items.map(p => p.categoria).filter(Boolean)).size;

  metricTotal.textContent = String(total);
  metricAvailable.textContent = String(available);
  metricOut.textContent = String(out);
  metricCategories.textContent = String(categories);
}

function updateCategoryFilter(items) {
  const categories = [...new Set(items.map(p => p.categoria).filter(Boolean))].sort();
  const current = categoryFilter.value;
  categoryFilter.innerHTML = `<option value="">Todas las categorías</option>`;
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  }
  categoryFilter.value = categories.includes(current) ? current : "";
}

function getFilteredProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const stock = stockFilter.value;

  return allProducts.filter(product => {
    const inSearch = !query
      || (product.id ?? "").toLowerCase().includes(query)
      || (product.nombre ?? "").toLowerCase().includes(query);
    const inCategory = !category || product.categoria === category;
    const inStock = stock === "all"
      || (stock === "available" && !product.agotado)
      || (stock === "out" && product.agotado);

    return inSearch && inCategory && inStock;
  });
}

function getFormData() {
  return {
    id: fields.id.value.trim(),
    nombre: fields.nombre.value.trim(),
    precio_original: fields.precio_original.value === "" ? null : parseInt(fields.precio_original.value, 10),
    precio: parseInt(fields.precio.value, 10),
    categoria: fields.categoria.value,
    imagen: fields.imagen.value.trim(),
    descripcion: fields.descripcion.value.trim(),
    agotado: fields.agotado.checked
  };
}

async function loadProducts() {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("agotado", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    alert("Error cargando productos");
    return;
  }

  allProducts = data || [];
  updateMetrics(allProducts);
  updateCategoryFilter(allProducts);
  applyFilters();
}

function renderTable(items) {
  tableBody.innerHTML = "";

  for (const p of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nombre}</td>
      <td>${p.precio}</td>
      <td>${p.categoria}</td>
      <td>${p.agotado ? "Sí" : "No"}</td>
      <td>
        <div class="mini-actions">
          <button class="admin-btn admin-btn-secondary" data-edit="${p.id}">Editar</button>
          <button class="admin-btn admin-btn-danger" data-delete="${p.id}">Eliminar</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  }

  tableBody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.edit;
      await editProduct(id);
    });
  });

  tableBody.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.delete;
      await deleteProduct(id);
    });
  });
  tableStatus.textContent = items.length === 0
    ? "No hay productos para mostrar con estos filtros."
    : `Mostrando ${items.length} producto(s).`;
}

function applyFilters() {
  renderTable(getFilteredProducts());
}

async function editProduct(id) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    alert("No se pudo cargar el producto");
    return;
  }

  editingId = data.id;
  formTitle.textContent = `Editando producto: ${data.id}`;

  fields.id.value = data.id;
  fields.id.disabled = true;
  fields.nombre.value = data.nombre ?? "";
  fields.precio_original.value = data.precio_original ?? "";
  fields.precio.value = data.precio ?? "";
  fields.categoria.value = data.categoria ?? "";
  fields.imagen.value = data.imagen ?? "";
  fields.descripcion.value = data.descripcion ?? "";
  fields.agotado.checked = data.agotado === true;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProduct(id) {
  const ok = confirm(`¿Eliminar el producto ${id}?`);
  if (!ok) return;

  const { error } = await supabase
    .from("productos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("No se pudo eliminar");
    return;
  }

  if (editingId === id) {
    clearForm();
  }

  await loadProducts();
  showToast("Producto eliminado correctamente");
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const product = getFormData();

  if (!product.id || !product.nombre || !product.categoria || Number.isNaN(product.precio)) {
    alert("Completa los campos obligatorios");
    return;
  }

  const wasEditing = Boolean(editingId);

  if (editingId) {
    const { error } = await supabase
      .from("productos")
      .update({
        nombre: product.nombre,
        precio_original: product.precio_original,
        precio: product.precio,
        categoria: product.categoria,
        imagen: product.imagen,
        descripcion: product.descripcion,
        agotado: product.agotado
      })
      .eq("id", editingId);

    if (error) {
      console.error(error);
      alert("No se pudo actualizar");
      return;
    }
  } else {
    const { error } = await supabase
      .from("productos")
      .insert(product);

    if (error) {
      console.error(error);
      alert("No se pudo guardar");
      return;
    }
  }

  clearForm();
  await loadProducts();
  showToast(wasEditing ? "Producto actualizado" : "Producto agregado");
});

resetBtn.addEventListener("click", clearForm);

loginBtn.addEventListener("click", async () => {
  loginMsg.textContent = "";

  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error(error);
    loginMsg.textContent = "No se pudo iniciar sesión";
    return;
  }

  await checkSession();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin();
});

async function checkSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error(error);
    showLogin();
    return;
  }

  const session = data.session;

  if (!session) {
    showLogin();
    return;
  }

  showAdmin(session.user.email);
  await loadProducts();
}

checkSession();
searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
stockFilter.addEventListener("change", applyFilters);
