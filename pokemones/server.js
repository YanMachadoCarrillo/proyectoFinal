// ======================================================
// IMPORTS
// ======================================================

const express = require('express');

const cors = require('cors');

const mysql = require('mysql2/promise');

const helmet = require('helmet');

const compression = require('compression');

const rateLimit = require('express-rate-limit');

const swaggerUi = require('swagger-ui-express');

const swaggerDocument = require('./swagger.json');

require('dotenv').config();

// ======================================================
// APP
// ======================================================

const app = express();

// ======================================================
// PORT
// ======================================================

const PORT =
    process.env.PORT || 10000;

// ======================================================
// SECURITY
// ======================================================

app.use(helmet());

app.use(compression());

// ======================================================
// RATE LIMIT
// ======================================================

const limiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        max: 100,

        message: {
            error:
                'Too many requests'
        }
    });

app.use(limiter);

// ======================================================
// CORS
// ======================================================

app.use(cors({

    origin: '*',

    methods: [
        'GET',
        'POST',
        'PUT',
        'DELETE'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ]
}));

// ======================================================
// BODY PARSER
// ======================================================

app.use(express.json({

    limit: '10mb'
}));

app.use(express.urlencoded({

    extended: true
}));

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

function validateEnv() {

    const missing = [];

    REQUIRED_ENV.forEach(key => {

        if (!process.env[key]) {

            missing.push(key);
        }
    });

    if (missing.length > 0) {

        console.error(`
========================================
Missing Environment Variables
${missing.join('\n')}
========================================
        `);

        process.exit(1);
    }
}

validateEnv();

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
// DATABASE INIT
// ======================================================

async function initDB() {

    let connection;

    try {

        connection =
            await pool.getConnection();

        console.log(
            '✅ MySQL Connected'
        );

        await connection.query(`

            CREATE TABLE IF NOT EXISTS pokemon (

                id INT PRIMARY KEY AUTO_INCREMENT,

                nombre VARCHAR(100) NOT NULL,

                altura DECIMAL(5,2),

                peso DECIMAL(5,2),

                habilidades JSON,

                imagen_frontal TEXT,

                imagen_trasera TEXT,

                created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
            )

        `);

        const [rows] =
            await connection.query(`

                SELECT COUNT(*) AS total
                FROM pokemon

            `);

        // ======================================
        // SEED DATA
        // ======================================

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
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png'
                )

            `);

            console.log(
                '✅ Initial Pokemon inserted'
            );
        }

    } catch (error) {

        console.error(`
========================================
DATABASE INIT ERROR
${error.message}
========================================
        `);

    } finally {

        if (connection) {

            connection.release();
        }
    }
}

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/', async (req, res) => {

    try {

        await pool.query('SELECT 1');

        res.status(200).json({

            service:
                'Pokemon API',

            status:
                'running',

            database:
                'connected',

            timestamp:
                new Date()
        });

    } catch (error) {

        res.status(500).json({

            service:
                'Pokemon API',

            status:
                'database error',

            error:
                error.message
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

                SELECT
                    id,
                    nombre,
                    altura,
                    peso,
                    habilidades,
                    imagen_frontal,
                    imagen_trasera
                FROM pokemon
                ORDER BY id ASC

            `);

        res.status(200).json(pokemon);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error:
                'Internal Server Error',

            message:
                error.message
        });
    }
});

// ======================================================
// GET POKEMON BY ID
// ======================================================

app.get('/api/pokemon/:id', async (req, res) => {

    try {

        const { id } =
            req.params;

        // ======================================
        // VALIDATION
        // ======================================

        if (
            !id ||
            isNaN(id)
        ) {

            return res.status(400).json({

                error:
                    'Invalid Pokemon ID'
            });
        }

        const [pokemon] =
            await pool.query(`

                SELECT *
                FROM pokemon
                WHERE id = ?

            `, [id]);

        // ======================================
        // NOT FOUND
        // ======================================

        if (
            pokemon.length === 0
        ) {

            return res.status(404).json({

                error:
                    'Pokemon not found'
            });
        }

        res.status(200).json(
            pokemon[0]
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error:
                'Internal Server Error',

            message:
                error.message
        });
    }
});

// ======================================================
// SWAGGER
// ======================================================

app.use(

    '/apidocs',

    swaggerUi.serve,

    swaggerUi.setup(
        swaggerDocument,
        {
            explorer: true
        }
    )
);

// ======================================================
// 404
// ======================================================

app.use((req, res) => {

    res.status(404).json({

        error:
            'Route not found'
    });
});

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {

    console.error(`
========================================
SERVER ERROR
${err.stack}
========================================
    `);

    res.status(500).json({

        error:
            'Internal Server Error'
    });
});

// ======================================================
// START SERVER
// ======================================================

async function startServer() {

    try {

        await initDB();

        app.listen(PORT, () => {

            console.log(`
========================================
🚀 Pokemon API Running
🌐 Port: ${PORT}
📄 Swagger:
https://proyectofinal-ta9q.onrender.com/apidocs
========================================
            `);
        });

    } catch (error) {

        console.error(`
========================================
SERVER START ERROR
${error.message}
========================================
        `);

        process.exit(1);
    }
}

startServer();
