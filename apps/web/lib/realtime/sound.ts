"use client";

let context: AudioContext | null = null;
let unlockInstalled = false;

function audioContext(): AudioContext | null {
  if (context) return context;
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return null;
  }
  context = new AudioContext();
  return context;
}

/**
 * Browsers keep audio suspended until the page gets a user gesture, so the
 * context is created and resumed on the first click or key press.
 */
export function unlockSoundOnGesture(): void {
  if (unlockInstalled || typeof window === "undefined") return;
  unlockInstalled = true;
  const unlock = () => {
    void audioContext()?.resume();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

/** A soft two-note chime, synthesized so there's no file to load. */
export function playNotificationSound(): void {
  const audio = audioContext();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  const start = audio.currentTime + 0.01;
  const notes = [
    { frequency: 880, at: 0 },
    { frequency: 1318.5, at: 0.12 },
  ];
  for (const note of notes) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = note.frequency;
    const noteStart = start + note.at;
    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.4);
  }
}

/** Whether the page is out of the visitor's or owner's sight. Inside an iframe, the host page having focus counts as away. */
export function pageInBackground(): boolean {
  return document.visibilityState !== "visible" || !document.hasFocus();
}
