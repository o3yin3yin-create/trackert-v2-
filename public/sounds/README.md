# 🎧 Ambient Sound Library Audio Assets

This directory contains the looping audio files for the Ambient Sound Library in the study partner app.

> [!NOTE]
> Noise generators (**White Noise**, **Pink Noise**, **Brown Noise**, and **Green Noise**) are synthesized **100% procedurally in code** via the Web Audio API and do **NOT** require any audio files!
>
> If any audio file below is not yet present, the app's audio engine automatically synthesizes an atmospheric procedural ambient wash as a zero-crash fallback.

---

## 📁 Expected Audio File Names & Formats

All audio files should be placed directly in this directory (`/public/sounds/`).

| File Name | Sound Name | Category | Recommended Length | Suggested Format | Target Audio Characteristics |
|---|---|---|---|---|---|
| `rain.mp3` | Gentle Rain | Nature | 30s - 90s | MP3 / OGG (128kbps) | Soft, steady rain without harsh high frequencies |
| `heavy-rain.mp3` | Heavy Rain | Nature | 30s - 90s | MP3 / OGG (128kbps) | Rich, immersive downpour |
| `thunderstorm.mp3` | Soft Thunder | Nature | 45s - 120s | MP3 / OGG (128kbps) | Distant, deep rolling thunder claps (no sudden startling cracks) |
| `ocean-waves.mp3` | Ocean Waves | Nature | 45s - 90s | MP3 / OGG (128kbps) | Rhythmic ebb and flow on a sandy beach |
| `river-stream.mp3` | River Stream | Nature | 30s - 60s | MP3 / OGG (128kbps) | Babbling creek or mountain stream over pebbles |
| `wind.mp3` | Gentle Wind | Nature | 30s - 60s | MP3 / OGG (128kbps) | Ambient mountain breeze through pine trees |
| `forest-birds.mp3` | Forest Birds | Nature | 45s - 90s | MP3 / OGG (128kbps) | Gentle morning birdsong and woodland atmosphere |
| `night-crickets.mp3` | Night Crickets | Nature | 30s - 60s | MP3 / OGG (128kbps) | Summer night chirping crickets |
| `cafe.mp3` | Quiet Cafe | Places | 60s - 120s | MP3 / OGG (128kbps) | Distant chatter, muted espresso machine, ceramic cups |
| `library.mp3` | Academic Library | Places | 45s - 90s | MP3 / OGG (128kbps) | Deep room tone, quiet page turning |
| `train.mp3` | Train Journey | Places | 45s - 90s | MP3 / OGG (128kbps) | Rhythmic carriage rumble on tracks |
| `airplane.mp3` | Airplane Cabin | Places | 30s - 60s | MP3 / OGG (128kbps) | Consistent jet engine cabin drone at cruise altitude |
| `fireplace.mp3` | Fireplace | Places | 30s - 60s | MP3 / OGG (128kbps) | Warm wood log crackles and embers |
| `desk-fan.mp3` | Desk Fan | Other | 30s - 60s | MP3 / OGG (128kbps) | Low-speed electric fan blades and hum |
| `keyboard.mp3` | Mechanical Typing | Other | 30s - 60s | MP3 / OGG (128kbps) | Tactile typing rhythm (linear or tactile switches) |
| `clock.mp3` | Clock Ticking | Other | 15s - 30s | MP3 / OGG (128kbps) | Precise 60 BPM or 120 BPM clock movement |
| `lofi-beats.mp3` | Lo-Fi Chill Beats | Other | 60s - 120s | MP3 / OGG (128kbps) | Chill instrumental chord progression (no vocals) |

---

## 🌐 Recommended Free & Legal Sound Sources

Use only **Creative Commons CC0 (Public Domain)** or **Pixabay License** tracks so that they can be bundled freely without licensing liabilities:

### 1. Freesound.org (Filter by CC0)
1. Go to [https://freesound.org](https://freesound.org)
2. In the search bar, search for your sound (e.g. `rain loop`, `cafe ambience`).
3. In the left filter panel under **Licenses**, select **Creative Commons 0**.
4. Download the WAV/MP3 file.

### 2. Pixabay Sound Effects (Free for commercial & personal use)
1. Go to [https://pixabay.com/sound-effects/](https://pixabay.com/sound-effects/)
2. Search for sounds like `rain`, `waves`, `keyboard typing`, `fireplace`.
3. All sounds are free under the Pixabay content license.

### 3. Loop Preparation Tips (Seamless Looping)
To ensure completely gapless playback:
1. Open the file in Audacity (free) or any audio editor.
2. Ensure the start and end of the audio wave cross zero (`Zero Crossing`).
3. Apply a short 10ms - 20ms crossfade between the end and the start of the loop.
4. Export as MP3 (constant 128 kbps or 160 kbps, Joint Stereo) or OGG Vorbis.
