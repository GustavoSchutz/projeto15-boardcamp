import express, { response } from 'express';
import pkg from 'pg';
import dotenv from 'dotenv';
import joi from 'joi';
import cors from 'cors';
import dayjs from 'dayjs';

dotenv.config();

const { Pool } = pkg;

const connection = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const server = express();
server.use(cors());
server.use(express.json());

const customerSchema = joi.object({
    name: joi.string()
        .required(),
    phone: joi.string()
        .regex(/^\d+$/)
        .min(10)
        .max(11)
        .required(),
    cpf: joi.string()
        .regex(/^\d+$/)
        .min(11)
        .max(11)
        .required(),
    birthday: joi.date()
        .required()
});


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
        if (newGame.name === "" || newGame.stockTotal <= 0 || newGame.pricePerDay <= 0) {
            return res.sendStatus(400);
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

server.post('/customers', async (req, res) => {

    const newCustomer = req.body;
    console.log(newCustomer.cpf);
    const newCustomerValidation = customerSchema.validate(newCustomer);
    const today = dayjs(new Date());

    if (dayjs(newCustomer.birthday).isAfter(today)) {
        console.log(newCustomer.birthday);
        return res.sendStatus(400);
    };

    if (newCustomerValidation.error) {
        console.log(newCustomerValidation.error.details);
        return res.sendStatus(400);
    };



    try {
        const conflict = await connection.query(
            'SELECT * FROM customers WHERE cpf=$1;',
            [newCustomer.cpf]
        );
        console.log(conflict['rowCount']);
        if (!(conflict['rowCount'] === 0)) {
            return res.sendStatus(409);
        };

        const createNewCustomer = await connection.query(
            'INSERT INTO customers (name,phone,cpf,birthday) VALUES ($1,$2,$3,$4);',
            [
                newCustomer.name,
                newCustomer.phone,
                newCustomer.cpf,
                newCustomer.birthday
            ]
        );

        return res.sendStatus(201);

    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }

});

server.put("/customers/:id", async (req, res) => {

    const id = req.params.id;

    const updatedCustomerData = req.body;

    const newCustomerValidation = customerSchema.validate(updatedCustomerData);
    const today = dayjs(new Date());

    if (dayjs(updatedCustomerData.birthday).isAfter(today)) {
        console.log(updatedCustomerData.birthday);
        return res.sendStatus(400);
    };

    if (newCustomerValidation.error) {
        console.log(newCustomerValidation.error.details);
        return res.sendStatus(400);
    };

    try {

        const customer = await connection.query(
            'SELECT * FROM customers WHERE id=$1',
            [id]
        );
        if (customer['rowCount'] === 0) {
            return res.sendStatus(404);
        };

        console.log(updatedCustomerData.cpf);

        const conflict = await connection.query(
            'SELECT id FROM customers WHERE cpf=$1;',
            [updatedCustomerData.cpf]
        );
        console.log(conflict['rows'][0].id);
        if (!(conflict['rowCount'] === 0) && conflict['rows'][0].id !== id) {
            return res.sendStatus(409);
        };

        const updateCustomer = await connection.query('UPDATE customers SET name=$1, phone=$2, cpf=$3, birthday=$4 WHERE id=$5;',
            [
                updatedCustomerData.name,
                updatedCustomerData.phone,
                updatedCustomerData.cpf,
                updatedCustomerData.birthday
            ]);

        return res.sendStatus(200)
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }

});

server.get('/rentals', async (req, res) => {

    const customerId = req.query.customerId;
    const gameId = req.query.gameId;


    try {

        if (customerId) {

            const rentailsByCustomer = await connection.query(
                `SELECT rentals.*, TO_CHAR(rentals."rentDate", 'YYYY-MM-DD') AS "rentDate", TO_CHAR(rentals."returnDate", 'YYYY-MM-DD') AS "returnDate", json_build_object('id', customers.id, 'name', customers.name) AS customer, json_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game FROM rentals JOIN customers ON rentals."customerId" = customers.id JOIN games ON rentals."gameId" = games.id JOIN categories ON games."categoryId" = categories.id WHERE rentals."customerId" = $1`,
                [customerId]
            );

            return res.send(rentailsByCustomer['rows']).status(200);

        };

        if (gameId) {
            const rentailsByGame = await connection.query(
                `SELECT rentals.*, TO_CHAR(rentals."rentDate", 'YYYY-MM-DD') AS "rentDate", TO_CHAR(rentals."returnDate", 'YYYY-MM-DD') AS "returnDate", json_build_object('id', customers.id, 'name', customers.name) AS customer, json_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game FROM rentals JOIN customers ON rentals."customerId" = customers.id JOIN games ON rentals."gameId" = games.id JOIN categories ON games."categoryId" = categories.id WHERE rentals."gameId" = $1`,
                [gameId]
            );

            return res.send(rentailsByGame['rows']).status(200);
        }
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }

})

server.post('/rentals', async (req, res) => {
    const today = dayjs(new Date());
    const rentDate = today.format('YYYY-MM-DD');
    const gameId = req.body.gameId;
    const getPrice = await connection.query('SELECT "pricePerDay" FROM games WHERE id = $1;', [gameId]);
    if (getPrice['rowCount'] === 0) {
        return res.sendStatus(400);
    }
    const price = getPrice['rows'][0].pricePerDay;
    const customerId = req.body.customerId;
    const daysRented = req.body.daysRented;

    if (daysRented <= 0) {
        return res.sendStatus(400);
    }

    const originalPrice = daysRented * price;

    try {
        const customer = await connection.query(
            'SELECT * FROM customers WHERE id=$1',
            [customerId]
        );
        if (customer['rowCount'] === 0) {
            return res.sendStatus(400);
        };

        await connection.query(
            'INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "originalPrice") VALUES($1, $2, $3, $4, $5)',
            [customerId, gameId, rentDate, daysRented, originalPrice]
        );

        return res.sendStatus(201);

    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }

    return res.sendStatus(200);

})

server.post('/rentals/:id/return', async (req, res) => {
    const today = dayjs(new Date());
    const returnDate = today.format('YYYY-MM-DD');

    const id = req.params.id;
    try {
        const rental = await connection.query(
            'SELECT * FROM rentals WHERE id = $1;',
            [id]
        );

        if (rental['rowCount'] === 0) {
            return res.sendStatus(404);
        }

        if (rental['rows'][0].returnDate !== null){
            console.log(rental['rows'][0].returnDate);
            return res.sendStatus(400);
        };

        const daysDelay = today.diff(dayjs(rental['rows'][0].rentDate).format('YYYY-MM-DD'),
        'day'
        );

        let delayFee = (rental['rows'][0].originalPrice / rental['rows'][0].daysRented) * (daysDelay - rental['rows'][0].daysRented);
        
        if (delayFee < 0) {
            delayFee = 0;
        };

        const updateRentals = await connection.query('UPDATE rentals SET "delayFee" = $1, "returnDate" = $2 WHERE id = $3',
        [delayFee, today.format('YYYY-MM-DD'), id]
        );
        
        return res.sendStatus(200);

    } catch(error) {
        console.log(error);
        return res.sendStatus(500);
    }

})

server.get('/status', (req, res) => {
    res.send("ok").status(200);
});

server.listen(5000, () => {
    console.log('Magic happens on 5000');
});


