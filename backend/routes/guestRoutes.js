import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { createGuest, deleteGuest, listGuests, updateGuest } from "../controllers/guestController.js";

const router = Router();

router.route("/").get(asyncHandler(listGuests)).post(asyncHandler(createGuest));
router.route("/:id").put(asyncHandler(updateGuest)).delete(asyncHandler(deleteGuest));

export default router;
