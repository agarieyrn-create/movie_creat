import fs from 'fs';
import path from 'path';

interface ScriptLine {
  speaker: 'momo' | 'popo' | 'toto';
  text: string;
  displayText?: string;
  pauseAfter: number;
}

interface AudioResult {
  line: ScriptLine;
  audioPath: string;
  durationInFrames: number;
}

export async function generateAudioElevenLabs(
  lines: ScriptLine[],
  outputDir: string
): Promise<AudioResult[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const voiceId = process.env.ELEVENLABS_VOICE_ID!;
  const results: AudioResult[] = [];

  fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: line.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const audioBuffer = Buffer.from(data.audio_base64, 'base64');
    const audioPath = path.join(outputDir, `line_${i}.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    // 音声の長さを取得（ElevenLabsのwith-timestampsエンドポイントから）
    const lastChar = data.alignment?.characters?.at(-1);
    const durationSeconds = lastChar
      ? lastChar.end_time + line.pauseAfter
      : 3 + line.pauseAfter;

    // 既存の計算式を維持
    const durationInFrames = Math.ceil(durationSeconds * 30 * 1.2);

    results.push({ line, audioPath, durationInFrames });

    // レートリミット対策
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}
