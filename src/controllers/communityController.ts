// src/controllers/communityController.ts
import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/supabaseClient";
import { NotificationService } from "../services/NotificationService";
import { AuthRequest } from "../middleware/auth";

// =============================
// POSTS
// =============================
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

    await NotificationService.sendToEstate(estateId, {
      title: "New Community Post",
      message: `${req.user!.username} posted: ${title}`,
      type: "community",
      payload: { post_id: data.id },
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

export async function getPostById(req: AuthRequest, res: Response) {
  const postId = req.params.postId;
  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function updatePost(req: AuthRequest, res: Response) {
  const postId = req.params.postId;
  const userId = req.user!.id;
  const { title, content, media, poll } = req.body;

  const { data: existingPost, error: fetchError } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (fetchError || !existingPost)
    return res.status(404).json({ error: "Post not found" });

  if (existingPost.user_id !== userId)
    return res.status(403).json({ error: "Unauthorized" });

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .update({ title, content, media, poll, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function deletePost(req: AuthRequest, res: Response) {
  const postId = req.params.postId;
  const userId = req.user!.id;

  const { data: existingPost, error: fetchError } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (fetchError || !existingPost)
    return res.status(404).json({ error: "Post not found" });

  if (existingPost.user_id !== userId)
    return res.status(403).json({ error: "Unauthorized" });

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", postId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// =============================
// COMMENTS
// =============================
export async function createComment(req: AuthRequest, res: Response) {
  const postId = req.params.postId;
  const { content, parent_comment_id } = req.body;
  const userId = req.user!.id;

  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const { data, error } = await supabaseAdmin
      .from("community_comments")
      .insert([{ post_id: postId, content, parent_comment_id: parent_comment_id || null, user_id: userId }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const { data: post } = await supabaseAdmin
      .from("community_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (post && post.user_id !== userId) {
      await NotificationService.sendToUser(post.user_id, {
        title: "New Comment",
        message: `${req.user!.username} commented on your post`,
        type: "community",
        payload: { post_id: postId, comment_id: data.id },
      });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCommentsForPost(req: AuthRequest, res: Response) {
  const postId = req.params.postId;

  const { data, error } = await supabaseAdmin
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function updateComment(req: AuthRequest, res: Response) {
  const commentId = req.params.commentId;
  const userId = req.user!.id;
  const { content } = req.body;

  const { data: comment, error: fetchError } = await supabaseAdmin
    .from("community_comments")
    .select("*")
    .eq("id", commentId)
    .single();

  if (fetchError || !comment)
    return res.status(404).json({ error: "Comment not found" });

  if (comment.user_id !== userId)
    return res.status(403).json({ error: "Unauthorized" });

  const { data, error } = await supabaseAdmin
    .from("community_comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function deleteComment(req: AuthRequest, res: Response) {
  const commentId = req.params.commentId;
  const userId = req.user!.id;

  const { data: comment, error: fetchError } = await supabaseAdmin
    .from("community_comments")
    .select("*")
    .eq("id", commentId)
    .single();

  if (fetchError || !comment)
    return res.status(404).json({ error: "Comment not found" });

  if (comment.user_id !== userId)
    return res.status(403).json({ error: "Unauthorized" });

  const { data, error } = await supabaseAdmin
    .from("community_comments")
    .delete()
    .eq("id", commentId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// =============================
// REACTIONS
// =============================
export async function reactToPost(req: AuthRequest, res: Response) {
  const postId = req.params.postId;
  const userId = req.user!.id;
  const { type } = req.body;

  if (!type || typeof type !== "string")
    return res.status(400).json({ error: "Reaction type is required" });

  try {
    const reaction = { post_id: postId, user_id: userId, type };
    const { data, error } = await supabaseAdmin
      .from("community_reactions")
      .upsert([reaction], { onConflict: ["post_id", "user_id"] })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function reactToComment(req: AuthRequest, res: Response) {
  const commentId = req.params.commentId;
  const userId = req.user!.id;
  const { type } = req.body;

  if (!type || typeof type !== "string")
    return res.status(400).json({ error: "Reaction type is required" });

  try {
    const reaction = { comment_id: commentId, user_id: userId, type };
    const { data, error } = await supabaseAdmin
      .from("community_reactions")
      .upsert([reaction], { onConflict: ["comment_id", "user_id"] })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// =============================
// POLL VOTE
// =============================
export async function votePoll(req: AuthRequest, res: Response) {
  const postId = req.params.postId;
  const { option } = req.body;
  const userId = req.user!.id;

  const { data: post, error: fetchError } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (fetchError || !post) return res.status(404).json({ error: "Post not found" });

  if (!post.poll || !post.poll.options) return res.status(400).json({ error: "No poll found" });

  const poll = post.poll;
  const optionIndex = poll.options.findIndex((o: any) => o.option === option);

  if (optionIndex === -1) return res.status(400).json({ error: "Invalid option" });

  poll.options[optionIndex].votes += 1;

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .update({ poll, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}
