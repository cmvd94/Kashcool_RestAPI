import { Router } from "express";

import {homePage} from "../controllers/homeController"

const router = Router();

router.get('/',homePage);

export default router;