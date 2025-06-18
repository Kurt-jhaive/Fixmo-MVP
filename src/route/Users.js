import express from 'express';
import bcrypt  from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = require('../prismaclient.js');

// Get ALL Users

router.get('/',  (req, res) => { // This is the endpoint for getting all users

    console.log("YEY I hit an endpoint")
    res.sendStatus(200);
})

export default router;
// router.get('/', async (req, res) => {
