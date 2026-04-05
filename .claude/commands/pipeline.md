# /pipeline — フルパイプライン実行

script.json または Google Sheets から台本を読み込み、ElevenLabs TTS → Remotion レンダリング → SNS自動投稿（YouTube Shorts / Twitter / TikTok）まで一気通貫で実行する。

## 手順

1. `.env` に必要な環境変数がすべて設定されているか確認する
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
   - `YOUTUBE_*`, `TWITTER_*`, `TIKTOK_*`
2. `script.json` が存在するか確認する。なければ Google Sheets から取得する旨をユーザーに伝える
3. 以下のコマンドを実行する:

```bash
npm run pipeline
```

4. 実行後、`output/<timestamp>/output.mp4` が生成され、各SNSへの投稿結果をDiscord通知で確認できることをユーザーに伝える

## エラー時

- ElevenLabs エラー → APIキーまたはボイスIDを確認するよう伝える
- Remotion レンダリングエラー → `src/index.ts` が存在するか確認する
- SNS投稿エラー → `scripts/post-sns.ts` を単体実行してデバッグするよう提案する
