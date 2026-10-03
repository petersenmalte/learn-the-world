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
  /** Reads a place name aloud with the browser's built-in speech synthesis (no network, no API key). */
  say(text: string) {
    if (this.muted || !text) return;
    try {
      const speech = globalThis.speechSynthesis;
      if (!speech || typeof SpeechSynthesisUtterance === 'undefined') return;
      speech.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      const voice = speech.getVoices().find(v => v.lang === 'en-GB') ?? speech.getVoices().find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      speech.speak(utterance);
    } catch { /* The written question remains available if speech is unsupported. */ }
  }
  silence() { try { globalThis.speechSynthesis?.cancel(); } catch { /* Speech is optional. */ } }
  close() { this.silence(); void this.context?.close().catch(() => {}); }
}
