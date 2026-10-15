const express = require('express');
const router = express.Router();
const {
  createCommit,
  getCommitHistory,
  getTreeAtCommit,
  downloadBranchAsZip,
  getCommitGraph,
} = require('../controllers/commitController');
const { protect } = require('../middleware/auth');
const { loadRepoAndAccess, requireRead, requireWrite } = require('../middleware/repoAccess');

router.post('/:repoId', protect, loadRepoAndAccess, requireWrite, createCommit);
router.get('/:repoId/history/:branchName', protect, loadRepoAndAccess, requireRead, getCommitHistory);
router.get('/:repoId/tree/:commitHash', protect, loadRepoAndAccess, requireRead, getTreeAtCommit);
router.get('/:repoId/download/:branchName', protect, loadRepoAndAccess, requireRead, downloadBranchAsZip);
router.get('/:repoId/graph', protect, loadRepoAndAccess, requireRead, getCommitGraph);

module.exports = router;