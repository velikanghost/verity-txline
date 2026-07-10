import { Test, TestingModule } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { AgentService } from "../src/modules/agent/agent.service"

describe("AgentService", () => {
  let service: AgentService
  let configService: ConfigService
  let fetchMock: jest.SpyInstance

  const mockConfig = {
    LLM_PROVIDER: "mock",
    OPENAI_API_KEY: "openai-key",
    GEMINI_API_KEY: "gemini-key",
    CLAUDE_API_KEY: "claude-key",
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile()

    service = module.get<AgentService>(AgentService)
    configService = module.get<ConfigService>(ConfigService)
    fetchMock = jest.spyOn(global, "fetch")
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("searchWeb", () => {
    it("should perform search using DuckDuckGo and parse HTML successfully", async () => {
      const mockHtml = `
        <html>
          <body>
            Some leading HTML...
            <div class="result results_links results_links_deep web-result ">
              <a class="result__a" href="https://url1.com">Result 1</a>
              <span class="result__snippet">Snippet 1</span>
            </div>
            <div class="result results_links results_links_deep web-result ">
              <a class="result__a" href="https://url2.com">Result 2</a>
              <span class="result__snippet">Snippet 2</span>
            </div>
          </body>
        </html>
      `

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      } as any)

      const res = await service.searchWeb("test query")
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("https://duckduckgo.com/html/"),
        expect.anything(),
      )
      expect(res).toContain("Result 1")
      expect(res).toContain("https://url1.com")
      expect(res).toContain("Snippet 2")
    })

    it("should handle empty search results gracefully", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => "<html><body>No results</body></html>",
      } as any)

      const res = await service.searchWeb("empty query")
      expect(res).toBe("Error performing web search.")
    })
  })

  describe("resolveMarket", () => {
    it("should fall back to mock resolution if provider is mock", async () => {
      const res = await service.resolveMarket(
        "Will BTC reach 100k?",
        "Yes side",
        "No side",
        "Source",
      )
      expect(res.outcome).toBe("YES")
      expect(res.reasoning).toContain("Mock reasoning")
    })

    it("should randomly resolve pvp category markets to YES or NO when provider is mock", async () => {
      const randomSpy = jest.spyOn(Math, "random")

      // Force Math.random() < 0.5 to get YES
      randomSpy.mockReturnValue(0.3)
      const resYes = await service.resolveMarket(
        "Will BTC reach 100k?",
        "Yes side",
        "No side",
        "Source",
        "pvp",
      )
      expect(resYes.outcome).toBe("YES")

      // Force Math.random() >= 0.5 to get NO
      randomSpy.mockReturnValue(0.7)
      const resNo = await service.resolveMarket(
        "Will BTC reach 100k?",
        "Yes side",
        "No side",
        "Source",
        "pvp",
      )
      expect(resNo.outcome).toBe("NO")

      randomSpy.mockRestore()
    })

    it("should resolve using OpenAI", async () => {
      jest.spyOn(configService, "get").mockImplementation((key) => {
        if (key === "LLM_PROVIDER") return "openai"
        return mockConfig[key]
      })

      // Mock searchWeb call
      jest
        .spyOn(service, "searchWeb")
        .mockResolvedValue("Mocked web search contents")

      // Mock OpenAI fetch call
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  outcome: "YES",
                  reasoning: "OpenAI resolved this based on source facts.",
                  citations: ["https://openai-citations.com"],
                }),
              },
            },
          ],
        }),
      } as any)

      const res = await service.resolveMarket(
        "Will BTC reach 100k?",
        "Yes side",
        "No side",
        "Source",
      )
      expect(res.outcome).toBe("YES")
      expect(res.reasoning).toBe("OpenAI resolved this based on source facts.")
      expect(res.citations).toEqual(["https://openai-citations.com"])
    })

    it("should resolve using Gemini", async () => {
      jest.spyOn(configService, "get").mockImplementation((key) => {
        if (key === "LLM_PROVIDER") return "gemini"
        return mockConfig[key]
      })

      jest
        .spyOn(service, "searchWeb")
        .mockResolvedValue("Mocked web search contents")

      // Mock Gemini fetch call
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      outcome: "NO",
                      reasoning: "Gemini resolved this.",
                      citations: ["https://gemini-citations.com"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as any)

      const res = await service.resolveMarket(
        "Will BTC reach 100k?",
        "Yes side",
        "No side",
        "Source",
      )
      expect(res.outcome).toBe("NO")
      expect(res.reasoning).toBe("Gemini resolved this.")
    })

    it("should resolve using Claude", async () => {
      jest.spyOn(configService, "get").mockImplementation((key) => {
        if (key === "LLM_PROVIDER") return "claude"
        return mockConfig[key]
      })

      jest
        .spyOn(service, "searchWeb")
        .mockResolvedValue("Mocked web search contents")

      // Mock Claude fetch call
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                outcome: "INVALID",
                reasoning: "Claude resolved this.",
                citations: ["https://claude-citations.com"],
              }),
            },
          ],
        }),
      } as any)

      const res = await service.resolveMarket(
        "Will BTC reach 100k?",
        "Yes side",
        "No side",
        "Source",
      )
      expect(res.outcome).toBe("INVALID")
      expect(res.reasoning).toBe("Claude resolved this.")
    })
  })
})
