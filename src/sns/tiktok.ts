import fs from 'fs';
import path from 'path';
import { VideoMetadata, SNSResult } from './types';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com';

/**
 * アクセストークンをリフレッシュする。
 * TikTokのアクセストークンは24時間で失効するため毎回リフレッシュする。
 * NOTE: 本番運用では新しいrefresh_tokenを.envに書き戻す処理が必要。
 */
async function refreshTikTokToken(): Promise<string> {
  const res = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key:    process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type:    'refresh_token',
      refresh_token: process.env.TIKTOK_REFRESH_TOKEN!,
    }),
  });

  if (!res.ok) {
    throw new Error(`TikTok token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { access_token: string; refresh_token: string };

  // 新しいrefresh_tokenを.envに書き戻す（ローテーション対応）
  if (data.refresh_token && data.refresh_token !== process.env.TIKTOK_REFRESH_TOKEN) {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      fs.writeFileSync(
        envPath,
        envContent.replace(
          /^TIKTOK_REFRESH_TOKEN=.*/m,
          `TIKTOK_REFRESH_TOKEN=${data.refresh_token}`
        )
      );
    }
  }

  return data.access_token;
}

export async function postToTikTok(meta: VideoMetadata): Promise<SNSResult> {
  const accessToken = await refreshTikTokToken();
  const fileBuffer = fs.readFileSync(meta.videoPath);
  const fileSize = fileBuffer.length;

  // Phase 1: アップロード初期化
  const initRes = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: [meta.title, ...meta.hashtags].join(' ').slice(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: fileSize,  // 64MB未満は1チャンクで送信
        total_chunk_count: 1,
      },
    }),
  });

  if (!initRes.ok) {
    throw new Error(`TikTok init failed: ${initRes.status} ${await initRes.text()}`);
  }

  const initData = await initRes.json() as {
    data: { publish_id: string; upload_url: string };
  };
  const { publish_id, upload_url } = initData.data;

  // Phase 2: 動画バイト列をPUT
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`TikTok upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  // Phase 3: 公開完了をポーリング（最大150秒）
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id }),
    });

    const statusData = await statusRes.json() as {
      data: { status: string; publicaly_available_post_id?: string[] };
    };

    if (statusData.data.status === 'PUBLISH_COMPLETE') {
      const postId = statusData.data.publicaly_available_post_id?.[0];
      return {
        platform: 'tiktok',
        success: true,
        url: postId ? `https://tiktok.com/@me/video/${postId}` : undefined,
      };
    }

    if (statusData.data.status === 'FAILED') {
      throw new Error('TikTok processing failed');
    }
  }

  throw new Error('TikTok upload timed out after 150 seconds');
}
