import { describe, expect, test, vi, beforeEach, afterAll } from "vitest";
import { PassThrough } from "node:stream";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type SeclaiMock = {
  opts: unknown;
  // sources
  listSources: ReturnType<typeof vi.fn>;
  createSource: ReturnType<typeof vi.fn>;
  getSource: ReturnType<typeof vi.fn>;
  updateSource: ReturnType<typeof vi.fn>;
  deleteSource: ReturnType<typeof vi.fn>;
  uploadFileToSource: ReturnType<typeof vi.fn>;
  uploadInlineTextToSource: ReturnType<typeof vi.fn>;
  listSourceExports: ReturnType<typeof vi.fn>;
  createSourceExport: ReturnType<typeof vi.fn>;
  getSourceExport: ReturnType<typeof vi.fn>;
  cancelSourceExport: ReturnType<typeof vi.fn>;
  downloadSourceExport: ReturnType<typeof vi.fn>;
  estimateSourceExport: ReturnType<typeof vi.fn>;
  deleteSourceExport: ReturnType<typeof vi.fn>;
  getSourceEmbeddingMigration: ReturnType<typeof vi.fn>;
  startSourceEmbeddingMigration: ReturnType<typeof vi.fn>;
  cancelSourceEmbeddingMigration: ReturnType<typeof vi.fn>;
  // agents
  listAgents: ReturnType<typeof vi.fn>;
  createAgent: ReturnType<typeof vi.fn>;
  getAgent: ReturnType<typeof vi.fn>;
  updateAgent: ReturnType<typeof vi.fn>;
  deleteAgent: ReturnType<typeof vi.fn>;
  runAgent: ReturnType<typeof vi.fn>;
  runStreamingAgentAndWait: ReturnType<typeof vi.fn>;
  runStreamingAgent: ReturnType<typeof vi.fn>;
  runAgentAndPoll: ReturnType<typeof vi.fn>;
  listAgentRuns: ReturnType<typeof vi.fn>;
  getAgentRun: ReturnType<typeof vi.fn>;
  deleteAgentRun: ReturnType<typeof vi.fn>;
  cancelAgentRun: ReturnType<typeof vi.fn>;
  searchAgentRuns: ReturnType<typeof vi.fn>;
  getAgentDefinition: ReturnType<typeof vi.fn>;
  updateAgentDefinition: ReturnType<typeof vi.fn>;
  uploadAgentInput: ReturnType<typeof vi.fn>;
  getAgentInputUploadStatus: ReturnType<typeof vi.fn>;
  getAgentAttachmentReferences: ReturnType<typeof vi.fn>;
  downloadAgentRunAttachment: ReturnType<typeof vi.fn>;
  generateAgentSteps: ReturnType<typeof vi.fn>;
  generateStepConfig: ReturnType<typeof vi.fn>;
  getAgentAiConversationHistory: ReturnType<typeof vi.fn>;
  markAgentAiSuggestion: ReturnType<typeof vi.fn>;
  listRunEvaluationResults: ReturnType<typeof vi.fn>;
  disableAgent: ReturnType<typeof vi.fn>;
  enableAgent: ReturnType<typeof vi.fn>;
  getAgentCallers: ReturnType<typeof vi.fn>;
  setEmailTriggerConfig: ReturnType<typeof vi.fn>;
  // contents
  uploadFileToContent: ReturnType<typeof vi.fn>;
  getContentDetail: ReturnType<typeof vi.fn>;
  deleteContent: ReturnType<typeof vi.fn>;
  listContentEmbeddings: ReturnType<typeof vi.fn>;
  replaceContentWithInlineText: ReturnType<typeof vi.fn>;
  // kb
  listKnowledgeBases: ReturnType<typeof vi.fn>;
  createKnowledgeBase: ReturnType<typeof vi.fn>;
  getKnowledgeBase: ReturnType<typeof vi.fn>;
  updateKnowledgeBase: ReturnType<typeof vi.fn>;
  deleteKnowledgeBase: ReturnType<typeof vi.fn>;
  // memory
  listMemoryBanks: ReturnType<typeof vi.fn>;
  createMemoryBank: ReturnType<typeof vi.fn>;
  getMemoryBank: ReturnType<typeof vi.fn>;
  updateMemoryBank: ReturnType<typeof vi.fn>;
  deleteMemoryBank: ReturnType<typeof vi.fn>;
  getMemoryBankStats: ReturnType<typeof vi.fn>;
  getAgentsUsingMemoryBank: ReturnType<typeof vi.fn>;
  compactMemoryBank: ReturnType<typeof vi.fn>;
  deleteMemoryBankSource: ReturnType<typeof vi.fn>;
  listMemoryBankTemplates: ReturnType<typeof vi.fn>;
  testMemoryBankCompaction: ReturnType<typeof vi.fn>;
  testCompactionPromptStandalone: ReturnType<typeof vi.fn>;
  generateMemoryBankConfig: ReturnType<typeof vi.fn>;
  getMemoryBankAiLastConversation: ReturnType<typeof vi.fn>;
  acceptMemoryBankAiSuggestion: ReturnType<typeof vi.fn>;
  // evals
  listEvaluationCriteria: ReturnType<typeof vi.fn>;
  listEvaluationCriteriaPage: ReturnType<typeof vi.fn>;
  createEvaluationCriteria: ReturnType<typeof vi.fn>;
  getEvaluationCriteria: ReturnType<typeof vi.fn>;
  updateEvaluationCriteria: ReturnType<typeof vi.fn>;
  deleteEvaluationCriteria: ReturnType<typeof vi.fn>;
  getEvaluationCriteriaSummary: ReturnType<typeof vi.fn>;
  listEvaluationResults: ReturnType<typeof vi.fn>;
  createEvaluationResult: ReturnType<typeof vi.fn>;
  listCompatibleRuns: ReturnType<typeof vi.fn>;
  testDraftEvaluation: ReturnType<typeof vi.fn>;
  listAgentEvaluationResults: ReturnType<typeof vi.fn>;
  listEvaluationRuns: ReturnType<typeof vi.fn>;
  getNonManualEvaluationSummary: ReturnType<typeof vi.fn>;
  // solutions
  listSolutions: ReturnType<typeof vi.fn>;
  createSolution: ReturnType<typeof vi.fn>;
  getSolution: ReturnType<typeof vi.fn>;
  updateSolution: ReturnType<typeof vi.fn>;
  deleteSolution: ReturnType<typeof vi.fn>;
  linkAgentsToSolution: ReturnType<typeof vi.fn>;
  unlinkAgentsFromSolution: ReturnType<typeof vi.fn>;
  linkKnowledgeBasesToSolution: ReturnType<typeof vi.fn>;
  unlinkKnowledgeBasesFromSolution: ReturnType<typeof vi.fn>;
  linkSourceConnectionsToSolution: ReturnType<typeof vi.fn>;
  unlinkSourceConnectionsFromSolution: ReturnType<typeof vi.fn>;
  listSolutionConversations: ReturnType<typeof vi.fn>;
  addSolutionConversationTurn: ReturnType<typeof vi.fn>;
  markSolutionConversationTurn: ReturnType<typeof vi.fn>;
  generateSolutionAiPlan: ReturnType<typeof vi.fn>;
  generateSolutionAiKnowledgeBase: ReturnType<typeof vi.fn>;
  generateSolutionAiSource: ReturnType<typeof vi.fn>;
  acceptSolutionAiPlan: ReturnType<typeof vi.fn>;
  declineSolutionAiPlan: ReturnType<typeof vi.fn>;
  // governance
  generateGovernanceAiPlan: ReturnType<typeof vi.fn>;
  listGovernanceAiConversations: ReturnType<typeof vi.fn>;
  acceptGovernanceAiPlan: ReturnType<typeof vi.fn>;
  declineGovernanceAiPlan: ReturnType<typeof vi.fn>;
  // alerts
  listAlerts: ReturnType<typeof vi.fn>;
  getAlert: ReturnType<typeof vi.fn>;
  changeAlertStatus: ReturnType<typeof vi.fn>;
  addAlertComment: ReturnType<typeof vi.fn>;
  subscribeToAlert: ReturnType<typeof vi.fn>;
  unsubscribeFromAlert: ReturnType<typeof vi.fn>;
  listAlertConfigs: ReturnType<typeof vi.fn>;
  createAlertConfig: ReturnType<typeof vi.fn>;
  getAlertConfig: ReturnType<typeof vi.fn>;
  updateAlertConfig: ReturnType<typeof vi.fn>;
  deleteAlertConfig: ReturnType<typeof vi.fn>;
  listOrganizationAlertPreferences: ReturnType<typeof vi.fn>;
  updateOrganizationAlertPreference: ReturnType<typeof vi.fn>;
  // models
  listModels: ReturnType<typeof vi.fn>;
  getModel: ReturnType<typeof vi.fn>;
  listModelAlerts: ReturnType<typeof vi.fn>;
  markModelAlertRead: ReturnType<typeof vi.fn>;
  markAllModelAlertsRead: ReturnType<typeof vi.fn>;
  getUnreadModelAlertCount: ReturnType<typeof vi.fn>;
  getModelRecommendations: ReturnType<typeof vi.fn>;
  getGenerationTiers: ReturnType<typeof vi.fn>;
  listExperiments: ReturnType<typeof vi.fn>;
  createExperiment: ReturnType<typeof vi.fn>;
  getExperiment: ReturnType<typeof vi.fn>;
  cancelExperiment: ReturnType<typeof vi.fn>;
  deleteExperiment: ReturnType<typeof vi.fn>;
  // search
  search: ReturnType<typeof vi.fn>;
  searchDocs: ReturnType<typeof vi.fn>;
  // account
  getMe: ReturnType<typeof vi.fn>;
  getApiVersion: ReturnType<typeof vi.fn>;
  updateApiVersion: ReturnType<typeof vi.fn>;
  // email domains
  listEmailDomains: ReturnType<typeof vi.fn>;
  addEmailDomain: ReturnType<typeof vi.fn>;
  removeEmailDomain: ReturnType<typeof vi.fn>;
  verifyEmailDomain: ReturnType<typeof vi.fn>;
  setPrimaryEmailDomain: ReturnType<typeof vi.fn>;
  useSharedEmailDomain: ReturnType<typeof vi.fn>;
  sendEmailDomainTestEmail: ReturnType<typeof vi.fn>;
  getDmarcSummary: ReturnType<typeof vi.fn>;
  // inbound email
  listBlockedEmailSenders: ReturnType<typeof vi.fn>;
  blockEmailSender: ReturnType<typeof vi.fn>;
  unblockEmailSender: ReturnType<typeof vi.fn>;
  setAutoBlockMode: ReturnType<typeof vi.fn>;
  listInboundEmailRejections: ReturnType<typeof vi.fn>;
  getInboundEmailStatus: ReturnType<typeof vi.fn>;
  cancelQueuedEmailRuns: ReturnType<typeof vi.fn>;
  resumeInboundEmail: ReturnType<typeof vi.fn>;
  listAgentEmailOptOuts: ReturnType<typeof vi.fn>;
  removeAgentEmailOptOut: ReturnType<typeof vi.fn>;
  // ai
  submitAiFeedback: ReturnType<typeof vi.fn>;
  aiAssistantKnowledgeBase: ReturnType<typeof vi.fn>;
  aiAssistantSource: ReturnType<typeof vi.fn>;
  aiAssistantSolution: ReturnType<typeof vi.fn>;
  aiAssistantMemoryBank: ReturnType<typeof vi.fn>;
  getAiAssistantMemoryBankHistory: ReturnType<typeof vi.fn>;
  acceptAiAssistantPlan: ReturnType<typeof vi.fn>;
  declineAiAssistantPlan: ReturnType<typeof vi.fn>;
  acceptAiMemoryBankSuggestion: ReturnType<typeof vi.fn>;
};

