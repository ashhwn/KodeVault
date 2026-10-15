require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const repoRoutes = require('./routes/repoRoutes');
const branchRoutes = require('./routes/branchRoutes');
const commitRoutes = require('./routes/commitRoutes');
const prRoutes = require('./routes/prRoutes');
const issueRoutes = require('./routes/issueRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/commits', commitRoutes);
app.use('/api/prs', prRoutes);
app.use('/api/issues', issueRoutes);

app.get('/', (req, res) => res.send('KodeVault API is running'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));