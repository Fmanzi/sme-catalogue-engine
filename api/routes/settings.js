const { Router } = require('express');
const { getBusiness, saveBusiness, scheduleRebuild } = require('../data');

const router = Router();

router.get('/', (req, res) => {
  const { clientId = 'meridian', section } = req.query;
  const biz = getBusiness(clientId);
  if (section && biz[section]) return res.json(biz[section]);
  res.json(biz);
});

router.put('/', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const biz = getBusiness(clientId);
  const updated = { ...biz, ...req.body, id: biz.id };
  saveBusiness(clientId, updated);
  scheduleRebuild(clientId);
  res.json(updated);
});

router.put('/:section', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const { section } = req.params;
  const biz = getBusiness(clientId);
  biz[section] = { ...(biz[section] || {}), ...req.body };
  saveBusiness(clientId, biz);
  scheduleRebuild(clientId);
  res.json(biz[section]);
});

module.exports = router;
