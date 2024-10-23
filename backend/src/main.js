import express from "express";
import cors from "cors";
import ruleRoutes from "./routes/ruleRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", ruleRoutes);

export { app };