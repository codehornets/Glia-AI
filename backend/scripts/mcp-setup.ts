
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "../src/utils/logger";

async function setupMcp() {
  const isWindows = process.platform === "win32";
  const claudeConfigPath = isWindows
    ? path.join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json")
    : path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");

  const serverPath = path.resolve(__dirname, "../dist/mcp/server.js");
  
  // Ensure the server is built
  if (!fs.existsSync(serverPath)) {
    logger.warn("MCP Server not built yet. Run 'npm run build' in the backend folder first.");
    return;
  }

  if (!fs.existsSync(claudeConfigPath)) {
    logger.info(`Claude Desktop config not found at ${claudeConfigPath}. Skipping auto-setup.`);
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
    if (!config.mcpServers) config.mcpServers = {};

    config.mcpServers.glia = {
      command: "node",
      args: [serverPath]
    };

    fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
    logger.success("Claude Desktop MCP configuration updated successfully!");
    logger.info(`Glia Memory is now active in Claude Desktop using: ${serverPath}`);
  } catch (err: any) {
    logger.error(`Failed to update Claude config: ${err.message}`);
  }
}

setupMcp();
