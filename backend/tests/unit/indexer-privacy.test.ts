import fs from "fs";
import os from "os";
import path from "path";
import type { WindowChunk } from "../../src/services/chunker";

const storeFileChunks = jest.fn<Promise<void>, [WindowChunk[]]>().mockResolvedValue(undefined);

jest.mock("../../src/services/storage", () => ({
  vectorStore: {
    storeFileChunks: (chunks: WindowChunk[]) => storeFileChunks(chunks),
  },
}));

jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
  },
}));

import { indexCodebase } from "../../src/services/indexer";

const fakeGithubToken = "ghp_" + "a".repeat(36);

describe("indexCodebase privacy hardening", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arcrift-indexer-"));
    storeFileChunks.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("redacts common secrets before storing indexed file chunks", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      `const token = '${fakeGithubToken}';\nconst normal = 'keep-me';\n`
    );

    await indexCodebase(tmpDir, "session-1");

    expect(storeFileChunks).toHaveBeenCalledTimes(1);
    const chunks = storeFileChunks.mock.calls[0][0];
    const indexedText = chunks.map((chunk) => chunk.content).join("\n");

    expect(indexedText).toContain("[REDACTED]");
    expect(indexedText).toContain("keep-me");
    expect(indexedText).not.toContain(fakeGithubToken);
  });

  test("skips dotenv and private-key files by default", async () => {
    fs.writeFileSync(path.join(tmpDir, ".env"), "IGNORED_CONFIG_VALUE=placeholder\n");
    fs.writeFileSync(path.join(tmpDir, "id_rsa"), "-----BEGIN PRIVATE KEY-----\nsecret\n");
    fs.writeFileSync(path.join(tmpDir, "safe.ts"), "export const ok = true;\n");

    const result = await indexCodebase(tmpDir, "session-1");

    expect(result.filesScanned).toBe(1);
    expect(result.filesSkipped).toBe(2);
    expect(storeFileChunks).toHaveBeenCalledTimes(1);

    const indexedText = storeFileChunks.mock.calls[0][0].map((chunk) => chunk.content).join("\n");
    expect(indexedText).toContain("safe.ts");
    expect(indexedText).not.toContain("IGNORED_CONFIG_VALUE");
    expect(indexedText).not.toContain("PRIVATE KEY");
  });
});
