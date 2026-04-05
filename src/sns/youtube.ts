import { google } from 'googleapis';
import fs from 'fs';
import { VideoMetadata, SNSResult } from './types';

export async function uploadToYouTube(meta: VideoMetadata): Promise<SNSResult> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID!,
    process.env.YOUTUBE_CLIENT_SECRET!,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // ハッシュタグを説明文に含めてShorts自動分類を確実にする
  const description = [meta.description, '', ...meta.hashtags].join('\n');

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: meta.title,
        description,
        tags: meta.tags,
        categoryId: '22',  // People & Blogs
        defaultLanguage: 'ja',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(meta.videoPath),
    },
  });

  const videoId = response.data.id;
  return {
    platform: 'youtube',
    success: true,
    url: `https://youtube.com/shorts/${videoId}`,
  };
}
