const express = require('express');
const router = express.Router();
const { listBranches, createBranch, deleteBranch } = require('../controllers/branchController');
const { protect } = require('../middleware/auth');
const { loadRepoAndAccess, requireRead, requireWrite } = require('../middleware/repoAccess');

router.get('/:repoId', protect, loadRepoAndAccess, requireRead, listBranches);
router.post('/:repoId', protect, loadRepoAndAccess, requireWrite, createBranch);
router.delete('/:repoId/:branchName', protect, loadRepoAndAccess, requireWrite, deleteBranch);

module.exports = router;