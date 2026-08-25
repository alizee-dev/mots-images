const pool = require('../db')

const createTeacher = async (name, email, hashedPassword) => {
    const result = await pool.query(
        'INSERT INTO teachers (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name, email, hashedPassword]
    )
    return result.rows[0]
}

const findTeacher = async (email) => {
    const result = await pool.query(
        'SELECT id, password_hash FROM teachers WHERE email = $1', [email]
    )
    return result.rows[0]
}

const getAiGenerationsCount = async(teacherId) => {
    const result = await pool.query(`
        SELECT ai_generations_count 
        FROM teachers
        where id = $1`, [teacherId])
    return result.rows[0].ai_generations_count
}

const incrementAiGenerationsCount = async(teacherId) => {
    const result = await pool.query(`
        UPDATE teachers
        SET ai_generations_count = ai_generations_count +1
        WHERE id = $1
        RETURNING id, ai_generations_count`, [teacherId])
    return result.rows[0]
}

module.exports = {createTeacher, findTeacher, getAiGenerationsCount, incrementAiGenerationsCount}