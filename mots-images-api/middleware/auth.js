const jwt = require('jsonwebtoken')
const { isAdmin } = require('../models/teacherModel')

const authenticateTeacher = (req, res, next) => {
    if(req.headers.authorization) {
        const token = req.headers.authorization.split(" ")[1]

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            req.teacherId = decoded.teacherId
            next()
        } catch (error) {
            res.status(401).json('Token invalide')
        }

    } else {
        res.status(401).json('Aucune authorisation trouvée')
        return
    }
    
}

const requireAdmin = async (req, res, next) => {
    try {
        const teacherId = req.teacherId
        const admin = await isAdmin(teacherId)
        if(admin) {
            next()
        } else {
            res.status(403).json('Forbidden')
        }
    } catch (error) {
        res.status(500).json(error.message)
    }
}

module.exports = {authenticateTeacher, requireAdmin}