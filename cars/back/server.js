const { Pool } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { register, login, createCar, carsByUser, getAllUserCars, updateCars } = require('./routes')

const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'car',
    password: 'root',
    port: 5432,
});

pool.connect((err) => {
    if (err) {
        console.error('Ошибка БД', err.message);
    } else {
        console.log('Успех');
    }
});

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/register', async (req, res) => register(pool, req, res));
app.post('/login', async (req, res) => login(pool, req, res));

app.post('/car', async (req, res) => createCar(pool, req, res));
app.get('/cars', async (req, res) => carsByUser(pool, req, res));
app.get('/admin/cars', async (req, res) => getAllUserCars(pool, req, res));
app.put('/admin/cars/:id', async (req, res) =>updateCars(pool, req, res));

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
