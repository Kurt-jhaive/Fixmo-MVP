import jwt from 'jsonwebtoken'

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader

    if (!token) { 
        return res.status(401).json({ message: "No token provided" }) 
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
        if (err) { 
            return res.status(401).json({ message: "Invalid token" }) 
        }

        req.userId = decoded.id
        req.userType = decoded.userType || 'provider' // Store user type for reference
        next()
    })
}

export default authMiddleware