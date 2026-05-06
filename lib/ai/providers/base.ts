export interface AIProvider {
  generateText(prompt: string): Promise<string>;
}

export class DeterministicProvider implements AIProvider {
  async generateText(prompt: string) {
    return `Operational summary: ${prompt.slice(0, 220)}. This output supports workflow coordination only and does not provide medical diagnosis.`;
  }
}
