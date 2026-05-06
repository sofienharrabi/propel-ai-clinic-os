import { AIProvider, DeterministicProvider } from "@/lib/ai/providers/base";

export class AnthropicProvider implements AIProvider {
  private fallback = new DeterministicProvider();

  async generateText(prompt: string): Promise<string> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return this.fallback.generateText(prompt);
    }
    return this.fallback.generateText(prompt);
  }
}
