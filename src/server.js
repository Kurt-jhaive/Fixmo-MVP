import 'dotenv/config';
import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from './prismaclient.js'; // Use .js extension for ESM
import authCustomerRoutes from './route/authCustomer.js'; // Use .js extension for ESM
import serviceProviderRoutes from './route/serviceProvider.js'; // Use .js extension for ESM

const port = process.env.PORT || 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory


// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse incoming requests with JSON payloads




// Example: Serve an index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


app.use('/auth', authCustomerRoutes, serviceProviderRoutes); // Use the authCustomer and serviceProvider routes

// app.use('/users', usersRouter); // Uncomment if usersRouter is defined

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
