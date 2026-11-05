// Runs the real SDK, with only fetch stubbed, and inspects the multipart part
// each upload command sends. cli.test.ts mocks the SDK, so it only sees the
// options the CLI passes; these tests catch the SDK changing how it turns them
// into a request. The server types a file by its name's extension, so the name
// is what matters: it was once sent as "upload", which the server can't type.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PassThrough } from "node:stream";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCli } from "../src/cli";

type Captured = { url: string; part: File };

function makeRuntime() {
  const stdin = new PassThrough();
  stdin.end();
  const stderr: string[] = [];
  let exitCode = 0;
  return {
    rt: {
      stdin,
      writeOut: () => {},
      writeOutBytes: () => {},
      writeErr: (t: string) => stderr.push(t),
      setExitCode: (c: number) => {
        exitCode = c;
      },
    },
    get stderr() {
      return stderr.join("");
    },
    get exitCode() {
      return exitCode;
    },
  };
}

let tmpDir: string;
let captured: Captured[];
const savedEnv = { ...process.env };

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-cli-upload-"));
  captured = [];
  for (const k of Object.keys(process.env)) if (k.startsWith("SECLAI_")) delete process.env[k];
  process.env.SECLAI_API_URL = "https://api.test.invalid";
  vi.stubGlobal("fetch", async (url: URL | string, init: RequestInit) => {
    const part = (init.body as FormData).get("file");
    if (!(part instanceof File)) throw new Error("upload had no file part");
    captured.push({ url: String(url), part });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  process.env = { ...savedEnv };
  await rm(tmpDir, { recursive: true, force: true });
});

async function upload(fileName: string, ...cmd: string[]) {
  const filePath = path.join(tmpDir, fileName);
  await writeFile(filePath, "bytes", "utf8");
  const io = makeRuntime();
  await runCli(["node", "seclai", "--api-key", "k", ...cmd, "--file", filePath], io.rt);
  expect(io.stderr).toBe("");
  expect(io.exitCode).toBe(0);
  expect(captured).toHaveLength(1);
  return captured[0]!;
}

describe("upload multipart part", () => {
  test("agents upload-input sends the file's name", async () => {
    const { url, part } = await upload("photo.jpg", "agents", "upload-input", "agent_1");
    expect(url).toContain("/agents/agent_1/upload-input");
    expect(part.name).toBe("photo.jpg");
  });

  test("sources upload sends the file's name", async () => {
    const { part } = await upload("notes.md", "sources", "upload", "src_1");
    expect(part.name).toBe("notes.md");
  });

  test("contents upload sends the file's name", async () => {
    const { part } = await upload("report.pdf", "contents", "upload", "cv_1");
    expect(part.name).toBe("report.pdf");
  });

  test("an explicit --mime-type reaches the part", async () => {
    const { part } = await upload("scan.heic", "agents", "upload-input", "agent_1", "--mime-type", "image/heic");
    expect(part.name).toBe("scan.heic");
    expect(part.type).toBe("image/heic");
  });
});
