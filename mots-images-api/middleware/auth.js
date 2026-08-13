const jwt = require('jsonwebtoken')

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

module.exports = {authenticateTeacher}