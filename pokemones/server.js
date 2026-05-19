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
// MYSQL POOL
// ======================================================

const pool = mysql.createPool({

    host:
        process.env.DB_HOST,

    user:
        process.env.DB_USER,

    password:
        process.env.DB_PASS,

    database:
        process.env.DB_NAME,

    port:
        process.env.DB_PORT || 3306,

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0
});

// ======================================================
// INIT DATABASE
// ======================================================

async function initDB() {

    try {

        const connection =
            await pool.getConnection();

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
            await connection.query(
                'SELECT COUNT(*) AS total FROM pokemon'
            );

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

            console.log('Pokemon inicial insertado');
        }

        connection.release();

        console.log('MySQL Connected');

    } catch (error) {

        console.error(
            'Database Error:',
            error
        );
    }
}

// ======================================================
// HOME
// ======================================================

app.get('/', (req, res) => {

    res.json({
        service: 'Pokemon API',
        status: 'running',
        database: 'MySQL Aiven'
    });
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

        res.json(pokemon);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});

// ======================================================
// GET POKEMON BY ID
// ======================================================

app.get('/api/pokemon/:id', async (req, res) => {

    try {

        const { id } = req.params;

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

        res.json(pokemon[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Internal Server Error'
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
 Pokemon API Running
Port: ${PORT}
========================================
    `);

    await initDB();
});
