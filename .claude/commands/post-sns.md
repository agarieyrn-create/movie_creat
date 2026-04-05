# /post-sns — 既存動画をSNSへ投稿

レンダリング済みの mp4 ファイルを YouTube Shorts / Twitter(X) / TikTok に並列投稿する。
`$ARGUMENTS` に動画ファイルパスを渡す（例: `/post-sns output/2026-04-05/output.mp4`）。

## 手順

1. 引数からビデオパスを取得する。引数がなければユーザーに投稿したい動画パスを聞く
2. `.env` の SNS 関連キーが設定されているか確認する
3. 以下のコマンドを実行する:

```bash
npx ts-node scripts/post-sns.ts $ARGUMENTS
```

4. 3プラットフォームの投稿結果（成功URL または エラー内容）をユーザーに報告する

## プラットフォーム別注意事項

- **YouTube Shorts**: タイトルに `#Shorts` が含まれていることで自動分類される。縦型1080×1920が必須
- **Twitter/X**: 動画は2分20秒以内。ツイートは280文字以内に自動トリミングされる
- **TikTok**: アクセストークンは24時間で失効するため、毎回リフレッシュが実行される。`TIKTOK_REFRESH_TOKEN` が `.env` に書き戻される
