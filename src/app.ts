import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import rootRouter from "./routes/index.routes";
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], 
    allowedHeaders: ["Content-Type", "Authorization"], 
    credentials: true, 
  })
);

app.use("/api/v1", rootRouter);
export { app };
