const pool = require('../db')

const createWord = async (text, sentence, teacherId) => {
    const result = await pool.query(
        `INSERT INTO words (text, sentence, zones, teacher_id) VALUES ($1, $2, $3, $4) RETURNING id, text, sentence, zones, teacher_id`,
        [text, sentence, '[]', teacherId]
    )
    return result.rows[0]
}

const getWords = async (teacherId, includeCommon) => {
    if (includeCommon) {
        const result = await pool.query(
            `SELECT id, text, sentence, zones, status
            FROM words
            WHERE (teacher_id = $1 AND in_bank = true) OR status = 'common'`, [teacherId]
        )
        return result.rows
    } else {
        const result = await pool.query(
                `SELECT id, text, sentence, zones, status 
                FROM words
                WHERE teacher_id = $1 AND in_bank = true`, [teacherId]
            )
        return result.rows 
    }      
}

//const wordForStudents = async (wordId, studentsId) => {
//    const pairs = []
    
//    for (const student of studentsId) {
//        const result = await pool.query(
//        `INSERT INTO words_students
//        VALUES ($1, $2)
//        RETURNING student_id, word_id`, [wordId, student]
//    )
//    pairs.push(result.rows[0])
//    }
    
//    //console.log(pairs);
//    return pairs
//}

const updateWord = async (wordId, zones, sentence, teacherId) => {
    const result = await pool.query(`
        UPDATE words
        SET sentence = $1, zones = $2
        WHERE id = $3 AND teacher_id = $4
        RETURNING id, text, sentence, zones`, [sentence, zones, wordId, teacherId ])
    
    //console.log(result.rows);
    return result.rows[0]
}

const deleteWordFromBank = async (wordId, teacherId) => {
    const result = await pool.query(`
        UPDATE words
        SET in_bank = false
        WHERE id = $1 AND teacher_id = $2
        RETURNING id, in_bank`, [wordId, teacherId]
    )
    //console.log(result.rows);
    return result.rows
}

const getWordById = async (wordId, teacherId) => {
    const result = await pool.query(`
        SELECT id, text, sentence, zones
        FROM words
        WHERE id = $1 AND teacher_id = $2`, [wordId, teacherId])
    
    return result.rows[0]
}

const setPendingStatus = async (wordId, teacherId, status) => {
    const result = await pool.query(
        `UPDATE words
        SET status = $1
        WHERE id = $2 AND teacher_id = $3
        RETURNING id, status`, [status, wordId, teacherId]
    )
    return result.rows[0]
}

const adminGetWords = async (wordId) => {
    const result = await pool.query(
        `SELECT id, text, sentence, zones, teacher_id, status
        FROM words
        WHERE id = $1`, [wordId]
    )
    return result.rows[0]
}

const updateWordStatus = async (wordId, status) => {
    const result = await pool.query(
        `UPDATE words
        SET status = $1
        WHERE id = $2
        RETURNING id, status`, [status, wordId]
    )
    return result.rows[0]
}

const getPendingWords = async () => {
    const result = await pool.query(
        `SELECT id, text, sentence, zones, teacher_id
        FROM words
        WHERE status = 'pending'`
    )
    return result.rows
}

module.exports = { createWord, getWords, updateWord, deleteWordFromBank, getWordById, setPendingStatus, adminGetWords, updateWordStatus, getPendingWords }