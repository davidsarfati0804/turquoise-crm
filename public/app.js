const API = '/api/contacts';
let editingId = null;

async function fetchContacts() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`Failed to fetch contacts: ${res.status}`);
  return res.json();
}

async function renderContacts() {
  let contacts;
  try {
    contacts = await fetchContacts();
  } catch (err) {
    document.getElementById('contact-list').innerHTML =
      '<p class="empty-state">Erreur lors du chargement des contacts.</p>';
    return;
  }
  const list = document.getElementById('contact-list');
  const count = document.getElementById('contact-count');
  count.textContent = contacts.length;

  if (contacts.length === 0) {
    list.innerHTML = '<p class="empty-state">Aucun contact pour l\'instant.</p>';
    return;
  }

  list.innerHTML = contacts
    .map(
      (c) => `
    <div class="contact-card" data-id="${c.id}">
      <div class="contact-info">
        <strong>${escapeHtml(c.name)}</strong>
        <span>${escapeHtml(c.email)}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}${c.company ? ' · ' + escapeHtml(c.company) : ''}</span>
      </div>
      <div class="contact-actions">
        <button class="btn-edit" onclick="startEdit(${c.id})">Modifier</button>
        <button class="btn-delete" onclick="deleteContact(${c.id})">Supprimer</button>
      </div>
    </div>`
    )
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}

async function startEdit(id) {
  const contacts = await fetchContacts();
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return;

  editingId = id;
  document.getElementById('form-title').textContent = 'Modifier le contact';
  document.getElementById('submit-btn').textContent = 'Enregistrer';
  document.getElementById('cancel-btn').style.display = '';
  document.getElementById('contact-id').value = id;
  document.getElementById('name').value = contact.name;
  document.getElementById('email').value = contact.email;
  document.getElementById('phone').value = contact.phone || '';
  document.getElementById('company').value = contact.company || '';
}

function cancelEdit() {
  editingId = null;
  document.getElementById('form-title').textContent = 'Ajouter un contact';
  document.getElementById('submit-btn').textContent = 'Ajouter';
  document.getElementById('cancel-btn').style.display = 'none';
  document.getElementById('contact-form').reset();
}

async function deleteContact(id) {
  if (!confirm('Supprimer ce contact ?')) return;
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    alert('Erreur lors de la suppression du contact.');
    return;
  }
  renderContacts();
}

document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    company: document.getElementById('company').value.trim(),
  };

  if (editingId) {
    await fetch(`${API}/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    cancelEdit();
  } else {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    e.target.reset();
  }

  renderContacts();
});

document.getElementById('cancel-btn').addEventListener('click', cancelEdit);

renderContacts();
