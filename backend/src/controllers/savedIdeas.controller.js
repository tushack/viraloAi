const {
  createSavedIdeaService,
  getSavedIdeasService,
  deleteSavedIdeaService,
} = require("../services/savedIdeas.service");

const { logActivitySafe } = require("../services/activityLog.service");

async function createSavedIdea(req, res) {
  try {
    const { type, content, platform, niche } = req.body;

    if (!type || !content) {
      return res.status(400).json({
        message: "Type and content are required",
      });
    }

    const data = await createSavedIdeaService({
      userId: req.user.uid,
      type,
      content,
      platform,
      niche,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "saved_idea.created",
      module: "saved_ideas",
      entityId: data.id,
      metadata: {
        type: data.type,
        niche: data.niche || "",
        platform: data.platform || "",
      },
      req,
    });

    return res.status(201).json(data);
  } catch (error) {
    console.error("Create saved idea error:", error);
    return res.status(500).json({
      message: "Failed to save idea",
    });
  }
}

async function getSavedIdeas(req, res) {
  try {
    const data = await getSavedIdeasService(req.user.uid);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Get saved ideas error:", error);
    return res.status(500).json({
      message: "Failed to fetch saved ideas",
    });
  }
}

async function deleteSavedIdea(req, res) {
  try {
    const { id } = req.params;

    await deleteSavedIdeaService({
      id,
      userId: req.user.uid,
    });

    await logActivitySafe({
      userId: req.user.uid,
      userEmail: req.user.email,
      eventType: "saved_idea.deleted",
      module: "saved_ideas",
      entityId: id,
      req,
    });

    return res.status(200).json({
      message: "Idea deleted successfully",
    });
  } catch (error) {
    console.error("Delete saved idea error:", error);
    return res.status(500).json({
      message: "Failed to delete idea",
    });
  }
}

module.exports = {
  createSavedIdea,
  getSavedIdeas,
  deleteSavedIdea,
};
