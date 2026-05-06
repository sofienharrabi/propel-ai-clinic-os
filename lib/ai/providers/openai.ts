import { AIProvider, DeterministicProvider } from "@/lib/ai/providers/base";

export class OpenAIProvider implements AIProvider {
  private fallback = new DeterministicProvider();

  async generateText(prompt: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return this.fallback.generateText(prompt);
    }
    return this.fallback.generateText(prompt);
  }
}
