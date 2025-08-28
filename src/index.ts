import express from 'express';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Setup EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const db = drizzle("./database.sqlite");

app.get('/', (req, res) => {
  res.render('index', { title: 'Welcome', message: 'Hello from Express + EJS + Drizzle!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
