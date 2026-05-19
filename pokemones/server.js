const express = require('express');

const cors = require('cors');

const mysql = require('mysql2/promise');

const swaggerUi = require('swagger-ui-express');

const swaggerDocument = require('./swagger.json');

require('dotenv').config();

// ======================================================
// APP
// ======================================================

const app = express();

// ======================================================
// MIDDLEWARES
// ======================================================

app.use(cors());

app.use(express.json());

// ======================================================
// PORT
// ======================================================

const PORT = process.env.PORT || 10000;

// ======================================================
// ENV VALIDATION
// ======================================================

const REQUIRED_ENV = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_PORT'
];

for (const key of REQUIRED_ENV) {

    if (!process.env[key]) {

        console.error(`Missing environment variable: ${key}`);
    }
}

// ======================================================
// MYSQL POOL
// ======================================================

const pool = mysql.createPool({

    host:
        process.env.DB_HOST,

    user:
        process.env.DB_USER,

    password:
        process.env.DB_PASSWORD,

    database:
        process.env.DB_NAME,

    port:
        Number(process.env.DB_PORT),

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0,

    enableKeepAlive: true,

    keepAliveInitialDelay: 0
});

// ======================================================
// INIT DATABASE
// ======================================================

async function initDB() {

    try {

        const connection =
            await pool.getConnection();

        console.log('MySQL Connected');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS pokemon (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                altura DECIMAL(5,2),
                peso DECIMAL(5,2),
                habilidades JSON,
                imagen_frontal TEXT,
                imagen_trasera TEXT
            )
        `);

        const [rows] =
            await connection.query(`
                SELECT COUNT(*) AS total
                FROM pokemon
            `);

        if (rows[0].total === 0) {

            await connection.query(`
                INSERT INTO pokemon
                (
                    nombre,
                    altura,
                    peso,
                    habilidades,
                    imagen_frontal,
                    imagen_trasera
                )
                VALUES
                (
                    'Pikachu',
                    0.40,
                    6.00,
                    '["Static","Lightning Rod"]',
                    'https://automlucas.com/img/front/Pikachu.png',
                    'https://automlucas.com/img/back/Pikachu.png'
                )
            `);

            console.log('Initial Pokemon inserted');
        }

        connection.release();

    } catch (error) {

        console.error(
            'Database Initialization Error:',
            error.message
        );
    }
}

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/', async (req, res) => {

    try {

        await pool.query('SELECT 1');

        res.json({
            service: 'Pokemon API',
            status: 'running',
            database: 'connected'
        });

    } catch (error) {

        res.status(500).json({
            service: 'Pokemon API',
            status: 'database error',
            error: error.message
        });
    }
});

// ======================================================
// GET ALL POKEMON
// ======================================================

app.get('/api/pokemon', async (req, res) => {

    try {

        const [pokemon] =
            await pool.query(`
                SELECT *
                FROM pokemon
                ORDER BY id ASC
            `);

        res.status(200).json(pokemon);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

// ======================================================
// GET POKEMON BY ID
// ======================================================

app.get('/api/pokemon/:id', async (req, res) => {

    try {

        const { id } = req.params;

        if (isNaN(id)) {

            return res.status(400).json({
                error: 'Invalid Pokemon ID'
            });
        }

        const [pokemon] =
            await pool.query(`
                SELECT *
                FROM pokemon
                WHERE id = ?
            `, [id]);

        if (pokemon.length === 0) {

            return res.status(404).json({
                error: 'Pokemon not found'
            });
        }

        res.status(200).json(pokemon[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

// ======================================================
// SWAGGER
// ======================================================

app.use(
    '/apidocs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// ======================================================
// 404
// ======================================================

app.use((req, res) => {

    res.status(404).json({
        error: 'Route not found'
    });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, async () => {

    console.log(`
========================================
🚀 Pokemon API Running
🌐 Port: ${PORT}
========================================
    `);

    await initDB();
});
