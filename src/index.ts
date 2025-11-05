import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from './routes/auth.routes'
import movieRoutes from './routes/movie.routes';

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"], 
}));

app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/movies', movieRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
