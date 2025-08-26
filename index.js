import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import { connectToDB } from './database/db.js'
import router from './routes/index.js'
import cors from 'cors'
import morgan from 'morgan'
import errorMiddleware from './middlewares/errorMiddleware.js'


const app = express()
const server = http.createServer(app)
const io = setupChatServer(server)
const port = process.env.PORT

app.use(helmet())
app.use(morgan('tiny'))



app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use(cors())

// routes
router(app)

app.get('/', (req, res) => {
  res.json({success: true, message: 'Backend Connected Successfully'})
})


app.use(errorMiddleware);

app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Oops! Request not found. Cannot ${req.method} ${req.originalUrl}`,
  });
});

//cron jobs








// connect to database
connectToDB()


server.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

