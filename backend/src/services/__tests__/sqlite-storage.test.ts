import { SqliteSessionStore } from "../sqlite-session";
import { SqliteGraphStore } from "../sqlite-graph";
import { SqliteVectorStore } from "../sqlite-vector";
import { initSqlite, getSqlite } from "../sqlite";
import * as embeddings from "../embeddings";

// Mock uuid to avoid ESM issues
jest.mock("uuid", () => ({
  v4: () => "test-uuid-123"
}));

// Mock the embeddings service to avoid external API calls
jest.mock("../embeddings", () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0.1)),
  generateEmbeddings: jest.fn().mockResolvedValue([new Array(384).fill(0.1)])
}));

describe("SQLite Storage Layer", () => {
  let db: any;

  beforeAll(() => {
    // Force in-memory DB for tests
    process.env.SQLITE_DB_PATH = ":memory:";
    initSqlite();
    db = getSqlite();
  });

  describe("SqliteSessionStore", () => {
    const store = new SqliteSessionStore();
    let sessionId: string;

    it("should create a new session", async () => {
      const session = await store.createSession("Test Project", "chrome");
      expect(session.projectName).toBe("Test Project");
      expect(session._id).toBeDefined();
      sessionId = session._id;
    });

    it("should retrieve sessions", async () => {
      const sessions = await store.getSessions();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].projectName).toBe("Test Project");
    });

    it("should handle active session state", async () => {
      await store.setActiveSessionId(sessionId);
      const active = await store.getActiveSessionId();
      expect(active).toBe(sessionId);
    });
  });

  describe("SqliteGraphStore", () => {
    const store = new SqliteGraphStore();
    const testSession = "test-session-123";

    it("should save and retrieve triples", async () => {
      const triple = {
        subject: "Noob",
        subjectType: "Person",
        relation: "OWNS",
        object: "SplitSmart",
        objectType: "Project",
        sessionId: testSession,
        timestamp: new Date().toISOString()
      };

      await store.saveTriple(triple);
      const triples = await store.getTriplesBySession(testSession);
      expect(triples).toHaveLength(1);
      expect(triples[0].subject).toBe("Noob");
    });

    it("should find related triples by entities", async () => {
      const related = await store.findRelatedTriples(["Noob"], testSession);
      expect(related).toHaveLength(1);
      expect(related[0].object).toBe("SplitSmart");
    });
  });

  describe("SqliteVectorStore", () => {
    const store = new SqliteVectorStore();
    const testSession = "test-session-vec";

    it("should store chunks and metadata", async () => {
      const chunks = [
        {
          id: "chunk-1",
          sessionId: testSession,
          chunkIndex: 0,
          content: "Synq is a local knowledge graph tool."
        }
      ];

      await store.storeChunks(chunks as any);
      
      // Verify metadata exists
      const meta = db.prepare("SELECT * FROM chunk_metadata WHERE sessionId = ?").get(testSession);
      expect(meta.content).toContain("Synq");
    });
  });
});
