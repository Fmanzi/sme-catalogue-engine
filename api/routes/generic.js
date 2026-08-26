const { Router } = require('express');
const { readJson, writeJson, uid, clientDir } = require('../data');
const path = require('path');
const fs = require('fs');

/* Generic CRUD for admin-only collections (orders, customers, reviews, coupons, inventory).
   These don't live in catalogue.json — they're stored in a separate data file per client. */

function dataFile(clientId) {
  const file = path.join(clientDir(clientId), 'data.json');
  if (!fs.existsSync(file)) writeJson(file, { orders: [], customers: [], reviews: [], coupons: [], inventory: [] });
  return file;
}

function getData(clientId, collection) {
  const data = readJson(dataFile(clientId));
  return data[collection] || [];
}

function setData(clientId, collection, items) {
  const file = dataFile(clientId);
  const data = readJson(file);
  data[collection] = items;
  writeJson(file, data);
}

module.exports = function(collectionName) {
  const router = Router();

  router.get('/', (req, res) => {
    const { clientId = 'meridian' } = req.query;
    res.json(getData(clientId, collectionName));
  });

  router.get('/:id', (req, res) => {
    const { clientId = 'meridian' } = req.query;
    const items = getData(clientId, collectionName);
    const item = items.find(x => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  router.post('/', (req, res) => {
    const { clientId = 'meridian' } = req.query;
    const items = getData(clientId, collectionName);
    const item = { id: uid(), createdAt: new Date().toISOString(), ...req.body };
    items.push(item);
    setData(clientId, collectionName, items);
    res.status(201).json(item);
  });

  router.put('/:id', (req, res) => {
    const { clientId = 'meridian' } = req.query;
    const items = getData(clientId, collectionName);
    const idx = items.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    items[idx] = { ...items[idx], ...req.body, id: items[idx].id, updatedAt: new Date().toISOString() };
    setData(clientId, collectionName, items);
    res.json(items[idx]);
  });

  router.delete('/:id', (req, res) => {
    const { clientId = 'meridian' } = req.query;
    const items = getData(clientId, collectionName);
    const filtered = items.filter(x => x.id !== req.params.id);
    if (filtered.length === items.length) return res.status(404).json({ error: 'Not found' });
    setData(clientId, collectionName, filtered);
    res.json({ ok: true });
  });

  return router;
};
