import jwt from 'jsonwebtoken'

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization']
    
    if (!authHeader) { 
        return res.status(401).json({ message: "No token provided" }) 
    }

    // Extract token from "Bearer token" format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) { 
            return res.status(401).json({ message: "Invalid token" }) 
        }

        req.userId = decoded.userId || decoded.id // Handle both formats
        next()
    })
}

export default authMiddleware