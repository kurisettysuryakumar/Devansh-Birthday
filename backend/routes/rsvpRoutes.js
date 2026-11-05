import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { createRsvp, listRsvps } from "../controllers/rsvpController.js";

const router = Router();

router.route("/").get(asyncHandler(listRsvps)).post(asyncHandler(createRsvp));

export default router;
