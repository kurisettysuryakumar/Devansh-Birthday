import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { createWish, listWishes } from "../controllers/wishController.js";

const router = Router();

router.route("/").get(asyncHandler(listWishes)).post(asyncHandler(createWish));

export default router;
