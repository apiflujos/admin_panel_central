import { fetchApi } from "./app.js";

const nameInput = document.getElementById("assistant-name");
const n8nUrlInput = document.getElementById("assistant-n8n-url");
const avatarInput = document.getElementById("assistant-avatar-url");
const descriptionInput = document.getElementById("assistant-description");
const instructionInput = document.getElementById("assistant-instruccion");
const policiesInput = document.getElementById("assistant-politicas");
const identityInput = document.getElementById("assistant-identidad");
const activeInput = document.getElementById("assistant-active");
const saveButton = document.getElementById("assistant-save");
const clearButton = document.getElementById("assistant-clear");
const tableBody = document.querySelector("#assistants-table tbody");
const messageHint = document.getElementById("assistants-message");

let editingId = null;

async function loadAssistants() {
  try {
    const res = await fetchApi("/api/ai-assistants");
    if (!res.ok) throw new Error("Error cargando asistentes");
    
    const assistants = res.data || [];
    renderTable(assistants);
  } catch (error) {
    console.error(error);
    messageHint.textContent = "Error al cargar asistentes.";
  }
}

function renderTable(assistants) {
  if (!assistants.length) {
    tableBody.innerHTML = '<tr><td colspan="5" class="empty">Sin asistentes configurados.</td></tr>';
    return;
  }

  tableBody.innerHTML = assistants
    .map(
      (a) => `
      <tr>
        <td>
            <div class="user-cell">
                <img src="${a.avatar_url || '/assets/avatar.png'}" class="user-avatar" alt="Avatar" />
                <div class="user-cell-meta">
                    <strong>${a.name}</strong>
                    <span>${a.description || "-"}</span>
                </div>
            </div>
        </td>
        <td class="code-cell">${a.n8n_url || "-"}</td>
        <td>
          <span class="status-badge ${a.is_active ? "is-success" : "is-warning"}">
            ${a.is_active ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td class="date-cell">${new Date(a.created_at).toLocaleDateString()}</td>
        <td>
          <div class="table-actions">
            <button class="ghost action-edit" data-id="${a.id}">Editar</button>
            <button class="ghost action-delete" data-id="${a.id}">Eliminar</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  // Bind actions
  document.querySelectorAll(".action-edit").forEach((btn) => {
    btn.onclick = () => editAssistant(assistants.find((a) => a.id == btn.dataset.id));
  });
  document.querySelectorAll(".action-delete").forEach((btn) => {
    btn.onclick = () => deleteAssistant(btn.dataset.id);
  });
}

function editAssistant(a) {
  editingId = a.id;
  nameInput.value = a.name || "";
  n8nUrlInput.value = a.n8n_url || "";
  avatarInput.value = a.avatar_url || "";
  descriptionInput.value = a.description || "";
  instructionInput.value = a.instruccion || "";
  policiesInput.value = a.politicas || "";
  identityInput.value = a.identidad || "";
  activeInput.checked = Boolean(a.is_active);
  saveButton.textContent = "Actualizar Asistente";
  messageHint.textContent = `Editando asistente ${a.name}`;
}

function clearForm() {
  editingId = null;
  nameInput.value = "";
  n8nUrlInput.value = "";
  avatarInput.value = "";
  descriptionInput.value = "";
  instructionInput.value = "";
  policiesInput.value = "";
  identityInput.value = "";
  activeInput.checked = true;
  saveButton.textContent = "Guardar Asistente";
  messageHint.textContent = "";
}

async function saveAssistant() {
  const data = {
    name: nameInput.value,
    n8n_url: n8nUrlInput.value,
    avatar_url: avatarInput.value,
    description: descriptionInput.value,
    instruccion: instructionInput.value,
    politicas: policiesInput.value,
    identidad: identityInput.value,
    is_active: activeInput.checked,
  };

  if (!data.name || !data.n8n_url) {
    messageHint.textContent = "Nombre y URL de n8n son obligatorios.";
    return;
  }

  try {
    let res;
    if (editingId) {
      res = await fetchApi(`/api/ai-assistants/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } else {
      res = await fetchApi("/api/ai-assistants", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }

    if (res.ok) {
      messageHint.textContent = editingId ? "Asistente actualizado." : "Asistente creado.";
      clearForm();
      loadAssistants();
    } else {
      messageHint.textContent = "Error al guardar el asistente.";
    }
  } catch (error) {
    console.error(error);
    messageHint.textContent = "Error de red al guardar.";
  }
}

async function deleteAssistant(id) {
  if (!confirm("¿Seguro que quieres eliminar este asistente?")) return;
  try {
    const res = await fetchApi(`/api/ai-assistants/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadAssistants();
    }
  } catch (error) {
    console.error(error);
  }
}

saveButton.onclick = saveAssistant;
clearButton.onclick = clearForm;

document.getElementById("back-home").onclick = () => {
  window.location.href = "/";
};

loadAssistants();
