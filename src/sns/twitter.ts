import { TwitterApi } from 'twitter-api-v2';
import { VideoMetadata, SNSResult } from './types';

export async function postToTwitter(meta: VideoMetadata): Promise<SNSResult> {
  const client = new TwitterApi({
    appKey:      process.env.TWITTER_API_KEY!,
    appSecret:   process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });

  // チャンク動画アップロード（INIT/APPEND/FINALIZE/STATUSを自動処理）
  const mediaId = await client.v1.uploadMedia(meta.videoPath, {
    mimeType: 'video/mp4',
  });

  // ツイートテキスト: タイトル + 改行 + ハッシュタグ、280字以内
  const tweetText = [meta.title, '', ...meta.hashtags].join('\n').slice(0, 280);

  const tweet = await client.v2.tweet({
    text: tweetText,
    media: { media_ids: [mediaId] },
  });

  return {
    platform: 'twitter',
    success: true,
    url: `https://x.com/i/web/status/${tweet.data.id}`,
  };
}
