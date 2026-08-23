export class GameState {
  private readonly flags = new Set<string>();

  hasFlag(name: string): boolean {
    return this.flags.has(name);
  }

  setFlag(name: string): void {
    this.flags.add(name);
  }
}