const mockSsoFns = vi.hoisted(() => {
  return {
    loadSsoProfile: undefined as unknown as ReturnType<typeof vi.fn>,
    readSsoCache: undefined as unknown as ReturnType<typeof vi.fn>,
    writeSsoCache: undefined as unknown as ReturnType<typeof vi.fn>,
    deleteSsoCache: undefined as unknown as ReturnType<typeof vi.fn>,
    isTokenValid: undefined as unknown as ReturnType<typeof vi.fn>,
  };
});

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

    // sources
    listSources = vi.fn<[any?], Promise<any>>(async (_opts?: any) => {
      if (mockState.nextListSourcesError) {
        const err = mockState.nextListSourcesError;
        mockState.nextListSourcesError = undefined;
        throw err;
      }
      return { data: [], pagination: { page: 1, limit: 20, total: 0 } };
    });
    createSource = vi.fn(async () => ({ ok: true }));
    getSource = vi.fn(async () => ({ ok: true }));
    updateSource = vi.fn(async () => ({ ok: true }));
    deleteSource = vi.fn(async () => undefined);
    uploadFileToSource = vi.fn(async () => ({ ok: true }));
    uploadInlineTextToSource = vi.fn(async () => ({ ok: true }));
    listSourceExports = vi.fn(async () => ({ ok: true }));
    createSourceExport = vi.fn(async () => ({ ok: true }));
    getSourceExport = vi.fn(async () => ({ ok: true }));
    cancelSourceExport = vi.fn(async () => ({ ok: true }));
    downloadSourceExport = vi.fn(async () => ({ text: async () => "exported" }));
    estimateSourceExport = vi.fn(async () => ({ ok: true }));
    deleteSourceExport = vi.fn(async () => undefined);
    getSourceEmbeddingMigration = vi.fn(async () => ({ ok: true }));
    startSourceEmbeddingMigration = vi.fn(async () => ({ ok: true }));
    cancelSourceEmbeddingMigration = vi.fn(async () => ({ ok: true }));

    // agents
    listAgents = vi.fn(async () => ({ data: [] }));
    createAgent = vi.fn(async () => ({ ok: true }));
    getAgent = vi.fn(async () => ({ ok: true }));
    updateAgent = vi.fn(async () => ({ ok: true }));
    deleteAgent = vi.fn(async () => undefined);
    runAgent = vi.fn(async () => ({ ok: true }));
    runStreamingAgentAndWait = vi.fn(async () => ({ ok: true }));
    runStreamingAgent = vi.fn(async function* () { yield { type: "status", data: "done" }; });
    runAgentAndPoll = vi.fn(async () => ({ ok: true }));
    listAgentRuns = vi.fn(async () => ({ ok: true }));
    getAgentRun = vi.fn(async () => ({ ok: true }));
    deleteAgentRun = vi.fn(async () => undefined);
    cancelAgentRun = vi.fn(async () => ({ ok: true }));
    searchAgentRuns = vi.fn(async () => ({ ok: true }));
    getAgentDefinition = vi.fn(async () => ({ ok: true }));
    updateAgentDefinition = vi.fn(async () => ({ ok: true }));
    exportAgent = vi.fn(async () => ({ export_version: "2", agent: {} }));
    previewImportAgent = vi.fn(async () => ({ ok: true, agent_name: "n", step_count: 0 }));
    uploadAgentInput = vi.fn(async () => ({ ok: true }));
    getAgentInputUploadStatus = vi.fn(async () => ({ ok: true }));
    getAgentAttachmentReferences = vi.fn(async () => ({ requires_uploads: false }));
    // A real Response exposes both `.body` (a web ReadableStream — exercises the
    // streaming --output path) and `.arrayBuffer()` (the stdout / fallback path).
    downloadAgentRunAttachment = vi.fn(async () => new Response("file-bytes"));
    generateAgentSteps = vi.fn(async () => ({ ok: true }));
    generateStepConfig = vi.fn(async () => ({ ok: true }));
    getAgentAiConversationHistory = vi.fn(async () => ({ ok: true }));
    markAgentAiSuggestion = vi.fn(async () => undefined);
    listRunEvaluationResults = vi.fn(async () => ({ ok: true }));
    disableAgent = vi.fn(async () => ({ ok: true }));
    enableAgent = vi.fn(async () => ({ ok: true }));
    getAgentCallers = vi.fn(async () => []);
    setEmailTriggerConfig = vi.fn(async () => ({ ok: true }));

    // contents
    uploadFileToContent = vi.fn(async () => ({ ok: true }));
    getContentDetail = vi.fn(async () => ({ ok: true }));
    deleteContent = vi.fn(async () => undefined);
    listContentEmbeddings = vi.fn(async () => ({ ok: true }));
    replaceContentWithInlineText = vi.fn(async () => ({ ok: true }));

    // kb
    listKnowledgeBases = vi.fn(async () => ({ data: [] }));
    createKnowledgeBase = vi.fn(async () => ({ ok: true }));
    getKnowledgeBase = vi.fn(async () => ({ ok: true }));
    updateKnowledgeBase = vi.fn(async () => ({ ok: true }));
    deleteKnowledgeBase = vi.fn(async () => undefined);

    // memory
    listMemoryBanks = vi.fn(async () => ({ data: [] }));
    createMemoryBank = vi.fn(async () => ({ ok: true }));
    getMemoryBank = vi.fn(async () => ({ ok: true }));
    updateMemoryBank = vi.fn(async () => ({ ok: true }));
    deleteMemoryBank = vi.fn(async () => undefined);
    getMemoryBankStats = vi.fn(async () => ({ ok: true }));
    getAgentsUsingMemoryBank = vi.fn(async () => ({ ok: true }));
    compactMemoryBank = vi.fn(async () => undefined);
    deleteMemoryBankSource = vi.fn(async () => undefined);
    listMemoryBankTemplates = vi.fn(async () => ({ ok: true }));
    testMemoryBankCompaction = vi.fn(async () => ({ ok: true }));
    testCompactionPromptStandalone = vi.fn(async () => ({ ok: true }));
    generateMemoryBankConfig = vi.fn(async () => ({ ok: true }));
    getMemoryBankAiLastConversation = vi.fn(async () => ({ ok: true }));
    acceptMemoryBankAiSuggestion = vi.fn(async () => ({ ok: true }));

    // evals
    listEvaluationCriteria = vi.fn(async () => []);
    listEvaluationCriteriaPage = vi.fn(async () => ({ data: [], pagination: {} }));
    createEvaluationCriteria = vi.fn(async () => ({ ok: true }));
    getEvaluationCriteria = vi.fn(async () => ({ ok: true }));
    updateEvaluationCriteria = vi.fn(async () => ({ ok: true }));
    deleteEvaluationCriteria = vi.fn(async () => undefined);
    getEvaluationCriteriaSummary = vi.fn(async () => ({ ok: true }));
    listEvaluationResults = vi.fn(async () => ({ ok: true }));
    createEvaluationResult = vi.fn(async () => ({ ok: true }));
    listCompatibleRuns = vi.fn(async () => ({ ok: true }));
    testDraftEvaluation = vi.fn(async () => ({ ok: true }));
    listAgentEvaluationResults = vi.fn(async () => ({ ok: true }));
    listEvaluationRuns = vi.fn(async () => ({ ok: true }));
    getNonManualEvaluationSummary = vi.fn(async () => ({ ok: true }));

    // solutions
    listSolutions = vi.fn(async () => ({ data: [] }));
    createSolution = vi.fn(async () => ({ ok: true }));
    getSolution = vi.fn(async () => ({ ok: true }));
    updateSolution = vi.fn(async () => ({ ok: true }));
    deleteSolution = vi.fn(async () => undefined);
    linkAgentsToSolution = vi.fn(async () => ({ ok: true }));
    unlinkAgentsFromSolution = vi.fn(async () => ({ ok: true }));
    linkKnowledgeBasesToSolution = vi.fn(async () => ({ ok: true }));
    unlinkKnowledgeBasesFromSolution = vi.fn(async () => ({ ok: true }));
    linkSourceConnectionsToSolution = vi.fn(async () => ({ ok: true }));
    unlinkSourceConnectionsFromSolution = vi.fn(async () => ({ ok: true }));
    listSolutionConversations = vi.fn(async () => []);
    addSolutionConversationTurn = vi.fn(async () => ({ ok: true }));
    markSolutionConversationTurn = vi.fn(async () => undefined);
    generateSolutionAiPlan = vi.fn(async () => ({ ok: true }));
    generateSolutionAiKnowledgeBase = vi.fn(async () => ({ ok: true }));
    generateSolutionAiSource = vi.fn(async () => ({ ok: true }));
    acceptSolutionAiPlan = vi.fn(async () => ({ ok: true }));
    declineSolutionAiPlan = vi.fn(async () => undefined);

    // governance
    generateGovernanceAiPlan = vi.fn(async () => ({ ok: true }));
    listGovernanceAiConversations = vi.fn(async () => []);
    acceptGovernanceAiPlan = vi.fn(async () => ({ ok: true }));
    declineGovernanceAiPlan = vi.fn(async () => undefined);

    // alerts
    listAlerts = vi.fn(async () => ({ ok: true }));
    getAlert = vi.fn(async () => ({ ok: true }));
    changeAlertStatus = vi.fn(async () => ({ ok: true }));
    addAlertComment = vi.fn(async () => ({ ok: true }));
    subscribeToAlert = vi.fn(async () => ({ ok: true }));
    unsubscribeFromAlert = vi.fn(async () => ({ ok: true }));
    listAlertConfigs = vi.fn(async () => ({ ok: true }));
    createAlertConfig = vi.fn(async () => ({ ok: true }));
    getAlertConfig = vi.fn(async () => ({ ok: true }));
    updateAlertConfig = vi.fn(async () => ({ ok: true }));
    deleteAlertConfig = vi.fn(async () => undefined);
    listOrganizationAlertPreferences = vi.fn(async () => ({ ok: true }));
    updateOrganizationAlertPreference = vi.fn(async () => ({ ok: true }));

    // models
    listModels = vi.fn(async () => ({ ok: true }));
    getModel = vi.fn(async () => ({ ok: true }));
    listModelAlerts = vi.fn(async () => ({ ok: true }));
    markModelAlertRead = vi.fn(async () => undefined);
    markAllModelAlertsRead = vi.fn(async () => undefined);
    getUnreadModelAlertCount = vi.fn(async () => ({ ok: true }));
    getModelRecommendations = vi.fn(async () => ({ ok: true }));
    getGenerationTiers = vi.fn(async () => ({ ok: true }));
    listExperiments = vi.fn(async () => ({ ok: true }));
    createExperiment = vi.fn(async () => ({ ok: true }));
    getExperiment = vi.fn(async () => ({ ok: true }));
    cancelExperiment = vi.fn(async () => ({ ok: true }));
    deleteExperiment = vi.fn(async () => undefined);

    // search
    search = vi.fn(async () => ({ ok: true }));
    searchDocs = vi.fn(async () => ({ ok: true }));

    // account
    getMe = vi.fn(async () => ({ ok: true }));
    getApiVersion = vi.fn(async () => ({ ok: true }));
    updateApiVersion = vi.fn(async () => ({ ok: true }));

    // email domains
    listEmailDomains = vi.fn(async () => ({ ok: true }));
    addEmailDomain = vi.fn(async () => ({ ok: true }));
    removeEmailDomain = vi.fn(async () => ({ ok: true }));
    verifyEmailDomain = vi.fn(async () => ({ ok: true }));
    setPrimaryEmailDomain = vi.fn(async () => ({ ok: true }));
    useSharedEmailDomain = vi.fn(async () => undefined);
    sendEmailDomainTestEmail = vi.fn(async () => ({ ok: true }));
    getDmarcSummary = vi.fn(async () => ({ ok: true }));

    // inbound email
    listBlockedEmailSenders = vi.fn(async () => ({ ok: true }));
    blockEmailSender = vi.fn(async () => ({ ok: true }));
    unblockEmailSender = vi.fn(async () => undefined);
    setAutoBlockMode = vi.fn(async () => ({ ok: true }));
    listInboundEmailRejections = vi.fn(async () => ({ ok: true }));
    getInboundEmailStatus = vi.fn(async () => ({ ok: true }));
    cancelQueuedEmailRuns = vi.fn(async () => ({ ok: true }));
    resumeInboundEmail = vi.fn(async () => ({ ok: true }));
    listAgentEmailOptOuts = vi.fn(async () => ({ ok: true }));
    removeAgentEmailOptOut = vi.fn(async () => undefined);

    // ai
    submitAiFeedback = vi.fn(async () => ({ ok: true }));
    aiAssistantKnowledgeBase = vi.fn(async () => ({ ok: true }));
    aiAssistantSource = vi.fn(async () => ({ ok: true }));
    aiAssistantSolution = vi.fn(async () => ({ ok: true }));
    aiAssistantMemoryBank = vi.fn(async () => ({ ok: true }));
    getAiAssistantMemoryBankHistory = vi.fn(async () => ({ ok: true }));
    acceptAiAssistantPlan = vi.fn(async () => ({ ok: true }));
    declineAiAssistantPlan = vi.fn(async () => undefined);
    acceptAiMemoryBankSuggestion = vi.fn(async () => ({ ok: true }));
  }

  return {
    Seclai,
    SeclaiError,
    SeclaiConfigurationError,
    SeclaiAPIStatusError,
    SeclaiAPIValidationError,
    loadSsoProfile: mockSsoFns.loadSsoProfile = vi.fn(async () => ({
      ssoDomain: "auth.seclai.com",
      ssoClientId: "test-client-id",
      ssoRegion: "us-west-2",
      ssoAccountId: undefined,
    })),
    readSsoCache: mockSsoFns.readSsoCache = vi.fn(async () => null),
    writeSsoCache: mockSsoFns.writeSsoCache = vi.fn(async () => undefined),
    deleteSsoCache: mockSsoFns.deleteSsoCache = vi.fn(async () => undefined),
    isTokenValid: mockSsoFns.isTokenValid = vi.fn(() => false),
    DEFAULT_SSO_DOMAIN: "auth.seclai.com",
    DEFAULT_SSO_CLIENT_ID: "test-client-id",
    DEFAULT_SSO_REGION: "us-west-2",
  };
});

