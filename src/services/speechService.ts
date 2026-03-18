
export class SpeechService {
  private static instance: SpeechService;
  private synth: SpeechSynthesis;
  private isEnabled: boolean = true;
  private voice: SpeechSynthesisVoice | null = null;

  private constructor() {
    this.synth = window.speechSynthesis;
    this.initVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.initVoice();
    }
  }

  private initVoice() {
    const voices = this.synth.getVoices();
    // Prefer "Google US English" or "Microsoft Zira" or any "natural" sounding voice
    // We want a stable, lower-pitched voice if possible
    this.voice = voices.find(v => v.name.includes('Google US English') && v.name.includes('Natural')) || 
                 voices.find(v => v.name.includes('Google US English')) ||
                 voices.find(v => v.name.includes('Microsoft Zira')) ||
                 voices.find(v => v.lang.startsWith('en-US')) || 
                 voices.find(v => v.lang.startsWith('en')) || 
                 voices[0];
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

  /**
   * Notifies the user of a change in the application state
   */
  public notifyChange(category: string, detail: string) {
    const message = `System Update: ${category}. ${detail}`;
    this.speak(message, 'normal');
  }

  /**
   * Preprocesses text to follow "Professional Voice Actor" rules:
   * 1. Breath and Rhythm: Natural pauses.
   * 2. Symbol Interpretation: Symbols to words.
   * 3. Character Handling: Abbreviations to full words.
   */
  private preprocessText(text: string): string {
    // Strip markdown for cleaner speech
    let processed = text.replace(/[#*`_~]/g, '');

    // Symbol Interpretation & Character Handling
    const replacements: { [key: string]: string } = {
      '\\$': ' dollars ',
      '%': ' percent ',
      '&': ' and ',
      '@': ' at ',
      '#': ' number ',
      'MEWS': ' M-E-W-S ',
      'GCS': ' G-C-S ',
      'qSOFA': ' quick sofa ',
      'PEWS': ' P-E-W-S ',
      'CURB-65': ' curb sixty five ',
      'Wells PE': ' wells pulmonary embolism ',
      'CHA₂DS₂-VASc': ' chads vasc ',
      'ARISCAT': ' ariscat ',
      'BP': ' blood pressure ',
      'HR': ' heart rate ',
      'RR': ' respiratory rate ',
      'SpO2': ' oxygen saturation ',
      'IV': ' intravenous ',
      'ICU': ' I-C-U ',
      'HDU': ' H-D-U ',
      'ECG': ' E-C-G ',
      'CXR': ' chest x-ray ',
      'ABG': ' arterial blood gas ',
      'CT': ' C-T ',
      'stat': ' immediately ',
      '\\+': ' plus ',
      '\\-': ' minus ',
      '\\/': ' per ',
      '=': ' equals ',
      '>': ' greater than ',
      '<': ' less than ',
      '>=': ' greater than or equal to ',
      '<=': ' less than or equal to ',
      'mmHg': ' millimeters of mercury ',
    };

    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      processed = processed.replace(regex, value);
    }

    // Breath and Rhythm: Insert subtle pauses at commas and logical breaks
    // Using periods for longer pauses and commas for shorter ones
    processed = processed.replace(/,/g, ', ');
    processed = processed.replace(/\. /g, '. ... ');
    processed = processed.replace(/: /g, ': ');

    return processed;
  }

  public speak(text: string, priority: 'normal' | 'high' | 'critical' = 'normal') {
    if (!this.isEnabled) return;

    // Stop any current speech
    this.stop();

    const processedText = this.preprocessText(text);
    const utterance = new SpeechSynthesisUtterance(processedText);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }

    // Tone: Stable, professional, and human-like
    // Lower pitch for more stability and less "robotic" feel
    utterance.pitch = 0.95; // Slightly lower for stability
    utterance.volume = 1.0;

    // Adjust rate based on priority, but keep it natural
    if (priority === 'high') {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
    } else if (priority === 'critical') {
      utterance.rate = 1.1;
      utterance.pitch = 1.05;
    } else {
      utterance.rate = 0.95; // Slightly slower for more "human" feel
    }

    this.synth.speak(utterance);
  }

  public stop() {
    this.synth.cancel();
  }
}

export const speechService = SpeechService.getInstance();
