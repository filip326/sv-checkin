import express, { urlencoded } from "express";
import login from "./login";
import cookieParser from "cookie-parser";
import dashboard from "./dashboard";

const app = express();
const port = process.env.PORT || 3000;

// Setup EJS
app.set("view engine", "ejs");

app.use(urlencoded({ extended: false }));

app.use(express.static("public"));
app.use(cookieParser());
app.use(login());
app.use(dashboard());

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
