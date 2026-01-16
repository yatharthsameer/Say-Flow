import fs from 'fs';
import path from 'path';

interface MultipartField {
  name: string;
  value: string | Buffer;
  filename?: string;
  contentType?: string;
}

export const buildMultipartBody = (
  fields: MultipartField[],
  boundary: string
): Buffer => {
  const parts: Buffer[] = [];

  for (const field of fields) {
    let header = `--${boundary}\r\n`;
    
    if (field.filename) {
      header += `Content-Disposition: form-data; name="${field.name}"; filename="${field.filename}"\r\n`;
      header += `Content-Type: ${field.contentType || 'application/octet-stream'}\r\n`;
    } else {
      header += `Content-Disposition: form-data; name="${field.name}"\r\n`;
    }
    
    header += '\r\n';
    
    parts.push(Buffer.from(header, 'utf-8'));
    parts.push(Buffer.isBuffer(field.value) ? field.value : Buffer.from(field.value, 'utf-8'));
    parts.push(Buffer.from('\r\n', 'utf-8'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));

  return Buffer.concat(parts);
};

export interface TranscriptionFormParams {
  audioPath: string;
  durationMs: number;
  audioFormat: string;
  language: string;
  provider?: string;
  model?: string;
}

export const createMultipartFormData = async (
  params: TranscriptionFormParams
): Promise<{ body: Buffer; contentType: string }> => {
  const boundary = `----FormBoundary${Date.now()}`;
  const audioBuffer = fs.readFileSync(params.audioPath);
  const filename = path.basename(params.audioPath);

  const fields: MultipartField[] = [
    {
      name: 'audio',
      value: audioBuffer,
      filename,
      contentType: 'audio/webm',
    },
    { name: 'duration_ms', value: String(params.durationMs) },
    { name: 'audio_format', value: params.audioFormat },
    { name: 'language', value: params.language },
  ];

  // Add provider and model if specified
  if (params.provider) {
    fields.push({ name: 'provider', value: params.provider });
  }
  if (params.model) {
    fields.push({ name: 'model', value: params.model });
  }

  const body = buildMultipartBody(fields, boundary);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
};