async function importCli() {
  // Import after mocks are set up
  return await import("../src/cli");
}

function makeRuntime() {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const stdoutBytes: Uint8Array[] = [];

  const stdin = new PassThrough();
  stdin.end();

  let exitCode: number | undefined;

  return {
    rt: {
      stdin,
      writeOut: (t: string) => stdoutChunks.push(t),
      writeOutBytes: (b: Uint8Array) => stdoutBytes.push(b),
      writeErr: (t: string) => stderrChunks.push(t),
      setExitCode: (c: number) => {
        exitCode = c;
      },
    },
    get stdoutBytes() {
      return Buffer.concat(stdoutBytes.map((b) => Buffer.from(b)));
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

// createClient is real code and reads this, so a developer or CI runner that
// exports it — the variable this release introduces and documents — would
// otherwise fail the "no --api-version leaves apiVersion unset" test. Captured
// once and put back afterwards, like every other env var this file touches.
const inheritedApiVersion = process.env.SECLAI_API_VERSION;

beforeEach(() => {
  mockState.instances.length = 0;
  mockState.lastCtorArgs = undefined;
  mockState.nextListSourcesError = undefined;
  delete process.env.SECLAI_API_VERSION;
});

afterAll(() => {
  if (inheritedApiVersion === undefined) delete process.env.SECLAI_API_VERSION;
  else process.env.SECLAI_API_VERSION = inheritedApiVersion;
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

  test("agents runs get calls SDK with run id", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "runs", "get", "run_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getAgentRun).toHaveBeenCalledWith("run_1", undefined);
  });

  test("agents runs get --include-step-outputs passes option", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "agents", "runs", "get", "run_1", "--include-step-outputs"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getAgentRun).toHaveBeenCalledWith("run_1", { includeStepOutputs: true });
  });

  test("agents runs delete cancels the run and warns", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "runs", "delete", "run_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    // The endpoint behind the old deleteAgentRun was always the cancel endpoint.
    expect(client.cancelAgentRun).toHaveBeenCalledWith("run_1");
    expect(client.deleteAgentRun).not.toHaveBeenCalled();
    expect(io.stderr).toContain("deprecated");
  });

  test("agents attachment-references calls getAgentAttachmentReferences", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "agents", "attachment-references", "agent_1"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getAgentAttachmentReferences).toHaveBeenCalledWith("agent_1");
  });

  test("agents runs download-attachment writes bytes to --output file", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-cli-"));
    const outPath = path.join(tmpDir, "att.bin");

    await runCli(
      [
        "node",
        "seclai",
        "--api-key",
        "k",
        "agents",
        "runs",
        "download-attachment",
        "run_1",
        "att_1",
        "--download-name",
        "report.pdf",
        "--output",
        outPath,
      ],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.downloadAgentRunAttachment).toHaveBeenCalledWith("run_1", "att_1", {
      downloadName: "report.pdf",
    });
    expect(await readFile(outPath, "utf8")).toBe("file-bytes");
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("agents runs download-attachment writes raw bytes to stdout without --output", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "agents", "runs", "download-attachment", "run_1", "att_1"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.downloadAgentRunAttachment).toHaveBeenCalledWith("run_1", "att_1", {});
    expect(io.stdoutBytes.toString("utf8")).toBe("file-bytes");
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

  // --- New command group tests ---

  test("agents list calls listAgents", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "list", "--page", "1", "--limit", "5"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listAgents).toHaveBeenCalledWith({ page: 1, limit: 5 });
  });

  test("agents create calls createAgent with JSON body", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "agents", "create", "--json", '{"name":"Test"}'],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.createAgent).toHaveBeenCalledWith({ name: "Test" });
  });

  test("agents get calls getAgent", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "get", "agent_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getAgent).toHaveBeenCalledWith("agent_1");
  });

  test("agents delete calls deleteAgent", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "delete", "agent_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.deleteAgent).toHaveBeenCalledWith("agent_1");
  });

  test("agents runs cancel calls cancelAgentRun", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "runs", "cancel", "run_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.cancelAgentRun).toHaveBeenCalledWith("run_1");
  });

  test("agents def get calls getAgentDefinition", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "def", "get", "agent_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getAgentDefinition).toHaveBeenCalledWith("agent_1");
  });

  test("agents export calls exportAgent with download=true by default", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "export", "agent_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.exportAgent).toHaveBeenCalledWith("agent_1", true);
  });

  test("agents export --no-download passes download=false", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "agents", "export", "agent_1", "--no-download"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.exportAgent).toHaveBeenCalledWith("agent_1", false);
  });

  test("agents preview-import sends body to previewImportAgent", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();
    const body = { agent_definition: { agent: { name: "n" } } };

    await runCli(
      ["node", "seclai", "--api-key", "k", "agents", "preview-import", "--json", JSON.stringify(body)],
      io.rt,
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.previewImportAgent).toHaveBeenCalledWith(body);
  });

  test("agents run --events streams SSE events as NDJSON", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "agents", "run", "a1", "--json", '{"input":"hi"}', "--events"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.runStreamingAgent).toHaveBeenCalled();
    expect(io.stdout).toContain("status");
  });

  test("agents run --poll uses runAgentAndPoll", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "agents", "run", "a1", "--json", '{"input":"hi"}', "--poll", "--poll-interval-ms", "500"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.runAgentAndPoll).toHaveBeenCalledWith("a1", { input: "hi" }, { pollIntervalMs: 500 });
  });

  test("kb list calls listKnowledgeBases", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "kb", "list"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listKnowledgeBases).toHaveBeenCalledWith({});
  });

  test("kb create calls createKnowledgeBase", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "kb", "create", "--json", '{"name":"MyKB"}'],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.createKnowledgeBase).toHaveBeenCalledWith({ name: "MyKB" });
  });

  test("memory list calls listMemoryBanks", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "memory", "list"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listMemoryBanks).toHaveBeenCalled();
  });

  test("memory stats calls getMemoryBankStats", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "memory", "stats", "mb_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getMemoryBankStats).toHaveBeenCalledWith("mb_1");
  });

  test("memory compact calls compactMemoryBank", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "memory", "compact", "mb_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.compactMemoryBank).toHaveBeenCalledWith("mb_1");
  });

  test("evals criteria list calls listEvaluationCriteria", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "evals", "criteria", "list", "agent_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listEvaluationCriteria).toHaveBeenCalledWith("agent_1", {});
  });

  test("solutions list calls listSolutions", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "solutions", "list"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listSolutions).toHaveBeenCalled();
  });

  test("solutions link calls link methods", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "solutions", "link", "sol_1", "--agents", '{"ids":["a1"]}'],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.linkAgentsToSolution).toHaveBeenCalledWith("sol_1", { ids: ["a1"] });
  });

  test("governance ai list calls listGovernanceAiConversations", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "governance", "ai", "list"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listGovernanceAiConversations).toHaveBeenCalled();
  });

  test("alerts list calls listAlerts with filters", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "alerts", "list", "--status", "open"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listAlerts).toHaveBeenCalledWith({ status: "open" });
  });

  test("alerts list rejects --severity", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    // GET /alerts declares no severity filter, so the flag never filtered and
    // becomes a 422 under api-version 2026-07-27. Fail loudly instead.
    const exitCode = await runCli(
      ["node", "seclai", "--api-key", "k", "alerts", "list", "--severity", "high"],
      io.rt
    );

    expect(exitCode).not.toBe(0);
  });

  test("alerts configs create calls createAlertConfig", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "alerts", "configs", "create", "--json", '{"name":"My Config"}'],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.createAlertConfig).toHaveBeenCalledWith({ name: "My Config" });
  });

  test("models alerts list calls listModelAlerts", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "alerts", "list"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listModelAlerts).toHaveBeenCalled();
  });

  test("models recommendations calls getModelRecommendations", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "recommendations", "model_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getModelRecommendations).toHaveBeenCalledWith("model_1");
  });

  test("models list calls listModels", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "list", "--provider", "openai"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listModels).toHaveBeenCalledWith({ provider: "openai" });
  });

  test("models get calls getModel", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "get", "gpt-4o"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getModel).toHaveBeenCalledWith("gpt-4o");
  });

  test("models experiments list calls listExperiments", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "experiments", "list", "--days", "7"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listExperiments).toHaveBeenCalledWith({ days: 7 });
  });

  test("models experiments create calls createExperiment", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "experiments", "create", "--json", '{"model_ids":["gpt-4o"],"prompt":"Hello"}'], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.createExperiment).toHaveBeenCalledWith({ model_ids: ["gpt-4o"], prompt: "Hello" });
  });

  test("models experiments get calls getExperiment", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "experiments", "get", "exp_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.getExperiment).toHaveBeenCalledWith("exp_1");
  });

  test("models experiments cancel calls cancelExperiment", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "experiments", "cancel", "exp_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.cancelExperiment).toHaveBeenCalledWith("exp_1");
  });

  test("models experiments delete calls deleteExperiment", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "models", "experiments", "delete", "exp_1"], io.rt);

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.deleteExperiment).toHaveBeenCalledWith("exp_1");
  });

  test("search calls search with query", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "search", "--query", "deployment guide", "--limit", "5"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.search).toHaveBeenCalledWith({ query: "deployment guide", limit: 5 });
  });

  test("ai feedback calls submitAiFeedback", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "ai", "feedback", "--json", '{"feedback":"great"}'],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.submitAiFeedback).toHaveBeenCalledWith({ feedback: "great" });
  });

  test("sources create calls createSource", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "sources", "create", "--json", '{"name":"New Source"}'],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.createSource).toHaveBeenCalledWith({ name: "New Source" });
  });

  test("sources exports list calls listSourceExports", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "sources", "exports", "list", "src_1"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.listSourceExports).toHaveBeenCalledWith("src_1", {});
  });

  test("contents replace-text calls replaceContentWithInlineText", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "contents", "replace-text", "cv_1", "--json", '{"text":"new content"}'],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const client = mockState.instances[0];
    expect(client.replaceContentWithInlineText).toHaveBeenCalledWith("cv_1", { text: "new content" });
  });

  test("skills install writes skill files", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-cli-skills-"));

    await runCli(
      ["node", "seclai", "skills", "install", "--tool", "copilot", "--dir", tmpDir],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const parsed = JSON.parse(io.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.tools).toEqual(["copilot"]);

    // Derived, not a magic number: every file under skills/seclai-cli/ ships,
    // so adding a reference must not require editing this assertion. Resolved
    // against this file rather than the process cwd, which vitest does not
    // promise to leave at the repo root.
    const { existsSync, readdirSync } = await import("node:fs");
    const referencesDir = new URL("../skills/seclai-cli/references/", import.meta.url);
    const expectedFiles = 1 + readdirSync(referencesDir).filter((f) => f.endsWith(".md")).length;
    expect(parsed.filesWritten).toBe(expectedFiles);

    // Verify files were written
    const installed = path.join(tmpDir, ".github", "copilot", "seclai-cli");
    expect(existsSync(path.join(installed, "SKILL.md"))).toBe(true);
    expect(existsSync(path.join(installed, "references", "streaming.md"))).toBe(true);
    expect(existsSync(path.join(installed, "references", "agents.md"))).toBe(true);

    // Clean up
    await rm(tmpDir, { recursive: true });
  });

  test("mcp configure writes MCP config", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-cli-mcp-"));

    await runCli(
      ["node", "seclai", "mcp", "configure", "--key", "test-key", "--target", "claude-code", "--dir", tmpDir],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const parsed = JSON.parse(io.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.targets).toEqual(["claude-code"]);

    // Verify config was written
    const config = JSON.parse(await readFile(path.join(tmpDir, ".mcp.json"), "utf8"));
    expect(config.mcpServers.seclai.url).toBe("https://api.seclai.com/mcp");
    expect(config.mcpServers.seclai.headers["X-API-Key"]).toBe("test-key");

    await rm(tmpDir, { recursive: true });
  });

  test("mcp configure merges into existing config", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-cli-mcp-"));
    // Write an existing config with another MCP server
    await writeFile(path.join(tmpDir, ".mcp.json"), JSON.stringify({
      mcpServers: { other: { type: "stdio", command: "echo" } }
    }), "utf8");

    await runCli(
      ["node", "seclai", "mcp", "configure", "--key", "k2", "--target", "claude-code", "--dir", tmpDir],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    const config = JSON.parse(await readFile(path.join(tmpDir, ".mcp.json"), "utf8"));
    expect(config.mcpServers.other).toEqual({ type: "stdio", command: "echo" });
    expect(config.mcpServers.seclai.headers["X-API-Key"]).toBe("k2");

    await rm(tmpDir, { recursive: true });
  });

  test("mcp show outputs config snippet", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "mcp", "show"], io.rt);

    expect(io.exitCode).toBe(0);
    const parsed = JSON.parse(io.stdout);
    expect(parsed.mcpServers.seclai.type).toBe("streamable-http");
    expect(parsed.mcpServers.seclai.url).toBe("https://api.seclai.com/mcp");
    expect(parsed.mcpServers.seclai.headers["X-API-Key"]).toBe("YOUR_API_KEY");
  });

  test("missing api key hint suggests SECLAI_API_KEY", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const p = (globalThis as any).process;
    const prev = p?.env?.SECLAI_API_KEY;
    if (p?.env) delete p.env.SECLAI_API_KEY;

    await runCli(["node", "seclai", "sources", "list"], io.rt);

    expect(io.exitCode).toBe(1);
    expect(io.stderr).toContain("hint: Set the SECLAI_API_KEY environment variable or pass --api-key.");

    if (p?.env) {
      if (prev === undefined) delete p.env.SECLAI_API_KEY;
      else p.env.SECLAI_API_KEY = prev;
    }
  });

  test("--compact outputs single-line JSON", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "--api-key", "k", "--compact", "agents", "list"], io.rt);

    expect(io.exitCode).toBe(0);
    // With --compact, output should be a single line (no newlines inside the JSON)
    const lines = io.stdout.trim().split("\n");
    expect(lines).toHaveLength(1);
    // Should still be valid JSON
    JSON.parse(lines[0]!);
  });

  test("--user-input creates user_input body for AI commands", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(
      ["node", "seclai", "--api-key", "k", "ai", "kb", "--user-input", "Create a support KB"],
      io.rt
    );

    expect(io.exitCode).toBe(0);
    expect(mockState.instances).toHaveLength(1);
    const client = mockState.instances[0];
    expect(client!.aiAssistantKnowledgeBase).toHaveBeenCalledWith({ user_input: "Create a support KB" });
  });

  test("completion bash outputs bash script", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "completion", "bash"], io.rt);

    expect(io.exitCode).toBe(0);
    expect(io.stdout).toContain("_seclai_completions");
    expect(io.stdout).toContain("complete -F");
    // New 1.3.0 commands are offered by the completion script.
    expect(io.stdout).toContain("attachment-references");
    expect(io.stdout).toContain("download-attachment");
    expect(io.stdout).toContain("preview-import");
    expect(io.stdout).toContain("experiments");
  });

  test("completion zsh outputs zsh script", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "completion", "zsh"], io.rt);

    expect(io.exitCode).toBe(0);
    expect(io.stdout).toContain("#compdef seclai");
    expect(io.stdout).toContain("_seclai");
  });

  test("completion fish outputs fish script", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "completion", "fish"], io.rt);

    expect(io.exitCode).toBe(0);
    expect(io.stdout).toContain("complete -c seclai");
  });

  test("completion unknown shell gives error", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "completion", "powershell"], io.rt);

    expect(io.exitCode).toBe(1);
    expect(io.stderr).toContain("Unknown shell");
  });

  // ── auth ────────────────────────────────────────────────────────────────

  test("auth status shows not_authenticated when no cached token", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    mockSsoFns.readSsoCache.mockResolvedValueOnce(null);

    await runCli(["node", "seclai", "auth", "status"], io.rt);

    expect(io.exitCode).toBe(0);
    const result = JSON.parse(io.stdout);
    expect(result.status).toBe("not_authenticated");
    expect(result.profile).toBe("default");
  });

  test("auth status shows authenticated when valid cached token", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    mockSsoFns.readSsoCache.mockResolvedValueOnce({
      accessToken: "tok",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      clientId: "cid",
      region: "us-west-2",
      cognitoDomain: "auth.seclai.com",
    });
    mockSsoFns.isTokenValid.mockReturnValueOnce(true);

    await runCli(["node", "seclai", "auth", "status"], io.rt);

    expect(io.exitCode).toBe(0);
    const result = JSON.parse(io.stdout);
    expect(result.status).toBe("authenticated");
    expect(result.hasRefreshToken).toBe(false);
  });

  test("auth status shows expired when token is expired", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    mockSsoFns.readSsoCache.mockResolvedValueOnce({
      accessToken: "tok",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      clientId: "cid",
      region: "us-west-2",
      cognitoDomain: "auth.seclai.com",
    });
    mockSsoFns.isTokenValid.mockReturnValueOnce(false);

    await runCli(["node", "seclai", "auth", "status"], io.rt);

    expect(io.exitCode).toBe(0);
    const result = JSON.parse(io.stdout);
    expect(result.status).toBe("expired");
  });

  test("auth logout deletes cached tokens", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "auth", "logout"], io.rt);

    expect(io.exitCode).toBe(0);
    const result = JSON.parse(io.stdout);
    expect(result.status).toBe("logged_out");
    expect(result.profile).toBe("default");
    expect(mockSsoFns.deleteSsoCache).toHaveBeenCalled();
  });

  test("auth login rejects invalid port", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "auth", "login", "--port", "abc", "--no-browser"], io.rt);

    expect(io.exitCode).toBe(1);
    expect(io.stderr).toContain("Invalid port");
  });

  test("auth login rejects out-of-range port", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "auth", "login", "--port", "99999", "--no-browser"], io.rt);

    expect(io.exitCode).toBe(1);
    expect(io.stderr).toContain("Invalid port");
  });

  // ── configure ───────────────────────────────────────────────────────────

  test("configure list outputs empty profiles when no config file", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    await runCli(["node", "seclai", "configure", "list", "--config-dir", "/tmp/nonexistent-seclai-dir"], io.rt);

    expect(io.exitCode).toBe(0);
    const result = JSON.parse(io.stdout);
    expect(result.profiles).toEqual([]);
    expect(result.configFile).toContain("config");
  });

  test("configure list parses profiles from config file", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "seclai-test-"));
    try {
      await writeFile(
        path.join(tmpDir, "config"),
        "[default]\nsso_domain = auth.seclai.com\n\n[profile staging]\nsso_domain = staging.seclai.com\n"
      );

      await runCli(["node", "seclai", "configure", "list", "--config-dir", tmpDir], io.rt);

      expect(io.exitCode).toBe(0);
      const result = JSON.parse(io.stdout);
      expect(result.profiles).toEqual(["default", "staging"]);
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });
});

