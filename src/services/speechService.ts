
export class SpeechService {
  private static instance: SpeechService;
  private synth: SpeechSynthesis;
  private isEnabled: boolean = true;

  private constructor() {
    this.synth = window.speechSynthesis;
  }

  public static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public speak(text: string, priority: 'normal' | 'high' | 'critical' = 'normal') {
    if (!this.isEnabled) return;

    // Stop any current speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Adjust rate based on priority, similar to the PDF logic
    if (priority === 'high') {
      utterance.rate = 0.9;
    } else if (priority === 'critical') {
      utterance.rate = 0.85;
      utterance.pitch = 1.1;
    } else {
      utterance.rate = 1.0;
    }

    this.synth.speak(utterance);
  }

  public stop() {
    this.synth.cancel();
  }
}

export const speechService = SpeechService.getInstance();
