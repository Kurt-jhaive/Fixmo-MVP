import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from './prismaclient.js'; // Use .js extension for ESM
import authCustomerRoutes from './route/authCustomer.js'; // Use .js extension for ESM
import serviceProviderRoutes from './route/serviceProvider.js'; // Use .js extension for ESM
import testRoutes from './route/testRoutes.js'; // Test routes
import serviceRoutes from './route/serviceRoutes.js'; // New service management routes
import certificateRoutes from './route/certificateRoutes.js'; // New certificate management routes
import availabilityRoutes from './route/availabilityRoutes.js'; // New availability management routes
import appointmentRoutes from './route/appointmentRoutes.js'; // New appointment management routes
import adminRoute from './route/adminRoute.js'; // Use .js extension for ESM
import cors from 'cors';

const port = process.env.PORT || 3000;
const app = express();



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'))); // Serve uploaded files


// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse incoming requests with JSON payloads

app.use(cors({
  origin: '*', // 💡 for development only
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (extended from 24 hours)
  }
}));




// Example: Serve an index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marketplace.html'));
});

// Additional routes for different pages
app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'booking_system_test.html'));
});

app.get('/marketplace', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marketplace.html'));
});

app.get('/manage-listings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'service_listings_manager.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'serviceproviderlogin.html'));
});

app.get('/fixmo-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fixmo_login.html'));
});

app.get('/fixmo-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fixmo_register.html'));
});

app.get('/fixmo-provider-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fixmo_provider_register.html'));
});

app.get('/fixmo-forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fixmo_forgot_password.html'));
});

app.get('/location-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'location-test.html'));
});

app.get('/availability', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'availability_test.html'));
});

app.get('/customer-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer-dashboard.html'));
});

app.get('/provider-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'provider-dashboard.html'));
});



app.use('/auth', testRoutes); // Test routes
app.use('/auth', authCustomerRoutes); // Mount customer routes first
app.use('/auth', serviceProviderRoutes); // Mount service provider routes 
app.use('/auth', adminRoute); // Mount admin routes
app.use('/api/serviceProvider', serviceProviderRoutes); // Mount service provider routes for API access
app.use('/api/services', serviceRoutes); // Mount service management routes
app.use('/api/certificates', certificateRoutes); // Mount certificate management routes
app.use('/api/availability', availabilityRoutes); // Mount availability management routes
app.use('/api/appointments', appointmentRoutes); // Mount appointment management routes

// app.use('/users', usersRouter); // Uncomment if usersRouter is defined

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
