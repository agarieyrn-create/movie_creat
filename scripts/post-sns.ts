import 'dotenv/config';
import { uploadToYouTube } from '../src/sns/youtube';
import { postToTwitter } from '../src/sns/twitter';
import { postToTikTok } from '../src/sns/tiktok';
import { VideoMetadata, SNSResult } from '../src/sns/types';

async function notify(message: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
}

/**
 * YouTube Shorts / Twitter(X) / TikTok に並列投稿する。
 * 各プラットフォームのエラーは他に影響しない。
 */
export async function postToAllSNS(meta: VideoMetadata): Promise<SNSResult[]> {
  console.log(`[SNS] 投稿開始: ${meta.videoPath}`);

  const tasks: Promise<SNSResult>[] = [
    uploadToYouTube(meta).catch((err): SNSResult => ({
      platform: 'youtube',
      success: false,
      error: err.message,
    })),
    postToTwitter(meta).catch((err): SNSResult => ({
      platform: 'twitter',
      success: false,
      error: err.message,
    })),
    postToTikTok(meta).catch((err): SNSResult => ({
      platform: 'tiktok',
      success: false,
      error: err.message,
    })),
  ];

  const results = await Promise.all(tasks);

  for (const r of results) {
    if (r.success) {
      console.log(`[${r.platform}] 投稿成功: ${r.url}`);
    } else {
      console.error(`[${r.platform}] 投稿失敗: ${r.error}`);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const summary = results
    .map((r) => `${r.platform}: ${r.success ? r.url ?? '✅' : '❌ ' + r.error}`)
    .join('\n');

  await notify(`📱 SNS投稿完了: ${successCount}/3 プラットフォーム成功\n${summary}`);

  return results;
}

// 単体実行: ts-node scripts/post-sns.ts <videoPath> [title]
if (require.main === module) {
  const videoPath = process.argv[2];
  if (!videoPath) {
    console.error('Usage: ts-node scripts/post-sns.ts <videoPath> [title]');
    process.exit(1);
  }

  const title = process.argv[3] ?? process.env.SNS_DEFAULT_TITLE ?? '動画';

  postToAllSNS({
    videoPath,
    title: `${title} #Shorts`,
    description: process.env.SNS_DEFAULT_DESCRIPTION ?? '',
    tags: ['AI', 'Shorts', 'Japanese'],
    hashtags: ['#Shorts', '#AI', '#shorts'],
  })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