describe("seclai CLI — SDK 1.5.0 surface", () => {
  /**
   * Run a command with a stubbed API key and assert it succeeded. Returns the
   * client this invocation constructed — the newest, since `mockState.instances`
   * accumulates across every call in a test.
   */
  async function ok(argv: string[]) {
    const { runCli } = await importCli();
    const io = makeRuntime();
    await runCli(["node", "seclai", "--api-key", "k", ...argv], io.rt);
    expect(io.exitCode).toBe(0);
    return { io, client: mockState.instances[mockState.instances.length - 1] };
  }

  // --- API version ---

  test("--api-version reaches the SDK constructor", async () => {
    await ok(["--api-version", "2026-07-27", "agents", "list"]);
    expect(mockState.lastCtorArgs).toMatchObject({ apiVersion: "2026-07-27" });
  });

  test("no --api-version leaves apiVersion unset", async () => {
    await ok(["agents", "list"]);
    // Omitted by default: upgrading the CLI must not change a response shape.
    expect(mockState.lastCtorArgs).not.toHaveProperty("apiVersion");
  });

  test("SECLAI_API_VERSION supplies the version when the flag is absent", async () => {
    process.env.SECLAI_API_VERSION = "2026-07-01";
    try {
      await ok(["agents", "list"]);
      expect(mockState.lastCtorArgs).toMatchObject({ apiVersion: "2026-07-01" });
    } finally {
      delete process.env.SECLAI_API_VERSION;
    }
  });

  test("--api-version wins over SECLAI_API_VERSION", async () => {
    process.env.SECLAI_API_VERSION = "2026-07-01";
    try {
      await ok(["--api-version", "2026-07-27", "agents", "list"]);
      expect(mockState.lastCtorArgs).toMatchObject({ apiVersion: "2026-07-27" });
    } finally {
      delete process.env.SECLAI_API_VERSION;
    }
  });

  test("an empty --api-version is rejected, not ignored", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    // The SDK tests apiVersion for truthiness, so "" would send no header and
    // skip the unknown-version guard — `--api-version "$VER"` with an unset VER
    // would silently return default-version output.
    const exitCode = await runCli(
      ["node", "seclai", "--api-key", "k", "--api-version", "", "agents", "list"],
      io.rt
    );

    expect(exitCode).not.toBe(0);
    expect(io.stderr).toContain("--api-version");
  });

  test("an empty SECLAI_API_VERSION is treated as unset", async () => {
    process.env.SECLAI_API_VERSION = "";
    try {
      await ok(["agents", "list"]);
      expect(mockState.lastCtorArgs).not.toHaveProperty("apiVersion");
    } finally {
      delete process.env.SECLAI_API_VERSION;
    }
  });

  test("every valued global option rejects an empty value", async () => {
    // A shell expanding an unset variable passes "", and each of these was
    // treated as absent: `--api-key "$KEY"` fell through to SECLAI_API_KEY or a
    // cached SSO session and ran as a different identity.
    for (const flag of ["--api-key", "--profile", "--account-id", "--config-dir"]) {
      const { runCli } = await importCli();
      const io = makeRuntime();

      const exitCode = await runCli(["node", "seclai", flag, "", "agents", "list"], io.rt);

      expect(exitCode, `${flag} "" should fail`).not.toBe(0);
      expect(io.stderr).toContain(flag);
    }
  });

  test("a non-numeric --limit fails the parse instead of sending NaN", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    // `Number("abc")` is NaN and the SDK stringifies it, so this used to leave
    // as `?limit=NaN` and come back a server 422 naming nothing.
    const exitCode = await runCli(
      ["node", "seclai", "--api-key", "k", "email", "blocked", "list", "--limit", "abc"],
      io.rt
    );

    expect(exitCode).not.toBe(0);
    expect(io.stderr).toContain("--limit");
    // Rejected during parsing, so no request is even prepared.
    expect(mockState.instances).toHaveLength(0);
  });

  test("api-version set rejects a malformed date", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    // The pin is account-wide and the CLI sends no header afterwards, so
    // nothing downstream would catch the typo.
    const exitCode = await runCli(
      ["node", "seclai", "--api-key", "k", "api-version", "set", "2026-7-27"],
      io.rt
    );

    expect(exitCode).not.toBe(0);
    expect(mockState.instances).toHaveLength(0);
  });

  test("docs search rejects an unknown --mode", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    const exitCode = await runCli(
      ["node", "seclai", "--api-key", "k", "docs", "search", "--query", "x", "--mode", "fuzzy"],
      io.rt
    );

    expect(exitCode).not.toBe(0);
    expect(mockState.instances).toHaveLength(0);
  });

  test("--allow-unknown-api-version reaches the SDK constructor", async () => {
    await ok(["--api-version", "2027-01-01", "--allow-unknown-api-version", "agents", "list"]);
    expect(mockState.lastCtorArgs).toMatchObject({ allowUnknownApiVersion: true });
  });

  test("api-version get", async () => {
    const { client } = await ok(["api-version", "get"]);
    expect(client.getApiVersion).toHaveBeenCalled();
  });

  test("api-version set", async () => {
    const { client } = await ok(["api-version", "set", "2026-07-27"]);
    expect(client.updateApiVersion).toHaveBeenCalledWith("2026-07-27");
  });

  test("api-version clear passes null", async () => {
    const { client } = await ok(["api-version", "clear"]);
    expect(client.updateApiVersion).toHaveBeenCalledWith(null);
  });

  test("me calls getMe", async () => {
    const { client } = await ok(["me"]);
    expect(client.getMe).toHaveBeenCalled();
  });

  // --- Agents ---

  test("agents disable / enable / callers", async () => {
    const disabled = await ok(["agents", "disable", "agent_1"]);
    expect(disabled.client.disableAgent).toHaveBeenCalledWith("agent_1");

    const enabled = await ok(["agents", "enable", "agent_1"]);
    expect(enabled.client.enableAgent).toHaveBeenCalledWith("agent_1");

    const callers = await ok(["agents", "callers", "agent_1"]);
    expect(callers.client.getAgentCallers).toHaveBeenCalledWith("agent_1");
  });

  test("agents triggers email-config", async () => {
    const { client } = await ok([
      "agents",
      "triggers",
      "email-config",
      "agent_1",
      "trig_1",
      "--json",
      '{"alias":"support"}',
    ]);
    expect(client.setEmailTriggerConfig).toHaveBeenCalledWith("agent_1", "trig_1", {
      alias: "support",
    });
  });

  test("agents ai history sends step_type and paging", async () => {
    const { client } = await ok([
      "agents",
      "ai",
      "history",
      "agent_1",
      "--step-type",
      "llm",
      "--step-id",
      "step_1",
      "--limit",
      "10",
      "--offset",
      "20",
    ]);
    expect(client.getAgentAiConversationHistory).toHaveBeenCalledWith("agent_1", {
      stepType: "llm",
      stepId: "step_1",
      limit: 10,
      offset: 20,
    });
  });

  test("agents ai history requires --step-type", async () => {
    const { runCli } = await importCli();
    const io = makeRuntime();

    // The API marks step_type required; without it every call answered 422.
    const exitCode = await runCli(
      ["node", "seclai", "--api-key", "k", "agents", "ai", "history", "agent_1"],
      io.rt
    );

    expect(exitCode).not.toBe(0);
  });

  // --- Email domains ---

  test("email domains list", async () => {
    const { client } = await ok(["email", "domains", "list"]);
    expect(client.listEmailDomains).toHaveBeenCalled();
  });

  test("email domains add omits delegated unless passed", async () => {
    const plain = await ok(["email", "domains", "add", "--kind", "custom", "--value", "mail.example.com"]);
    expect(plain.client.addEmailDomain).toHaveBeenCalledWith({
      kind: "custom",
      value: "mail.example.com",
    });

    const delegated = await ok([
      "email",
      "domains",
      "add",
      "--kind",
      "vanity",
      "--value",
      "acme",
      "--delegated",
    ]);
    expect(delegated.client.addEmailDomain).toHaveBeenCalledWith({
      kind: "vanity",
      value: "acme",
      delegated: true,
    });
  });

  test("email domains lifecycle commands", async () => {
    const removed = await ok(["email", "domains", "remove", "dom_1"]);
    expect(removed.client.removeEmailDomain).toHaveBeenCalledWith("dom_1");

    const verified = await ok(["email", "domains", "verify", "dom_1"]);
    expect(verified.client.verifyEmailDomain).toHaveBeenCalledWith("dom_1");

    const primary = await ok(["email", "domains", "set-primary", "dom_1"]);
    expect(primary.client.setPrimaryEmailDomain).toHaveBeenCalledWith("dom_1");

    const shared = await ok(["email", "domains", "use-shared"]);
    expect(shared.client.useSharedEmailDomain).toHaveBeenCalled();

    // Not `test` — that would shadow vitest's import for this whole body.
    const tested = await ok(["email", "domains", "test-email", "dom_1"]);
    expect(tested.client.sendEmailDomainTestEmail).toHaveBeenCalledWith("dom_1");
  });

  test("email domains dmarc passes days and top-sources", async () => {
    const { client } = await ok([
      "email",
      "domains",
      "dmarc",
      "dom_1",
      "--days",
      "7",
      "--top-sources",
      "5",
    ]);
    expect(client.getDmarcSummary).toHaveBeenCalledWith("dom_1", { days: 7, topSources: 5 });
  });

  // --- Blocked senders ---

  test("email blocked list", async () => {
    const { client } = await ok(["email", "blocked", "list", "--limit", "10", "--offset", "5"]);
    expect(client.listBlockedEmailSenders).toHaveBeenCalledWith({ limit: 10, offset: 5 });
  });

  test("email blocked add defaults match_type to address", async () => {
    const { client } = await ok(["email", "blocked", "add", "--sender-email", "spam@example.com"]);
    expect(client.blockEmailSender).toHaveBeenCalledWith({
      sender_email: "spam@example.com",
      match_type: "address",
    });
  });

  test("email blocked add accepts match-type and note", async () => {
    const { client } = await ok([
      "email",
      "blocked",
      "add",
      "--sender-email",
      "example.com",
      "--match-type",
      "domain",
      "--note",
      "phishing",
    ]);
    expect(client.blockEmailSender).toHaveBeenCalledWith({
      sender_email: "example.com",
      match_type: "domain",
      note: "phishing",
    });
  });

  test("email blocked remove and auto-block-mode", async () => {
    const removed = await ok(["email", "blocked", "remove", "blk_1"]);
    expect(removed.client.unblockEmailSender).toHaveBeenCalledWith("blk_1");

    // One of the three modes the API accepts: disabled, input, input_and_output.
    const mode = await ok(["email", "blocked", "auto-block-mode", "input_and_output"]);
    expect(mode.client.setAutoBlockMode).toHaveBeenCalledWith({ mode: "input_and_output" });
  });

  // --- Inbound health ---

  test("email inbound commands", async () => {
    const status = await ok(["email", "inbound", "status"]);
    expect(status.client.getInboundEmailStatus).toHaveBeenCalled();

    const rejections = await ok([
      "email",
      "inbound",
      "rejections",
      "--agent-id",
      "agent_1",
      "--limit",
      "10",
    ]);
    expect(rejections.client.listInboundEmailRejections).toHaveBeenCalledWith({
      agentId: "agent_1",
      limit: 10,
    });

    const cancelled = await ok(["email", "inbound", "cancel-queued"]);
    expect(cancelled.client.cancelQueuedEmailRuns).toHaveBeenCalled();

    const resumed = await ok(["email", "inbound", "resume"]);
    expect(resumed.client.resumeInboundEmail).toHaveBeenCalled();
  });

  // --- Opt-outs ---

  test("email optouts list and remove", async () => {
    const listed = await ok(["email", "optouts", "list", "--agent-id", "agent_1", "--limit", "10"]);
    expect(listed.client.listAgentEmailOptOuts).toHaveBeenCalledWith({
      agentId: "agent_1",
      limit: 10,
    });

    const removed = await ok(["email", "optouts", "remove", "opt_1"]);
    expect(removed.client.removeAgentEmailOptOut).toHaveBeenCalledWith("opt_1");
  });

  // --- Models / docs / evals ---

  test("models tiers", async () => {
    const { client } = await ok(["models", "tiers"]);
    expect(client.getGenerationTiers).toHaveBeenCalled();
  });

  test("models list passes the media capability filters", async () => {
    const { client } = await ok([
      "models",
      "list",
      "--supports-input-media",
      "image",
      "--supports-output-media",
      "video",
    ]);
    expect(client.listModels).toHaveBeenCalledWith({
      supportsInputMedia: "image",
      supportsOutputMedia: "video",
    });
  });

  test("docs search", async () => {
    const { client } = await ok([
      "docs",
      "search",
      "--query",
      "memory banks",
      "--mode",
      "semantic",
      "--limit",
      "5",
    ]);
    expect(client.searchDocs).toHaveBeenCalledWith({
      query: "memory banks",
      mode: "semantic",
      limit: 5,
    });
  });

  test("evals criteria list --paged uses the envelope method", async () => {
    const paged = await ok(["evals", "criteria", "list", "agent_1", "--paged", "--limit", "10"]);
    expect(paged.client.listEvaluationCriteriaPage).toHaveBeenCalledWith("agent_1", { limit: 10 });
    expect(paged.client.listEvaluationCriteria).not.toHaveBeenCalled();

    const bare = await ok(["evals", "criteria", "list", "agent_1", "--limit", "10"]);
    expect(bare.client.listEvaluationCriteria).toHaveBeenCalledWith("agent_1", { limit: 10 });
    expect(bare.client.listEvaluationCriteriaPage).not.toHaveBeenCalled();
  });
});
