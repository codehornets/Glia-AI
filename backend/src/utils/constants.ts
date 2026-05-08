/**
 * Centralized constants for the SYNQ backend.
 */

export const VALID_PLATFORMS = [
  "claude",
  "chatgpt",
  "gemini",
  "deepseek",
  "grok",
  "copilot",
  "mistral",
  "mcp"
] as const;

export type Platform = typeof VALID_PLATFORMS[number];
