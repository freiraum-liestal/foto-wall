export const MEDIA_CONFIG = {
  IMAGE_MAX_WIDTH: 1600,
  IMAGE_MAX_HEIGHT: 1600,
  IMAGE_QUALITY: 0.82,
  IMAGE_MAX_SIZE_MB: 8,
  VIDEO_MAX_SIZE_MB: 50,
  VIDEO_MAX_DURATION_SECONDS: 30,
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/webm'] as const,
  TEXT_MAX_LENGTH: 500,
  STORAGE_BUCKET: 'event-media',
} as const;

