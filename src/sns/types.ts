export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];       // YouTube用タグ配列
  hashtags: string[];   // Twitter/TikTok用テキスト埋め込み形式 例: ["#AI", "#Shorts"]
  videoPath: string;    // mp4ファイルの絶対パス
}

export interface SNSResult {
  platform: 'youtube' | 'twitter' | 'tiktok';
  success: boolean;
  url?: string;
  error?: string;
}
