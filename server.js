const express = require("express");
const { PrismaClient } = require("@prisma/client");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(compression());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests per windowMs
  })
);

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'MDDS Address API',
      version: '1.0.0',
      description: 'API for searching Indian addresses from the MDDS dataset',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./server.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /:
 *   get:
 *     summary: API status check
 *     description: Returns a message indicating the API is running.
 *     responses:
 *       200:
 *         description: API is running.
 */
app.get("/", (req, res) => {
    res.send("MDDS Address API Running");
});

app.get("/villages", async (req, res) => {

    const villages = await prisma.village.findMany({
        take: 20
    });

    res.json(villages);
});

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search for a village
 *     description: Searches for villages by name. Requires a query parameter `q`.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: The search query for the village name.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of matching villages with their full address hierarchy.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   village:
 *                     type: string
 *                   subDistrict:
 *                     type: string
 *                   district:
 *                     type: string
 *                   state:
 *                     type: string
 */
app.get("/search", async (req, res) => {

    const q = req.query.q || "";

    if (q.length < 2) {
        return res.json([]);
    }

    const villages = await prisma.village.findMany({
        where: {
            name: {
                contains: q,
                mode: "insensitive"
            }
        },
        include: {
            subDistrict: {
                include: {
                    district: {
                        include: {
                            state: true
                        }
                    }
                }
            }
        },
        take: 20
    });

    const result = villages.map(v => ({
        code: v.code,
        village: v.name,
        subDistrict: v.subDistrict.name,
        district: v.subDistrict.district.name,
        state: v.subDistrict.district.state.name
    }));

    res.json(result);
});

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Get database statistics
 *     description: Returns the total count of states, districts, sub-districts, and villages in the database.
 *     responses:
 *       200:
 *         description: Database statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 states:
 *                   type: integer
 *                 districts:
 *                   type: integer
 *                 subDistricts:
 *                   type: integer
 *                 villages:
 *                   type: integer
 */
app.get("/stats", async (req, res) => {

    const states = await prisma.state.count();
    const districts = await prisma.district.count();
    const subDistricts = await prisma.subDistrict.count();
    const villages = await prisma.village.count();

    res.json({
        states,
        districts,
        subDistricts,
        villages
    });
});

/**
 * @swagger
 * /states:
 *   get:
 *     summary: Retrieve a list of all states
 *     description: Retrieve a list of all states in India, sorted alphabetically.
 *     responses:
 *       200:
 *         description: A list of states.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   code:
 *                     type: string
 *                   name:
 *                     type: string
 */
app.get("/states", async (req, res) => {

    const states = await prisma.state.findMany({
        orderBy: {
            name: "asc"
        }
    });

    res.json(states);
});

/**
 * @swagger
 * /districts/{stateCode}:
 *   get:
 *     summary: Retrieve a list of districts for a given state
 *     description: Retrieve a list of districts for a given state code.
 *     parameters:
 *       - in: path
 *         name: stateCode
 *         required: true
 *         description: The code of the state to retrieve districts for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of districts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   district:
 *                     type: string
 */
app.get("/districts/:stateCode", async (req, res) => {

    const districts = await prisma.district.findMany({
        where: {
            state: {
                code: req.params.stateCode
            }
        },
        orderBy: {
            name: "asc"
        }
    });

    const result = districts.map(d => ({
        code: d.code,
        district: d.name
    }));

    res.json(result);
});

/**
 * @swagger
 * /subdistricts/{districtCode}:
 *   get:
 *     summary: Retrieve a list of sub-districts for a given district
 *     description: Retrieve a list of sub-districts for a given district code.
 *     parameters:
 *       - in: path
 *         name: districtCode
 *         required: true
 *         description: The code of the district to retrieve sub-districts for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of sub-districts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   subDistrict:
 *                     type: string
 */
app.get("/subdistricts/:districtCode", async (req, res) => {

    const subdistricts = await prisma.subDistrict.findMany({
        where: {
            district: {
                code: req.params.districtCode
            }
        },
        orderBy: {
            name: "asc"
        }
    });

    res.json(
        subdistricts.map(s => ({
            code: s.code,
            subDistrict: s.name
        }))
    );
});

/**
 * @swagger
 * /villages/{subdistrictCode}:
 *   get:
 *     summary: Retrieve a list of villages for a given sub-district
 *     description: Retrieve a list of villages for a given sub-district code. Returns a maximum of 100 villages.
 *     parameters:
 *       - in: path
 *         name: subdistrictCode
 *         required: true
 *         description: The code of the sub-district to retrieve villages for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of villages.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   village:
 *                     type: string
 */
app.get("/villages/:subdistrictCode", async (req, res) => {

    const villages = await prisma.village.findMany({
        where: {
            subDistrict: {
                code: req.params.subdistrictCode
            }
        },
        take: 100
    });

    res.json(
        villages.map(v => ({
            code: v.code,
            village: v.name
        }))
    );
});

/**
 * @swagger
 * /village/{code}:
 *   get:
 *     summary: Retrieve full details for a specific village
 *     description: Retrieve the full address hierarchy (village, sub-district, district, state) for a given village code.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: The code of the village to retrieve details for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The full address details of the village.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 village:
 *                   type: string
 *                 subDistrict:
 *                   type: string
 *                 district:
 *                   type: string
 *                 state:
 *                   type: string
 *       404:
 *         description: Village not found.
 */
app.get("/village/:code", async (req, res) => {

    const village = await prisma.village.findUnique({
        where: {
            code: req.params.code
        },
        include: {
            subDistrict: {
                include: {
                    district: {
                        include: {
                            state: true
                        }
                    }
                }
            }
        }
    });

    if (!village) {
        return res.status(404).json({
            message: "Village not found"
        });
    }

    res.json({
        code: village.code,
        village: village.name,
        subDistrict: village.subDistrict.name,
        district: village.subDistrict.district.name,
        state: village.subDistrict.district.state.name
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});