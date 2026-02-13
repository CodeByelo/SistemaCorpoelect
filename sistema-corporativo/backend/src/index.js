const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes (to be implemented)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/documentos', require('./routes/documentos.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/config', require('./routes/config.routes'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Sistema Alfa 2026 API' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
