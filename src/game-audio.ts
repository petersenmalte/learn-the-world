export const tones = { correct: [660, 880], wrong: [260, 190] } as const;
export class GameAudio {
  muted = false;
  private context?: AudioContext;
  constructor() { try { this.muted = localStorage.getItem('learning-muted') === 'true'; } catch { /* Storage is optional. */ } }
  toggle() { this.muted = !this.muted; if (this.muted) this.silence(); try { localStorage.setItem('learning-muted', String(this.muted)); } catch { /* Private browsing. */ } return this.muted; }
  async play(correct: boolean) {
    if (this.muted) return;
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      await context.resume();
      if (this.muted || context.state !== 'running') return;
      const start = context.currentTime;
      tones[correct ? 'correct' : 'wrong'].forEach((frequency, i) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const at = start + i * 0.085;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.045, at + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.105);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(at); oscillator.stop(at + 0.115);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Visual feedback remains usable if audio is unavailable. */ }
  }
  private utterance?: SpeechSynthesisUtterance;
  private pendingSpeech?: string;
  private unlockArmed = false;
  /** Reads a place name aloud with the browser's built-in speech synthesis (no network, no API key). */
  say(text: string) {
    if (this.muted || !text) return;
    try {
      const speech = globalThis.speechSynthesis;
      if (!speech || typeof SpeechSynthesisUtterance === 'undefined') return;
      // Browsers block speech until the page has had a user gesture (e.g. a direct link or reload).
      // Remember the name and say it on the first click or key press instead of dropping it.
      const activation = (globalThis.navigator as Navigator | undefined)?.userActivation;
      if (activation && !activation.hasBeenActive) { this.waitForGesture(text); return; }
      if (speech.speaking || speech.pending) speech.cancel();
      speech.resume();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      const voices = speech.getVoices();
      const voice = voices.find(v => v.lang === 'en-GB') ?? voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onerror = event => { if (event.error === 'not-allowed') this.waitForGesture(text); };
      this.utterance = utterance; // Keep a reference: some engines stop speaking when it is garbage-collected.
      speech.speak(utterance);
    } catch { /* The written question remains available if speech is unsupported. */ }
  }
  private waitForGesture(text: string) {
    this.pendingSpeech = text;
    if (this.unlockArmed || typeof addEventListener !== 'function') return;
    this.unlockArmed = true;
    const unlock = () => {
      removeEventListener('pointerdown', unlock, true); removeEventListener('keydown', unlock, true);
      this.unlockArmed = false;
      const pending = this.pendingSpeech; this.pendingSpeech = undefined;
      if (pending) this.say(pending);
    };
    addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);
  }
  silence() { this.pendingSpeech = undefined; try { globalThis.speechSynthesis?.cancel(); } catch { /* Speech is optional. */ } }
  close() { this.silence(); void this.context?.close().catch(() => {}); }
}
