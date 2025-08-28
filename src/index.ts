import express from 'express';
import login from "./login";
import cookieParser from "cookie-parser";


const app = express();
const port = process.env.PORT || 3000;

// Setup EJS
app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(cookieParser());
app.use(login());

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
