// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectToDB } = require('./db');


const sampleRoutes = require('./routes/sampleRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectToDB()
    .then(() => {
        app.listen(port, () => { console.log(`Base Finder server is running on port ${port}`); })
    })
    .catch((err) => {
        console.error('Error starting server:', err);
    });



// Routes
app.get('/', (req, res) => {
  res.send('Base Finder by Mahadi, Server is running')
})

app.use('/api/samples', sampleRoutes);
app.use('/api/auth', authRoutes);

// 404 handler (keep at the end)
// app.use((req, res) => {
//   res.status(404).json({ message: "Route not found" });
// });
