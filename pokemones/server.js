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
// TRUST PROXY
// ======================================================

app.set('trust proxy', 1);

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
// CORS
// ======================================================

app.use(cors({

    origin: '*',

    methods: [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ]
}));

app.options('*', cors());

// ======================================================
// RATE LIMIT
// ======================================================

const limiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        max: 300,

        standardHeaders: true,

        legacyHeaders: false
    });

app.use(limiter);

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
MISSING ENV VARIABLES
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

    queueLimit: 0
});

// ======================================================
// INIT DATABASE
// ======================================================

async function initDB() {

    let connection;

    try {

        connection =
            await pool.getConnection();

        console.log('✅ MySQL Connected');

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

        // ======================================================
        // INSERT INITIAL DATA
        // ======================================================

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
DATABASE ERROR
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
// TEST ROUTE
// ======================================================

app.get('/test', (req, res) => {

    res.status(200).json({

        message:
            'Test route working'
    });
});

// ======================================================
// ROOT
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

            error:
                error.message
        });
    }
});

// ======================================================
// HEALTH
// ======================================================

app.get('/health', (req, res) => {

    res.status(200).json({

        status:
            'ok'
    });
});

// ======================================================
// GET ALL POKEMON
// ======================================================

app.get('/api/pokemon', async (req, res) => {

    try {

        console.log('GET /api/pokemon');

        const [rows] =
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

        // ======================================================
        // VALIDATE ARRAY
        // ======================================================

        if (!Array.isArray(rows)) {

            console.error(
                'Rows is not array'
            );

            return res.status(200).json([]);
        }

        // ======================================================
        // FORMAT DATA
        // ======================================================

        const pokemon =
            rows.map(p => {

                let habilidades = [];

                try {

                    if (
                        typeof p.habilidades === 'string'
                    ) {

                        habilidades =
                            JSON.parse(
                                p.habilidades
                            );

                    } else if (
                        Array.isArray(p.habilidades)
                    ) {

                        habilidades =
                            p.habilidades;
                    }

                } catch (jsonError) {

                    console.error(
                        'JSON Parse Error:',
                        jsonError.message
                    );

                    habilidades = [];
                }

                return {

                    id:
                        Number(p.id || 0),

                    nombre:
                        p.nombre || 'Sin nombre',

                    altura:
                        Number(p.altura || 0),

                    peso:
                        Number(p.peso || 0),

                    habilidades,

                    imagen_frontal:
                        p.imagen_frontal || '',

                    imagen_trasera:
                        p.imagen_trasera || ''
                };
            });

        // ======================================================
        // ALWAYS RETURN ARRAY
        // ======================================================

        return res.status(200).json(
            pokemon
        );

    } catch (error) {

        console.error(`
========================================
POKEMON ROUTE ERROR
${error.message}
========================================
        `);

        return res.status(200).json([]);
    }
});

// ======================================================
// GET POKEMON BY ID
// ======================================================

app.get('/api/pokemon/:id', async (req, res) => {

    try {

        const { id } =
            req.params;

        // ======================================================
        // VALIDATE ID
        // ======================================================

        if (isNaN(id)) {

            return res.status(400).json({

                error:
                    'Invalid ID'
            });
        }

        const [rows] =
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
                WHERE id = ?

            `, [id]);

        // ======================================================
        // NOT FOUND
        // ======================================================

        if (!rows.length) {

            return res.status(404).json({

                error:
                    'Pokemon not found'
            });
        }

        const p = rows[0];

        let habilidades = [];

        try {

            if (
                typeof p.habilidades === 'string'
            ) {

                habilidades =
                    JSON.parse(
                        p.habilidades
                    );

            } else if (
                Array.isArray(p.habilidades)
            ) {

                habilidades =
                    p.habilidades;
            }

        } catch {

            habilidades = [];
        }

        return res.status(200).json({

            id:
                Number(p.id || 0),

            nombre:
                p.nombre || 'Sin nombre',

            altura:
                Number(p.altura || 0),

            peso:
                Number(p.peso || 0),

            habilidades,

            imagen_frontal:
                p.imagen_frontal || '',

            imagen_trasera:
                p.imagen_trasera || ''
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            error:
                'Internal Server Error'
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
// DEBUG ROUTES
// ======================================================

console.log('================ ROUTES ================');

app._router.stack.forEach(r => {

    if (r.route && r.route.path) {

        console.log(r.route.path);
    }
});

console.log('========================================');

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

    console.error(err.stack);

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

        console.error(error);

        process.exit(1);
    }
}

startServer();
