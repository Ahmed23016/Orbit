"""Synthesises Orbit's notification sounds (original, royalty-free).

Usage: python scripts/generate_sounds.py   (standard library only)

Writes 16-bit mono WAV files to:
  android/app/src/main/res/raw/orbit_<name>.wav   (notification channels)
  public/sounds/orbit_<name>.wav                  (previews in the app)
"""

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RATE = 22050


def note(buffer, start, freq, partials, decay, attack=0.006, gain=1.0):
    """Adds a struck tone: harmonic `partials` [(ratio, amp)] with exponential decay."""
    begin = int(start * RATE)
    length = len(buffer) - begin
    for i in range(length):
        t = i / RATE
        envelope = min(1.0, t / attack) * math.exp(-t / decay)
        if envelope < 1e-4 and t > attack:
            break
        sample = 0.0
        for ratio, amp in partials:
            # Higher partials die away faster, as in real bells.
            sample += amp * math.exp(-t * (ratio - 1) * 0.35) * math.sin(2 * math.pi * freq * ratio * t)
        buffer[begin + i] += gain * envelope * sample


def finish(buffer, peak=0.7, fade=0.25):
    top = max(abs(x) for x in buffer) or 1.0
    fade_samples = int(fade * RATE)
    out = []
    for i, x in enumerate(buffer):
        f = min(1.0, (len(buffer) - i) / fade_samples)
        out.append(int(max(-1.0, min(1.0, x / top * peak * f)) * 32767))
    return out


def write(name, samples):
    for path in (
        ROOT / f"android/app/src/main/res/raw/orbit_{name}.wav",
        ROOT / f"public/sounds/orbit_{name}.wav",
    ):
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            wav.writeframes(struct.pack(f"<{len(samples)}h", *samples))
        print("wrote", path.relative_to(ROOT), f"{len(samples) / RATE:.1f}s")


def chime():
    """Two soft glass tones, rising."""
    buf = [0.0] * int(3.2 * RATE)
    partials = [(1, 1.0), (2.0, 0.25), (3.01, 0.1)]
    note(buf, 0.0, 880.0, partials, decay=1.1)
    note(buf, 0.32, 1318.5, partials, decay=1.3, gain=0.85)
    return finish(buf)


def bowl():
    """A Tibetan-style singing bowl with a slow shimmer."""
    buf = [0.0] * int(7.0 * RATE)
    partials = [(1, 1.0), (2.71, 0.45), (5.15, 0.2), (8.1, 0.08)]
    note(buf, 0.0, 196.0, partials, decay=3.2, attack=0.03)
    # A slightly detuned twin makes the gentle beating of a real bowl.
    note(buf, 0.0, 196.6, partials, decay=3.0, attack=0.03, gain=0.6)
    return finish(buf)


def bells():
    """Three descending bell strikes."""
    buf = [0.0] * int(4.6 * RATE)
    partials = [(1, 1.0), (2.0, 0.5), (2.4, 0.3), (3.0, 0.2), (4.2, 0.1)]
    for i, freq in enumerate((783.99, 659.25, 523.25)):
        note(buf, i * 0.45, freq, partials, decay=1.5, gain=1.0 - i * 0.08)
    return finish(buf)


def dawn():
    """A slow, quiet rising arpeggio for Fajr."""
    buf = [0.0] * int(5.4 * RATE)
    partials = [(1, 1.0), (2.0, 0.18)]
    for i, freq in enumerate((523.25, 659.25, 783.99, 1046.5)):
        note(buf, i * 0.42, freq, partials, decay=2.0, attack=0.08, gain=0.7 + i * 0.08)
    return finish(buf, peak=0.55)


if __name__ == "__main__":
    write("chime", chime())
    write("bowl", bowl())
    write("bells", bells())
    write("dawn", dawn())
