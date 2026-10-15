const express = require('express');
const router = express.Router();
const {
  createRepo,
  getRepo,
  updateRepo,
  deleteRepo,
  listUserRepos,
  toggleStar,
  searchUsers,
  listCollaborators,
  addCollaborator,
  removeCollaborator,
  forkRepo,
} = require('../controllers/repoController');
const { protect } = require('../middleware/auth');
const { loadRepoAndAccess, requireRead, requireWrite } = require('../middleware/repoAccess');

router.post('/', protect, createRepo);
router.get('/user/:username', protect, listUserRepos);
router.get('/users/search', protect, searchUsers);
router.get('/:id', protect, loadRepoAndAccess, requireRead, getRepo);
router.patch('/:id', protect, loadRepoAndAccess, requireRead, updateRepo);
router.delete('/:id', protect, loadRepoAndAccess, requireRead, deleteRepo);
router.post('/:id/star', protect, loadRepoAndAccess, requireRead, toggleStar);
router.get('/:id/collaborators', protect, loadRepoAndAccess, requireRead, listCollaborators);
router.post('/:id/collaborators', protect, loadRepoAndAccess, requireRead, addCollaborator);
router.delete('/:id/collaborators/:userId', protect, loadRepoAndAccess, requireRead, removeCollaborator);
router.post('/:id/fork', protect, loadRepoAndAccess, requireRead, forkRepo);

module.exports = router;