const supabase = require("../config/supabase");

async function createSavedIdeaService(payload) {
  const { userId, type, content, platform, niche } = payload;

  const { data, error } = await supabase
    .from("saved_ideas")
    .insert({
      user_id: userId,
      type,
      content,
      platform,
      niche,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getSavedIdeasService(userId) {
  const { data, error } = await supabase
    .from("saved_ideas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function deleteSavedIdeaService({ id, userId }) {
  const { error } = await supabase
    .from("saved_ideas")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return true;
}

module.exports = {
  createSavedIdeaService,
  getSavedIdeasService,
  deleteSavedIdeaService,
};