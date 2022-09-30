import express from 'express';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const connection = new Pool({
    connectionString: process.env.DATABASE_URL,
});
 
const server = express();
server.use(express.json());

server.get('/categories', async (req, res) => {
    
    try {
        const categories = await connection.query('SELECT * FROM categories;');
        console.log(categories);
        return res.send(categories['rows']).status(200);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    };

});

server.post('/categories', async (req, res) => {

    const newCategoryName = req.body.name;

    const categories = await connection.query(`SELECT name FROM categories WHERE name = '${req.body.name}'`)

    if (categories.rowCount !== 0) {
        return res.sendStatus(409);
    }

    if (newCategoryName === '') {
        return res.sendStatus(400);
    }

    try {

        const postNewCategory = await connection.query(`INSERT INTO categories (name) VALUES ('${newCategoryName}');`);

        return res.sendStatus(201);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

server.get('/status', (req, res) => {
    res.send("ok").status(200);
});



server.listen(5000, () => {
    console.log('Magic happens on 5000');
});


