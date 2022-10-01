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

server.get('/games', async (req, res) => {

    const search = req.query.name;
    console.log(search);

    try {
        if (search) {
            const games = await connection.query(
                'SELECT games.*, categories.name as "categoryName" FROM games JOIN categories ON games."categoryId"=categories.id WHERE games.name LIKE $1;',
                [`%${search}%`]
                );
            return res.send(games['rows']).status(200);
        }
        const games = await connection.query('SELECT games.*, categories.name as "categoryName" FROM games JOIN categories ON games."categoryId"=categories.id;');
        console.log(games['rows']);
        return res.send(games['rows']).status(200);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    };

});

server.post('/games', async (req, res) => {

    const newGame = req.body;

    try {
        const conflict = await connection.query(
            'SELECT id FROM games WHERE name=$1',
            [newGame.name]
            );
        const noCategory = await connection.query(
            'SELECT id FROM categories WHERE id=$1',
            [newGame.categoryId]
        );
        if (noCategory['rowCount'] === 0) {
            return res.sendStatus(400);
        };

        if (conflict['rowCount'] !== 0) {
            return res.sendStatus(409);
        };
        if ( newGame.name === "" || newGame.stockTotal <= 0 || newGame.pricePerDay <= 0) {
            return  res.sendStatus(400);
        }

        const createNewGame = await connection.query(
            'INSERT INTO games (name,image,"stockTotal","categoryId","pricePerDay") VALUES ($1,$2,$3,$4,$5);',
            [
                newGame.name,
                newGame.image,
                newGame.stockTotal,
                newGame.categoryId,
                newGame.pricePerDay
            ]
        );

        return res.sendStatus(201);

    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    };

});

server.get('/customers', async (req, res) => {

    const search = req.query.cpf;
    console.log(search);

    try {
        if (search) {
            const customers = await connection.query(
                'SELECT * FROM customers WHERE cpf LIKE $1;',
                [`%${search}%`]
                );
            return res.send(customers['rows']).status(200);
        }
        const customers = await connection.query('SELECT * FROM customers;');
        console.log(customers['rows']);
        return res.send(customers['rows']).status(200);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    };
});

server.get('/customers/:id', async (req, res) => {

    const id = req.params.id;
    
    try {
        const customer = await connection.query(
            'SELECT * FROM customers WHERE id=$1',
            [id]
        );
        if (customer['rowCount'] === 0) {
            return res.sendStatus(404);
        }
        return res.send(customer['rows']).status(200);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }

});

server.post('/customers', async)

server.get('/status', (req, res) => {
    res.send("ok").status(200);
});

server.listen(5000, () => {
    console.log('Magic happens on 5000');
});


