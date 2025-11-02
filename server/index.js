import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
const port = process.env.PORT || 8787

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Configure CORS with explicit origin and headers
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://free-gpt-nine.vercel.app',
  'https://freegpt-aq6w.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.warn('OPENAI_API_KEY not set. Set it in server/.env')
}
const client = new OpenAI({ apiKey })

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/chat', upload.single('image'), async (req, res) => {
  try {
    console.log('Received chat request with body:', req.body);
    
    const { message = '', messages = [] } = req.body;
    let imagePath = null;
    
    // Handle file upload if present
    if (req.file) {
      console.log('Processing uploaded file:', req.file);
      imagePath = req.file.path;
    }

    // Prepare messages for the API
    const apiMessages = [
      { role: 'system', content: 'Je bent een behulpzame assistent.' }
    ];

    // Add previous messages
    if (Array.isArray(messages)) {
      messages.forEach(msg => {
        if (msg.role && msg.content) {
          apiMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // Add current message with image if available
    const currentMessage = { 
      role: 'user', 
      content: message 
    };

    if (req.file) {
      try {
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
        currentMessage.content = [
          { type: 'text', text: message },
          {
            type: 'image_url',
            image_url: {
              url: `data:${req.file.mimetype};base64,${imageBase64}`
            }
          }
        ];
      } catch (fileError) {
        console.error('Error reading image file:', fileError);
        throw new Error('Kon de afbeelding niet verwerken');
      }
    }
    
    apiMessages.push(currentMessage);

    console.log('Sending to OpenAI:', JSON.stringify(apiMessages, null, 2));

    // Call the Vision API with the latest model
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: apiMessages,
      max_tokens: 1000,
    });

    // Clean up the uploaded file
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    const text = response.choices[0]?.message?.content || 'Geen antwoord ontvangen';
    console.log('Received response from OpenAI:', text.substring(0, 100) + '...');
    
    res.json({ reply: text });
  } catch (err) {
    console.error('Error in /api/chat:', err);
    
    // Clean up file if there was an error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Er is een fout opgetreden',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
})

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on http://localhost:${port}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set!');
})
