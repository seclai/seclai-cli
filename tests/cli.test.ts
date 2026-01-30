import { describe, expect, test, vi, beforeEach } from "vitest";
import { PassThrough } from "node:stream";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type SeclaiMock = {
  opts: unknown;
  listSources: ReturnType<typeof vi.fn>;
  uploadFileToSource: ReturnType<typeof vi.fn>;
  uploadFileToContent: ReturnType<typeof vi.fn>;

  runAgent: ReturnType<typeof vi.fn>;
  runStreamingAgentAndWait: ReturnType<typeof vi.fn>;
  listAgentRuns: ReturnType<typeof vi.fn>;
  getAgentRun: ReturnType<typeof vi.fn>;
  deleteAgentRun: ReturnType<typeof vi.fn>;

  getContentDetail: ReturnType<typeof vi.fn>;
  deleteContent: ReturnType<typeof vi.fn>;
  listContentEmbeddings: ReturnType<typeof vi.fn>;
};

const mockState = vi.hoisted(() => {
  return {
    instances: [] as SeclaiMock[],
    lastCtorArgs: undefined as unknown,
    nextListSourcesError: undefined as unknown,
  };
});

vi.mock("@seclai/sdk", () => {
  class SeclaiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SeclaiError";
    }
  }

  class SeclaiConfigurationError extends SeclaiError {
    constructor(message: string) {
      super(message);
      this.name = "SeclaiConfigurationError";
    }
  }

  class SeclaiAPIStatusError extends SeclaiError {
    public readonly statusCode: number;
    public readonly method: string;
    public readonly url: string;
    public readonly responseText: string | undefined;

    constructor(opts: {
      message: string;
      statusCode: number;
      method: string;
      url: string;
      responseText: string | undefined;
    }) {
      super(opts.message);
      this.name = "SeclaiAPIStatusError";
      this.statusCode = opts.statusCode;
      this.method = opts.method;
      this.url = opts.url;
      this.responseText = opts.responseText;
    }
  }

  class SeclaiAPIValidationError extends SeclaiAPIStatusError {
    public readonly validationError: unknown;
    constructor(opts: {
      message: string;
      statusCode: number;
      method: string;
      url: string;
      responseText: string | undefined;
      validationError: unknown;
    }) {
      super(opts);
      this.name = "SeclaiAPIValidationError";
      this.validationError = opts.validationError;
    }
  }

  class Seclai {
    public readonly opts: unknown;

    constructor(opts: any = {}) {
      mockState.lastCtorArgs = opts;
      mockState.instances.push(this as unknown as SeclaiMock);

      const envKey = (globalThis as any).process?.env?.SECLAI_API_KEY;
      if (!opts.apiKey && !envKey) {
        throw new SeclaiConfigurationError("Missing API key");
      }

      this.opts = opts;
    }

    listSources = vi.fn<[any?], Promise<any>>(async (_opts?: any) => {
      if (mockState.nextListSourcesError) {
        const err = mockState.nextListSourcesError;
        mockState.nextListSourcesError = undefined;
        throw err;
      }
      return { data: [], pagination: { page: 1, limit: 20, total: 0 } };
    });
    uploadFileToSource = vi.fn<[string, any], Promise<any>>(async (_id: string, _opts: any) => ({ ok: true }));
    uploadFileToContent = vi.fn<[string, any], Promise<any>>(async (_id: string, _opts: any) => ({ ok: true }));

    runAgent = vi.fn<[string, any], Promise<any>>(async (_agentId: string, _body: any) => ({ ok: true }));
    runStreamingAgentAndWait = vi.fn<[string, any, any?], Promise<any>>(
      async (_agentId: string, _body: any, _opts?: any) => ({ ok: true })
    );
    listAgentRuns = vi.fn<[string, any?], Promise<any>>(async (_agentId: string, _opts?: any) => ({ ok: true }));
    getAgentRun = vi.fn<any[], Promise<any>>(async (..._args: any[]) => ({ ok: true }));
    deleteAgentRun = vi.fn<any[], Promise<any>>(async (..._args: any[]) => ({ ok: true }));

    getContentDetail = vi.fn<[string, any?], Promise<any>>(async (_id: string, _opts?: any) => ({ ok: true }));
    deleteContent = vi.fn<[string], Promise<void>>(async (_id: string) => undefined);
    listContentEmbeddings = vi.fn<[string, any?], Promise<any>>(async (_id: string, _opts?: any) => ({ ok: true }));
  }

  return {
    Seclai,
    SeclaiError,
    SeclaiConfigurationError,
    SeclaiAPIStatusError,
    SeclaiAPIValidationError,
  };
});

