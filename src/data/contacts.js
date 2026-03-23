const contacts = [
  { id: 1, name: 'Alice Dupont', email: 'alice@example.com', phone: '06 11 22 33 44', company: 'Acme Corp' },
  { id: 2, name: 'Bob Martin', email: 'bob@example.com', phone: '06 55 66 77 88', company: 'Globex Inc' },
];

let nextId = Math.max(...contacts.map((c) => c.id)) + 1;

function getAll() {
  return contacts;
}

function getById(id) {
  return contacts.find((c) => c.id === id) || null;
}

function create(data) {
  const contact = { id: nextId++, ...data };
  contacts.push(contact);
  return contact;
}

function update(id, data) {
  const index = contacts.findIndex((c) => c.id === id);
  if (index === -1) return null;
  contacts[index] = { ...contacts[index], ...data };
  return contacts[index];
}

function remove(id) {
  const index = contacts.findIndex((c) => c.id === id);
  if (index === -1) return false;
  contacts.splice(index, 1);
  return true;
}

module.exports = { getAll, getById, create, update, remove };
