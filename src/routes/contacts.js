const express = require('express');
const router = express.Router();
const store = require('../data/contacts');

router.get('/', (req, res) => {
  res.json(store.getAll());
});

router.get('/:id', (req, res) => {
  const contact = store.getById(Number(req.params.id));
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

router.post('/', (req, res) => {
  const { name, email, phone, company } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  const contact = store.create({ name, email, phone: phone || '', company: company || '' });
  res.status(201).json(contact);
});

router.put('/:id', (req, res) => {
  const { name, email, phone, company } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  const contact = store.update(Number(req.params.id), { name, email, phone, company });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

router.delete('/:id', (req, res) => {
  const deleted = store.remove(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Contact not found' });
  res.status(204).send();
});

module.exports = router;
