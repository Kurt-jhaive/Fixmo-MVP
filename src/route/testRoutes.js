import express from 'express';

const router = express.Router();

// Simple test route
router.get('/test-simple', (req, res) => {
    res.json({ message: 'Simple test route works!' });
});

router.post('/test-post', (req, res) => {
    res.json({ message: 'Simple POST test route works!' });
});

export default router;
