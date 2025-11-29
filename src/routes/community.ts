// src/routes/community.ts
import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import * as CommunityCtrl from "../controllers/communityController";

const router = Router();

// POSTS
router.post("/post", requireAuth, CommunityCtrl.createPost);
router.get("/posts/estate/:estateId", requireAuth, CommunityCtrl.getPostsForEstate);
router.get("/post/:postId", requireAuth, CommunityCtrl.getPostById);
router.put("/post/:postId", requireAuth, CommunityCtrl.updatePost);
router.delete("/post/:postId", requireAuth, CommunityCtrl.deletePost);

// COMMENTS
router.post("/post/:postId/comment", requireAuth, CommunityCtrl.createComment);
router.get("/post/:postId/comments", requireAuth, CommunityCtrl.getCommentsForPost);
router.put("/comment/:commentId", requireAuth, CommunityCtrl.updateComment);
router.delete("/comment/:commentId", requireAuth, CommunityCtrl.deleteComment);

// REACTIONS
router.post("/post/:postId/react", requireAuth, CommunityCtrl.reactToPost);
router.post("/comment/:commentId/react", requireAuth, CommunityCtrl.reactToComment);

export default router;
