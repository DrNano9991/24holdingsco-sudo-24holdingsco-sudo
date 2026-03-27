
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

  /**
   * Speech Recognition (STT)
   */
  public createRecognition(options: {
    lang?: string;
    continuous?: boolean;
    interimResults?: boolean;
    onResult?: (transcript: string, isFinal: boolean) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }) {
    if (!('webkitSpeechRecognition' in window)) {
      return null;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = options.lang || 'en-US';
    recognition.continuous = options.continuous || false;
    recognition.interimResults = options.interimResults || false;

    recognition.onstart = () => {
      if (options.onStart) options.onStart();
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const isFinal = event.results[event.results.length - 1].isFinal;
      if (options.onResult) options.onResult(transcript, isFinal);
    };

    recognition.onerror = (event: any) => {
      if (options.onError) options.onError(event.error);
    };

    recognition.onend = () => {
      if (options.onEnd) options.onEnd();
    };

    return recognition;
  }

  /**
   * Parses a command string and returns a structured command if matched
   */
  public parseCommand(text: string): { type: string; value?: any; field?: string } | null {
    const cmd = text.toLowerCase().trim();

    // Navigation Commands
    if (cmd.includes('go to') || cmd.includes('show') || cmd.includes('open')) {
      if (cmd.includes('summary') || cmd.includes('synthesis') || cmd.includes('ai')) return { type: 'NAVIGATE', value: 'summary' };
      if (cmd.includes('calculator')) return { type: 'NAVIGATE', value: 'calculators' };
      if (cmd.includes('prescription') || cmd.includes('medication') || cmd.includes('dosing')) return { type: 'NAVIGATE', value: 'prescription' };
      if (cmd.includes('exam') || cmd.includes('physical')) return { type: 'NAVIGATE', value: 'exam' };
      if (cmd.includes('patient') || cmd.includes('history') || cmd.includes('record')) return { type: 'NAVIGATE', value: 'patients' };
      if (cmd.includes('task') || cmd.includes('to do')) return { type: 'NAVIGATE', value: 'tasks' };
      if (cmd.includes('diagnostic') || cmd.includes('monitor') || cmd.includes('telemetry')) return { type: 'NAVIGATE', value: 'diagnostics' };
    }

    // Action Commands
    if (cmd.includes('add task')) {
      const taskText = cmd.split('add task')[1].trim();
      if (taskText) return { type: 'ADD_TASK', value: taskText };
    }

    if (cmd.includes('set weight to')) {
      const weightMatch = cmd.match(/set weight to (\d+(\.\d+)?)/);
      if (weightMatch) return { type: 'SET_WEIGHT', value: parseFloat(weightMatch[1]) };
    }

    if (cmd.includes('patient name is') || cmd.includes('set patient name to')) {
      const name = cmd.includes('patient name is') ? cmd.split('patient name is')[1].trim() : cmd.split('set patient name to')[1].trim();
      if (name) return { type: 'SET_PATIENT_NAME', value: name };
    }

    if (cmd.includes('generate') || cmd.includes('synthesize') || cmd.includes('analyze')) {
      return { type: 'GENERATE_INSIGHT' };
    }

    if (cmd.includes('stop') || cmd.includes('cancel') || cmd.includes('quiet')) {
      return { type: 'STOP_SPEECH' };
    }

    if (cmd.includes('night mode') || cmd.includes('dark mode')) {
      return { type: 'TOGGLE_NIGHT_MODE' };
    }

    if (cmd.includes('eye comfort')) {
      return { type: 'TOGGLE_EYE_COMFORT' };
    }

    // Synthesis Options
    if (cmd.includes('depth')) {
      if (cmd.includes('concise')) return { type: 'SET_DEPTH', value: 'Concise' };
      if (cmd.includes('detailed')) return { type: 'SET_DEPTH', value: 'Detailed' };
      if (cmd.includes('standard')) return { type: 'SET_DEPTH', value: 'Standard' };
    }

    if (cmd.includes('focus')) {
      if (cmd.includes('clinical')) return { type: 'SET_FOCUS', value: 'Clinical' };
      if (cmd.includes('surgical')) return { type: 'SET_FOCUS', value: 'Surgical' };
      if (cmd.includes('nursing')) return { type: 'SET_FOCUS', value: 'Nursing' };
      if (cmd.includes('diagnostic')) return { type: 'SET_FOCUS', value: 'Diagnostic' };
    }

    // Exam Input Commands
    if (cmd.includes('jvp')) {
      const match = cmd.match(/jvp (\d+)/);
      if (match) return { type: 'SET_EXAM', field: 'jvp', value: parseInt(match[1]) };
    }
    if (cmd.includes('capillary refill')) {
      const match = cmd.match(/capillary refill (\d+)/);
      if (match) return { type: 'SET_EXAM', field: 'capRefill', value: parseInt(match[1]) };
    }
    if (cmd.includes('skin turgor')) {
      if (cmd.includes('normal')) return { type: 'SET_EXAM', field: 'skinTurgor', value: 'Normal' };
      if (cmd.includes('poor')) return { type: 'SET_EXAM', field: 'skinTurgor', value: 'Poor' };
      if (cmd.includes('very poor')) return { type: 'SET_EXAM', field: 'skinTurgor', value: 'Very Poor' };
    }
    if (cmd.includes('mucosa')) {
      if (cmd.includes('moist')) return { type: 'SET_EXAM', field: 'mucosa', value: 'Moist' };
      if (cmd.includes('dry')) return { type: 'SET_EXAM', field: 'mucosa', value: 'Dry' };
      if (cmd.includes('parched')) return { type: 'SET_EXAM', field: 'mucosa', value: 'Parched' };
    }

    return null;
  }
}

export const speechService = SpeechService.getInstance();