async function importCli() {
  // Import after mocks are set up
  return await import("../src/cli");
}

function makeRuntime() {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const stdin = new PassThrough();
  stdin.end();

  let exitCode: number | undefined;

  return {
    rt: {
      stdin,
      writeOut: (t: string) => stdoutChunks.push(t),
      writeErr: (t: string) => stderrChunks.push(t),
      setExitCode: (c: number) => {
        exitCode = c;
      },
    },
    get stdout() {
      return stdoutChunks.join("");
    },
    get stderr() {
      return stderrChunks.join("");
    },
    get exitCode() {
      return exitCode ?? 0;
    },
  };
}

beforeEach(() => {
  mockState.instances.length = 0;
  mockState.lastCtorArgs = undefined;
  mockState.nextListSourcesError = undefined;
});

describe("seclai CLI", () => {
  test("--version prints package version", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const pkg = await import("../package.json");
    await runCli(["node", "seclai", "--version"], io.rt);

    expect(io.exitCode).toBe(0);
    expect(io.stdout.trim()).toBe(String((pkg as any).version));
  });

  test("help includes version in description", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--help"], io.rt);

    expect(io.exitCode).toBe(0);
    expect(io.stdout).toContain("Seclai Command Line Interface (v");
    expect(io.stdout).toContain("Usage: seclai");
  });

  test("sources list calls SDK with mapped options", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      [
        "node",
        "seclai",
        "--api-key",
        "k",
        "sources",
        "list",
        "--page",
        "2",
        "--limit",
        "10",
        "--sort",
        "created_at",
        "--order",
        "asc",
        "--account-id",
        "9f3c2a7d-2d4a-4c8e-9d1d-3f7a2f1c0b5e",
      ],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    expect(mockState.instances).toHaveLength(1);
    const client = mockState.instances[0];
    expect(client.listSources).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      sort: "created_at",
      order: "asc",
      accountId: "9f3c2a7d-2d4a-4c8e-9d1d-3f7a2f1c0b5e",
    });
  });

  test("source list is an alias for sources list", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "source", "list"], io.rt);

    expect(io.exitCode).toBe(0);
    expect(mockState.instances).toHaveLength(1);
    const client = mockState.instances[0];
    expect(client.listSources).toHaveBeenCalled();
  });

  test("agents run parses JSON input", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      [
        "node",
        "seclai",
        "--api-key",
        "k",
        "agents",
        "run",
        "6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d",
        "--json",
        '{"query":"hello"}',
      ],
      io.rt
    );

    const client = mockState.instances[0];
    expect(client.runAgent).toHaveBeenCalledWith(
      "6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d",
      { query: "hello" }
    );
  });

  test("agents run reads JSON from file", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-cli-"));
    const jsonPath = path.join(tmpDir, "run.json");
    await writeFile(jsonPath, JSON.stringify({ input: "hi" }), "utf8");

    await runCli(
      [
        "node",
        "seclai",
        "--api-key",
        "k",
        "agents",
        "run",
        "6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d",
        "--json-file",
        jsonPath,
      ],
      io.rt
    );

    const client = mockState.instances[0];
    expect(client.runAgent).toHaveBeenCalledWith(
      "6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d",
      { input: "hi" }
    );
  });

  test("agents run --stream uses streaming endpoint and waits", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      [
        "node",
        "seclai",
        "--api-key",
        "k",
        "agents",
        "run",
        "6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d",
        "--stream",
        "--timeout-ms",
        "1234",
        "--json",
        '{"input":"hello","metadata":{}}',
      ],
      io.rt
    );

    const client = mockState.instances[0];
    expect(client.runStreamingAgentAndWait).toHaveBeenCalledWith(
      "6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d",
      { input: "hello", metadata: {} },
      { timeoutMs: 1234 }
    );
  });

  test("runs get calls SDK with run id", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "runs", "get", "run_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getAgentRun).toHaveBeenCalledWith("run_1", undefined);
  });

  test("runs get --include-step-outputs passes option", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "runs", "get", "run_1", "--include-step-outputs"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getAgentRun).toHaveBeenCalledWith("run_1", { includeStepOutputs: true });
  });

  test("runs delete cancels by run id", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "runs", "delete", "run_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.deleteAgentRun).toHaveBeenCalledWith("run_1");
  });

  test("sources upload reads file and passes bytes", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-cli-"));
    const filePath = path.join(tmpDir, "hello.txt");
    await writeFile(filePath, "hello", "utf8");

    await runCli(
      [
        "node",
        "seclai",
        "--api-key",
        "k",
        "sources",
        "upload",
        "2b1f0f3a-1d2c-4b5a-8e9f-0a1b2c3d4e5f",
        "--file",
        filePath,
        "--title",
        "Notes",
        "--metadata",
        '{"category":"docs","author":"Ada"}',
        "--file-name",
        "hello.txt",
        "--mime-type",
        "text/plain",
      ],
      io.rt
    );

    const client = mockState.instances[0];
    expect(client.uploadFileToSource).toHaveBeenCalled();
    const [id, opts] = client.uploadFileToSource.mock.calls[0];
    expect(id).toBe("2b1f0f3a-1d2c-4b5a-8e9f-0a1b2c3d4e5f");
    expect(opts.title).toBe("Notes");
    expect(opts.metadata).toEqual({ category: "docs", author: "Ada" });
    expect(opts.fileName).toBe("hello.txt");
    expect(opts.mimeType).toBe("text/plain");
    expect(opts.file).toBeInstanceOf(Uint8Array);
    expect((opts.file as Uint8Array).length).toBeGreaterThan(0);
  });

  test("contents upload reads file and calls uploadFileToContent", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-cli-"));
    const filePath = path.join(tmpDir, "updated.pdf");
    await writeFile(filePath, "%PDF-1.4", "utf8");

    await runCli(
      [
        "node",
        "seclai",
        "--api-key",
        "k",
        "contents",
        "upload",
        "sc_cv_123",
        "--file",
        filePath,
        "--metadata",
        '{"revision":2}',
        "--file-name",
        "updated.pdf",
        "--mime-type",
        "application/pdf",
      ],
      io.rt
    );

    const client = mockState.instances[0];
    expect(client.uploadFileToContent).toHaveBeenCalled();
    const [id, opts] = client.uploadFileToContent.mock.calls[0];
    expect(id).toBe("sc_cv_123");
    expect(opts.metadata).toEqual({ revision: 2 });
    expect(opts.fileName).toBe("updated.pdf");
    expect(opts.mimeType).toBe("application/pdf");
    expect(opts.file).toBeInstanceOf(Uint8Array);
    expect((opts.file as Uint8Array).length).toBeGreaterThan(0);
  });

  test("missing api key produces configuration error and exit code 1", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const p = (globalThis as any).process;
    const prev = p?.env?.SECLAI_API_KEY;
    if (p?.env) delete p.env.SECLAI_API_KEY;

    await runCli(["node", "seclai", "sources", "list"], io.rt);

    expect(io.exitCode).toBe(1);
    expect(io.stderr).toContain("SeclaiConfigurationError");

    if (p?.env) {
      if (prev === undefined) delete p.env.SECLAI_API_KEY;
      else p.env.SECLAI_API_KEY = prev;
    }
  });

  test("API status errors are printed with status and url", async () => {
    const { runCli } = await importCli();

    const sdk = await import("@seclai/sdk");
    mockState.nextListSourcesError = new (sdk as any).SeclaiAPIStatusError({
      message: "Unauthorized",
      statusCode: 401,
      method: "GET",
      url: "https://example.invalid/api/sources/",
      responseText: "nope",
    });

    const io2 = makeRuntime();
    await runCli(["node", "seclai", "--api-key", "k", "sources", "list"], io2.rt);

    expect(io2.exitCode).toBe(1);
    expect(io2.stderr).toContain("SeclaiAPIStatusError");
    expect(io2.stderr).toContain("status: 401");
    expect(io2.stderr).toContain("url: https://example.invalid/api/sources/");
  });
});
