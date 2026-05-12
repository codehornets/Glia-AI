import { getSqlite } from "./sqlite";
import { IVectorStore, RetrievedChunk } from "./storage.types";
import { WindowChunk } from "./chunker";
import { generateEmbedding, generateEmbeddings } from "./embeddings";
import { logger } from "../utils/logger";

// sqlite-vec returns raw L2 Euclidean distance (range ~10–30 for 768-dim nomic-embed-text).
// Convert to 0–1 similarity with exponential decay: exp(-d/20)
// distance=12 → 0.55, distance=17 → 0.43, distance=24 → 0.30
const l2ToScore = (distance: number) => Math.exp(-distance / 20);

const SESSION_THRESHOLD = 0.45;  // ~distance ≤ 16 — filters clearly unrelated content
const GLOBAL_THRESHOLD  = 0.40;  // ~distance ≤ 18 — stricter for cross-session to avoid noise

export class SqliteVectorStore implements IVectorStore {
  private db = getSqlite();

  async storeChunks(chunks: WindowChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const sessionId = chunks[0].sessionId;
    await this.deleteChunksBySession(sessionId);

    const contents = chunks.map(c => c.content);
    const embeddings = await generateEmbeddings(contents);

    const insertVec = this.db.prepare("INSERT INTO vec_chunks (chunk_id, embedding) VALUES (?, ?)");
    const insertMeta = this.db.prepare("INSERT INTO chunk_metadata (chunk_id, sessionId, chunkIndex, content) VALUES (?, ?, ?, ?)");

    const transaction = this.db.transaction((items: { chunk: WindowChunk, embedding: number[] }[]) => {
      for (const item of items) {
        const vector = Buffer.from(new Float32Array(item.embedding).buffer);
        insertVec.run(item.chunk.id, vector);
        insertMeta.run(item.chunk.id, item.chunk.sessionId, item.chunk.chunkIndex, item.chunk.content);
      }
    });

    transaction(chunks.map((c, i) => ({ chunk: c, embedding: embeddings[i] })));
    logger.success(`Stored ${chunks.length} chunks in SQLite-vec`);
  }

  async retrieveRelevantChunks(query: string, sessionId: string, topN = 3): Promise<RetrievedChunk[]> {
    const queryEmbedding = await generateEmbedding(query);
    const vector = Buffer.from(new Float32Array(queryEmbedding).buffer);

    // sqlite-vec evaluates `k` BEFORE the JOIN/WHERE filters, so we must
    // fetch a large global pool first, then let the sessionId filter narrow it.
    // Using topN * 2 (=6) caused misses as the DB grew with multiple sessions.
    const K_POOL = 400;
    const rows = this.db.prepare(`
      SELECT 
        m.content,
        m.chunkIndex,
        v.distance,
        s.updatedAt,
        s.createdAt
      FROM vec_chunks v
      JOIN chunk_metadata m ON v.chunk_id = m.chunk_id
      JOIN sessions s ON m.sessionId = s.id
      WHERE v.embedding MATCH ? 
        AND m.sessionId = ?
        AND k = ?
    `).all(vector, sessionId, K_POOL) as any[];

    return rows
      .map(row => {
        const semanticScore = l2ToScore(row.distance);
        const lastUpdate = new Date(row.updatedAt || row.createdAt || new Date()).getTime();
        const daysOld = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
        const decayFactor = 1.0 - Math.min(0.3, (daysOld / 180) * 0.3);

        return {
          content: row.content,
          chunkIndex: row.chunkIndex,
          score: semanticScore * decayFactor
        };
      })
      .filter(r => r.score >= SESSION_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  async retrieveGlobalChunks(query: string, topN = 3): Promise<RetrievedChunk[]> {
    const queryEmbedding = await generateEmbedding(query);
    const vector = Buffer.from(new Float32Array(queryEmbedding).buffer);

    const K_POOL = 200; // Smaller pool for global (no session filter needed)
    const rows = this.db.prepare(`
      SELECT 
        m.content,
        m.chunkIndex,
        v.distance,
        s.updatedAt,
        s.createdAt
      FROM vec_chunks v
      JOIN chunk_metadata m ON v.chunk_id = m.chunk_id
      JOIN sessions s ON m.sessionId = s.id
      WHERE v.embedding MATCH ? 
        AND k = ?
    `).all(vector, K_POOL) as any[];

    return rows
      .map(row => {
        const semanticScore = l2ToScore(row.distance);
        const lastUpdate = new Date(row.updatedAt || row.createdAt || new Date()).getTime();
        const daysOld = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
        const decayFactor = 1.0 - Math.min(0.3, (daysOld / 180) * 0.3);

        return {
          content: row.content,
          chunkIndex: row.chunkIndex,
          score: semanticScore * decayFactor
        };
      })
      .filter(r => r.score >= GLOBAL_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  async deleteChunksBySession(sessionId: string): Promise<void> {
    // Cascading delete should handle vec_chunks if setup, but better safe
    this.db.prepare("DELETE FROM chunk_metadata WHERE sessionId = ?").run(sessionId);
    // Note: Since vec_chunks is a virtual table, it might not support cascading deletes 
    // from a regular table in all versions. We clean it up manually based on orphaned IDs.
    this.db.prepare(`
      DELETE FROM vec_chunks 
      WHERE chunk_id NOT IN (SELECT chunk_id FROM chunk_metadata)
    `).run();
  }
}
