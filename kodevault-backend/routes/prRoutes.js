const express = require('express');
const router = express.Router();
const {
  createPR,
  listPRs,
  getPR,
  addComment,
  getPRDiff,
  syncPR,
  mergePR,
  resolveMergeConflict,
} = require('../controllers/prController');
const { protect } = require('../middleware/auth');
const { loadRepoAndAccess, requireRead, requireWrite } = require('../middleware/repoAccess');
const { loadPRRepoAndAccess } = require('../middleware/itemAccess');

router.post('/:repoId', protect, loadRepoAndAccess, requireWrite, createPR);
router.get('/:repoId', protect, loadRepoAndAccess, requireRead, listPRs);
router.get('/item/:prId', protect, loadPRRepoAndAccess, requireRead, getPR);
router.post('/item/:prId/comments', protect, loadPRRepoAndAccess, requireRead, addComment);
router.get('/item/:prId/diff', protect, loadPRRepoAndAccess, requireRead, getPRDiff);
router.patch('/item/:prId/sync', protect, loadPRRepoAndAccess, requireWrite, syncPR);
router.post('/item/:prId/merge', protect, loadPRRepoAndAccess, requireWrite, mergePR);
router.post('/item/:prId/resolve', protect, loadPRRepoAndAccess, requireWrite, resolveMergeConflict);

module.exports = router;