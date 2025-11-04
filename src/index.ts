import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; 

import movieRouter from './routes/movie.routes';
import genreRouter from './routes/genre.routes';
import countryRouter from './routes/country.routes';

dotenv.config(); 

const app = express();
const port = process.env.PORT || 5000; 


app.use(cors()); 
app.use(express.json()); 

app.use('/api/movies', movieRouter);
app.use('/api/genres', genreRouter);
app.use('/api/countries', countryRouter);
app.get('/api', (req, res) => {
  res.send('Movix BE is running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`); //
});