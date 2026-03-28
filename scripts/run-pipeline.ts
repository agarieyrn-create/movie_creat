import 'dotenv/config';
import { generateAudioElevenLabs } from '../src/tts/elevenlabs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function notify(message: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
}

async function fetchScriptFromSheet(): Promise<any[]> {
  // Google Sheets APIから台本取得
  // 既存のGAS連携がある場合はそちらを優先すること
  const sheetId = process.env.GOOGLE_SHEET_ID!;
  const range = process.env.GOOGLE_SHEET_RANGE!;
  const apiKey = process.env.GOOGLE_API_KEY!;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.values ?? [];
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join('output', timestamp);
  const audioDir = path.join(outputDir, 'audio');

  try {
    await notify(`🎬 パイプライン開始: ${timestamp}`);

    // 台本取得（Google Sheetsまたはローカルのscript.jsonを使用）
    let lines;
    if (fs.existsSync('script.json')) {
      lines = JSON.parse(fs.readFileSync('script.json', 'utf-8'));
    } else {
      const rows = await fetchScriptFromSheet();
      lines = rows.map(([speaker, text, displayText, pauseAfter]: string[]) => ({
        speaker,
        text,
        displayText: displayText || text,
        pauseAfter: Number(pauseAfter) || 0,
      }));
    }

    // TTS生成
    const provider = process.env.TTS_PROVIDER ?? 'elevenlabs';
    let audioResults;

    if (provider === 'elevenlabs') {
      audioResults = await generateAudioElevenLabs(lines, audioDir);
    } else {
      throw new Error(`Unknown TTS provider: ${provider}`);
    }

    // Remotionでレンダリング（縦型1080x1920）
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'output.mp4');

    execSync(
      `npx remotion render src/index.ts Main ${outputPath} \
        --props='${JSON.stringify({ audioResults })}' \
        --width=1080 --height=1920`,
      { stdio: 'inherit' }
    );

    await notify(`✅ 完成: ${outputPath}`);
    console.log(`Done: ${outputPath}`);

  } catch (err: any) {
    await notify(`❌ エラー発生: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main();
