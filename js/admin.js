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
const editNotice = document.getElementById("editNotice");
const cancelEditBtn = document.getElementById("cancelEditBtn");

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

function setEditMode(active, id = "") {
  if (active) {
    formTitle.textContent = `Editando producto: ${id}`;
    editNotice.classList.remove("hidden");
    cancelEditBtn.classList.remove("hidden");
    resetBtn.textContent = "Restablecer";
  } else {
    formTitle.textContent = "Agregar producto";
    editNotice.classList.add("hidden");
    cancelEditBtn.classList.add("hidden");
    resetBtn.textContent = "Limpiar formulario";
  }
}

function clearForm() {
  productForm.reset();
  editingId = null;
  fields.id.disabled = false;
  setEditMode(false);
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

  renderTable(data || []);
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
  setEditMode(true, data.id);

  fields.id.value = data.id;
  fields.id.disabled = true;
  fields.nombre.value = data.nombre ?? "";
  fields.precio_original.value = data.precio_original ?? "";
  fields.precio.value = data.precio ?? "";
  fields.categoria.value = data.categoria ?? "";
  fields.imagen.value = data.imagen ?? "";
  fields.descripcion.value = data.descripcion ?? "";
  fields.agotado.checked = data.agotado === true;

  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
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
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const product = getFormData();

  if (!product.id || !product.nombre || !product.categoria || Number.isNaN(product.precio)) {
    alert("Completa los campos obligatorios");
    return;
  }

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

cancelEditBtn.addEventListener("click", clearForm);
