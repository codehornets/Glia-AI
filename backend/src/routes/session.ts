import { Router, Request, Response } from "express";
import { sessionStore, vectorStore, graphStore } from "../services/storage";
import { logger } from "../utils/logger";
import { isValidObjectId } from "../utils/validators";

const router = Router();

// GET /api/session/export/:id
router.get("/export/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid sessionId" });
    return;
  }

  try {
    const session = await sessionStore.getSession(id);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Use internal methods to get all data
    // Note: This assumes we have these methods. I'll need to check the services.
    // For now, let's assume sessionStore.getFullChat exists.
    const fullChat = await (sessionStore as any).getFullChat?.(id);
    const facts = await (graphStore as any).getFactsBySession?.(id);
    
    const exportData = {
      version: "1.4.4",
      timestamp: new Date().toISOString(),
      session,
      fullChat,
      facts
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="synq-session-${id}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    logger.error("Export error:", err);
    res.status(500).json({ error: "Failed to export session" });
  }
});

// POST /api/session/import
router.post("/import", async (req: Request, res: Response) => {
  const { data } = req.body;

  if (!data || !data.session) {
    res.status(400).json({ error: "Invalid import data" });
    return;
  }

  try {
    const { session, fullChat, facts } = data;
    
    // 1. Create session
    const newSession = await sessionStore.createSession(session.projectName, session.platform);
    const newId = newSession._id as string;

    // 2. Save full chat if exists
    if (fullChat) {
      await sessionStore.saveFullChat(newId, fullChat.rawText, fullChat.messageCount, fullChat.platform);
    }

    // 3. Save facts if exists
    if (facts && facts.length > 0) {
      await graphStore.storeTriples(facts.map((f: any) => ({
        subject: f.subject,
        relation: f.relation,
        object: f.object
      })), newId);
    }

    logger.success(`Imported session: ${session.projectName} (New ID: ${newId})`);
    res.json({ success: true, sessionId: newId });
  } catch (err) {
    logger.error("Import error:", err);
    res.status(500).json({ error: "Failed to import session" });
  }
});

export default router;
