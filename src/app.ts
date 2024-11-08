import express from "express";
import mongoose from "mongoose";
import dotenv from 'dotenv';
import { Request, Response, NextFunction, Errback } from "express";
import cors from "cors"

import adminAuthRoute from "./routes/adminAuthRoute"
import regionRoute from "./routes/regionRoute"
import gradeRoute from "./routes/gradeRoute"
import subjectRoute from "./routes/subjectRoute"
import unitRoute from "./routes/unitRoute"
import lessonRoute from "./routes/lessonRoute"
import userRoute from "./routes/userRoute"
import { setupSuperAdmin } from "./config/setupSuperAdmin";

dotenv.config();

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.rj3wp52.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority&appName=Cluster0`;
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors()); // Enable CORS if needed
app.use(express.json());

app.use('/admin',adminAuthRoute); //superAdmin
app.use('/regions',regionRoute);
app.use('/grades',gradeRoute);
app.use('/subject', subjectRoute);
app.use('/unit',unitRoute)
app.use('/lesson',lessonRoute)
app.use('/user',userRoute)

// app.use('/home',homeRoute); // /home page
//app.use('/')
app.use('/', (req,res,next) => {
  res.status(200).json({message:"success"});
})


/* // Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
}); */

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    setupSuperAdmin(); 
  })
  .then(() => {
    console.log('connected to database')
    app.listen(PORT, () => {
      console.log(`server is listening on PORT ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
  });
