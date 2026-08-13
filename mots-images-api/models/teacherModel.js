const pool = require('../db')

const createTeacher = async (name, email, hashedPassword) => {
    const result = await pool.query(
        'INSERT INTO teachers (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name, email, hashedPassword]
    )
    return result.rows[0]
}

module.exports = {createTeacher}