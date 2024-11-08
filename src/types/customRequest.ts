// src/types/CustomRequest.ts
import { Request } from "express";
import mongoose from "mongoose";

export interface CustomRequest extends Request {
  user?: {
    id: mongoose.Schema.Types.ObjectId;
    name: string;
    role: string;
    region: mongoose.Schema.Types.ObjectId | null | undefined;
    grade: mongoose.Schema.Types.ObjectId | null | undefined;
  };
}

export interface UserCustomRequest extends Request {
  user?: {
    id: mongoose.Schema.Types.ObjectId;
    region: mongoose.Schema.Types.ObjectId | null | undefined;
    defaultChild: mongoose.Schema.Types.ObjectId | null | undefined;
  };
}
