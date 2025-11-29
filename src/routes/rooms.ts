import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as RoomsCtrl from "../controllers/roomsController";

const router = Router();

// GET ROOMS FOR A HOME
router.get("/", requireAuth, RoomsCtrl.getRooms);

// CREATE ROOM
router.post("/", requireAuth, RoomsCtrl.createRoom);

// UPDATE ROOM AI PROFILE
router.put("/ai/:roomId", requireAuth, RoomsCtrl.updateAiProfile);

// ASSIGN USER TO ROOM
router.post("/assign", requireAuth, RoomsCtrl.assignUserToRoom);

export default router;
