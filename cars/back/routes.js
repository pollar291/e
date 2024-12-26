const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const ADMIN_LOGIN = 'newfit';
const ADMIN_PASSWORD = 'qsw123';

const register = async (pool, req, res) => {
    const { login, password, email, phone, full_name } = req.body;

    if (!login || !password || !email || !phone || !full_name) {
        return res.status(400).json({ message: '' });
    }

    try {
        const user = await pool.query('SELECT id FROM users WHERE login = $1', [login]);

        if (user.rowCount > 0) {
            return res.status(409).json({ message: 'Такой пользователь уже существует' });
        }

        var role = 'user'
        if(login === ADMIN_LOGIN){
            role = 'admin'
        }

        const hashedPassword = bcrypt.hashSync(password, 8);
        const result = await pool.query(
            'INSERT INTO users (login, password, email, phone, full_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [login, hashedPassword, email, phone, full_name, role]
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            userId: result.rows[0].id,
        });
    } catch (err) {
        console.error('Ошибка', err.message);
        res.status(500).json({ message: '' });
    }
};

const login = async (pool, req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ message: 'Логин или пароль обязательны' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Неправильный логин или пароль' });
        }

        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Неправильный логин или пароль' });
        }

        await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);

        const generatedToken = uuidv4();
        const sessionResult = await pool.query(
            'INSERT INTO sessions (uuid, user_id) VALUES ($1, $2) RETURNING *',
            [generatedToken, user.id]
        );

        const session = sessionResult.rows[0];

        res.json({ token: session.uuid, userId: session.user_id });
    } catch (err) {
        console.error('Ошибка', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};

const createCar = async (pool, req, res) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ message: 'Пустой токен' });
        }

        const result = await pool.query('SELECT * FROM sessions WHERE uuid = $1', [token]);
        const sessionResult = result.rows[0];
        if (!sessionResult) {
            return res.status(401).json({ message: 'Нет авторизации' });
        }

        const userId = sessionResult.user_id;
        const { name, problem, date } = req.body;

        if (!name || !problem || !date ) {
            return res.status(400).json({ message: 'Заполнены не все поля!' });
        }

        await pool.query(
            'INSERT INTO cars (name, problem, date, user_id, status) VALUES ($1, $2, $3, $4, $5)',
            [name, problem, date, userId, 'created']
        );
        res.status(201).json({ message: 'Заявка одобрена' });
    } catch (err) {
        console.error('Ошибка', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};

const carsByUser = async (pool, req, res) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ message: 'Пустой токен' });
        }

        const sessionQuery = await pool.query('SELECT * FROM sessions WHERE uuid = $1', [token]);
        const sessionResult = sessionQuery.rows[0];
        if (!sessionResult) {
            return res.status(401).json({ message: 'Нет авторизации' });
        }

        const userId = sessionResult.user_id;

        const result = await pool.query('SELECT * FROM cars WHERE user_id = $1', [userId]);
        res.json({ cars: result.rows });
    } catch (err) {
        console.error('Ошибка', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};


const getAllUserCars = async (pool, req, res) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ message: 'Пустой токен' });
        }

        const sessionQuery = await pool.query('SELECT * FROM sessions WHERE uuid = $1', [token]);
        const sessionResult = sessionQuery.rows[0];
        if (!sessionResult) {
            return res.status(401).json({ message: 'Нет авторизации' });
        }

        const userId = sessionResult.user_id;

        const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (user.rows[0].role !== 'admin') {
            return res.status(403)
        }

        const result = await pool.query("SELECT * FROM users u JOIN cars b ON b.user_id = u.id WHERE u.role != 'admin'");
        res.json({ result: result.rows });
    } catch (err) {
        console.error('Ошибка', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};

const updateCars = async (pool, req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {

        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ message: 'Нет токена' });
        }

        const sessionQuery = await pool.query('SELECT * FROM sessions WHERE uuid = $1', [token]);
        const sessionResult = sessionQuery.rows[0];
        if (!sessionResult) {
            return res.status(401).json({ message: 'Нет авторизации' });
        }

        const userId = sessionResult.user_id;

        const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (user.rows[0].role !== 'admin') {
            return res.status(403)
        }

        await pool.query('UPDATE cars SET status = $1 WHERE id = $2', [status, id]);
        return;
    } catch (err) {
        console.error('Ошибка', err.message);
        res.status(500).json({ message: 'Произошла ошибка на сервере' });
    }
};


module.exports = {
    register,
    login,
    createCar,
    carsByUser,
    getAllUserCars,
    updateCars
};