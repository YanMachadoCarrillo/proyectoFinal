const http = require('http');
const mysql = require('mysql2/promise');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;

// MYSQL CLOUD AIVEN
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-2f42ba29-yanca-d8df.e.aivencloud.com',
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASS || 'AVNS_UN7GfudXe794uGDBbm2',
    database: process.env.DB_NAME || 'defaultdb',
    port: process.env.DB_PORT || 20110,

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// INICIALIZAR BASE DE DATOS
async function initDB() {

    try {

        const connection = await pool.getConnection();

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

        const [rows] = await connection.query(
            'SELECT COUNT(*) AS total FROM pokemon'
        );

        if (rows[0].total === 0) {

            const pokemonData = [
                [
                    'Pikachu',
                    0.40,
                    6.00,
                    '["Static","Lightning Rod"]',
                    'https://automlucas.com/img/front/Pikachu.png',
                    'https://automlucas.com/img/back/Pikachu.png'
                ],
                [
                    'Bulbasaur',
                    0.70,
                    6.90,
                    '["Overgrow","Chlorophyll"]',
                    'https://automlucas.com/img/front/Bulbasaur.png',
                    'https://automlucas.com/img/back/Bulbasaur.png'
                ],
                [
                    'Charmander',
                    0.60,
                    8.50,
                    '["Blaze","Solar Power"]',
                    'https://automlucas.com/img/front/Charmander.png',
                    'https://automlucas.com/img/back/Charmander.png'
                ],
                [
                    'Squirtle',
                    0.50,
                    9.00,
                    '["Torrent","Rain Dish"]',
                    'https://automlucas.com/img/front/Squirtle.png',
                    'https://automlucas.com/img/back/Squirtle.png'
                ],
                [
                    'Gengar',
                    1.50,
                    40.50,
                    '["Cursed Body"]',
                    'https://automlucas.com/img/front/Gengar.png',
                    'https://automlucas.com/img/back/Gengar.png'
                ],
                [
                    'Mewtwo',
                    2.00,
                    122.00,
                    '["Pressure","Unnerve"]',
                    'https://automlucas.com/img/front/Mewtwo.png',
                    'https://automlucas.com/img/back/Mewtwo.png'
                ]
            ];

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
                VALUES ?
            `, [pokemonData]);

            console.log('Pokemon insertados.');
        }

        connection.release();

        console.log('MySQL conectado correctamente.');

    } catch (error) {

        console.error('Error MySQL:', error);
    }
}

// RESPUESTA JSON
function sendJSON(res, statusCode, data) {

    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.end(JSON.stringify(data));
}

// SERVIDOR
const server = http.createServer(async (req, res) => {

    // CORS
    if (req.method === 'OPTIONS') {

        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });

        return res.end();
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {

        // HOME
        if (req.method === 'GET' && pathname === '/') {

            return sendJSON(res, 200, {
                service: 'Pokemon Microservice',
                status: 'Running',
                database: 'MySQL Cloud Aiven',
                endpoints: {
                    allPokemon: '/api/pokemon',
                    pokemonById: '/api/pokemon/:id',
                    docs: '/api-docs'
                }
            });
        }

        // TODOS LOS POKEMON
        if (req.method === 'GET' && pathname === '/api/pokemon') {

            const [pokemon] = await pool.query(`
                SELECT * FROM pokemon
                ORDER BY id ASC
            `);

            return sendJSON(res, 200, pokemon);
        }

        // POKEMON POR ID
        if (
            req.method === 'GET' &&
            pathname.startsWith('/api/pokemon/')
        ) {

            const id = pathname.split('/')[3];

            const [pokemon] = await pool.query(`
                SELECT * FROM pokemon
                WHERE id = ?
            `, [id]);

            if (pokemon.length === 0) {

                return sendJSON(res, 404, {
                    error: 'Pokemon no encontrado'
                });
            }

            return sendJSON(res, 200, pokemon[0]);
        }

        // SWAGGER
        if (
            req.method === 'GET' &&
            pathname === '/api-docs'
        ) {

            const swaggerPath = path.join(
                __dirname,
                'swagger.json'
            );

            if (!fs.existsSync(swaggerPath)) {

                return sendJSON(res, 404, {
                    error: 'swagger.json no encontrado'
                });
            }

            const swaggerData = fs.readFileSync(swaggerPath);

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(swaggerData);
        }

        // 404
        return sendJSON(res, 404, {
            error: 'Ruta no encontrada'
        });

    } catch (error) {

        console.error('Server Error:', error);

        return sendJSON(res, 500, {
            error: 'Internal Server Error'
        });
    }
});

// INICIAR SERVIDOR
server.listen(PORT, async () => {

    console.log(`
========================================
🚀 Pokemon Microservice Running
🌐 Port: ${PORT}
🗄️ MySQL: Connected
========================================
    `);

    await initDB();
});
