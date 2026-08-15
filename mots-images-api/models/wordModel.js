const pool = require('../db')

const createWord = async (text, sentence, teacherId) => {
    const result = await pool.query(
        `INSERT INTO words (text, sentence, zones, teacher_id) VALUES ($1, $2, $3, $4) RETURNING id, text, sentence, zones, teacher_id`,
        [text, sentence, '[]', teacherId]
    )
    return result.rows[0]
}

const getWords = async (teacherId) => {
    const result = await pool.query(
        `SELECT id, text, sentence, zones 
        FROM words
        WHERE teacher_id = $1`, [teacherId]
    )
    console.log(result.rows);
    return result.rows
      
}

const wordForStudents = async (wordId, studentsId) => {
    const pairs = []
    
    for (const student of studentsId) {
        const result = await pool.query(
        `INSERT INTO words_students
        VALUES ($1, $2)
        RETURNING student_id, word_id`, [wordId, student]
    )
    pairs.push(result.rows[0])
    }
    
    console.log(pairs);
    return pairs
}

const updateWord = async (wordId, zones, sentence, teacherId) => {
    const result = await pool.query(`
        UPDATE words
        SET sentence = $1, zones = $2
        WHERE id = $3 AND teacher_id = $4
        RETURNING id, text, sentence, zones`, [sentence, zones, wordId, teacherId ])
    
    console.log(result.rows);
    return result.rows[0]
}

module.exports = { createWord, getWords, wordForStudents, updateWord }