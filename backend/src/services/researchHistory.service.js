const supabase = require("../config/supabase");

async function getResearchHistoryService(userId) {
  const { data, error } = await supabase
    .from("research_queries")
    .select("id, niche, platform, audience, response_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw error;
  }

  return data || [];
}

module.exports = {
  getResearchHistoryService,
};
