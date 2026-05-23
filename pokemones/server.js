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

require('dotenv').config();

// ======================================================
// SWAGGER SAFE LOAD
// ======================================================

let swaggerDocument = {};

try {

    swaggerDocument =
        require('./swagger.json');

} catch {

    console.warn(
        'Swagger file not found'
    );
}

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
// HEALTH CHECK
// ======================================================

app.get('/', async (req, res) => {

    try {

        await pool.query('SELECT 1');

        return res.status(200).json({

            service:
                'Pokemon API',

            status:
                'running',

            database:
                'connected'
        });

    } catch (error) {

        return res.status(500).json({

            service:
                'Pokemon API',

            status:
                'error',

            error:
                error.message
        });
    }
});

// ======================================================
// HEALTH
// ======================================================

app.get('/health', (req, res) => {

    return res.status(200).json({

        status:
            'ok'
    });
});

// ======================================================
// GET ALL POKEMON
// ======================================================

app.get('/api/pokemon', async (req, res) => {

    try {

        console.log(
            'GET /api/pokemon'
        );

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

        // ======================================
        // VALIDATE ARRAY
        // ======================================

        if (!Array.isArray(rows)) {

            return res.status(200).json([]);
        }

        // ======================================
        // FORMAT DATA
        // ======================================

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
                    }

                    else if (
                        Array.isArray(p.habilidades)
                    ) {

                        habilidades =
                            p.habilidades;
                    }

                } catch {

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

        // ======================================
        // ALWAYS RETURN ARRAY
        // ======================================

        return res.status(200).json(
            pokemon
        );

    } catch (error) {

        console.error(`
========================================
POKEMON API ERROR
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

        if (!rows.length) {

            return res.status(404).json({

                error:
                    'Pokemon not found'
            });
        }

        const p =
            rows[0];

        let habilidades = [];

        try {

            if (
                typeof p.habilidades === 'string'
            ) {

                habilidades =
                    JSON.parse(
                        p.habilidades
                    );
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

if (
    swaggerDocument &&
    Object.keys(swaggerDocument).length > 0
) {

    app.use(
        '/apidocs',
        swaggerUi.serve,
        swaggerUi.setup(
            swaggerDocument
        )
    );
}

// ======================================================
// 404
// ======================================================

app.use((req, res) => {

    return res.status(404).json({

        error:
            'Route not found'
    });
});

// ======================================================
// GLOBAL ERROR
// ======================================================

app.use((err, req, res, next) => {

    console.error(err);

    return res.status(500).json({

        error:
            'Internal Server Error'
    });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

    console.log(`
========================================
🚀 Pokemon API Running
🌐 Port: ${PORT}
========================================
    `);
});
