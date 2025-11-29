// src/controllers/communityController.ts
import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/supabaseClient";
import { NotificationService } from "../services/NotificationService";

export async function createPost(req: AuthRequest, res: Response) {
  const { title, content, media, poll, estateId } = req.body;
  const userId = req.user!.id;

  try {
    const { data, error } = await supabaseAdmin
      .from("community_posts")
      .insert([{ title, content, media, poll, estate_id: estateId, user_id: userId }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Notify estate residents
    await NotificationService.sendToEstate(estateId, {
      title: "New Community Post",
      message: `${req.user!.full_name} posted: ${title}`,
      type: "community",
      payload: { postId: data.id },
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPostsForEstate(req: AuthRequest, res: Response) {
  const estateId = req.params.estateId;

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .eq("estate_id", estateId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// COMMENTS
export async function createComment(req: AuthRequest, res: Response) {
  const postId = req.params.postId;
  const { content, parent_comment_id } = req.body;
  const userId = req.user!.id;

  try {
    const { data, error } = await supabaseAdmin
      .from("community_comments")
      .insert([{ post_id: postId, content, parent_comment_id, user_id: userId }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Notify post owner
    const { data: post } = await supabaseAdmin
      .from("community_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (post && post.user_id !== userId) {
      await NotificationService.sendToUser(post.user_id, {
        title: "New Comment",
        message: `${req.user!.full_name} commented on your post`,
        type: "community",
        payload: { postId, commentId: data.id },
      });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Add other controller methods similarly (update/delete post, react, etc.)
