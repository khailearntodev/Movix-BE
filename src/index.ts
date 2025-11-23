import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import movieRouter from './routes/movie.routes';
import genreRouter from './routes/genre.routes';
import countryRouter from './routes/country.routes';
import authRoutes from './routes/auth.routes';
import userRouter from './routes/user.routes';
import interactionRoutes from './routes/interaction.routes';
import dashboardRoutes from './routes/dashboard.routes';
import homepageRouter from './routes/homepage.routes';
import commentRoutes from './routes/comment.routes';
import cookieParser from 'cookie-parser';
import personRoutes from './routes/people.routes';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"], 
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json()); 
app.use('/api/auth', authRoutes);
app.use('/api/profile', userRouter);
app.use('/api/interact', interactionRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/movies', movieRouter);
app.use('/api/genres', genreRouter);
app.use('/api/countries', countryRouter);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/homepage', homepageRouter);
app.use('/api/people',personRoutes);


app.get('/api', (req, res) => {
  res.send('Movix BE is running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});