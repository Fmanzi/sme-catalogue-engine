const { Router } = require('express');
const { getPublishStatus, runRebuild } = require('../data');

const router = Router();

/* Current publish/deploy status for the admin "Live site" panel. */
router.get('/status', (req, res) => {
  res.json({ ok: true, ...getPublishStatus() });
});

/* Manual "Publish now" — rebuild the bundle, push to git and hit the
   Cloudflare deploy hook. Fire-and-forget; poll /status for progress. */
router.post('/', async (req, res, next) => {
  try {
    const { clientId = 'meridian' } = req.query;
    const status = getPublishStatus();
    if (status.state === 'building' || status.state === 'pushing' || status.state === 'deploying') {
      return res.status(409).json({ ok: false, error: 'A publish is already in progress.', state: status.state });
    }
    runRebuild(clientId);
    res.json({ ok: true, message: 'Publish started.', state: 'queued' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;