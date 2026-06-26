import type { Request } from 'express';

import {

  BINARY_REDACTED_PREFIX,

  CEDULA_FIELD_PATTERN,

  REDACTED_VALUE,

  SENSITIVE_FIELD_PATTERN,

} from '../audit.constants';



function isPlainObject(value: unknown): value is Record<string, unknown> {

  return typeof value === 'object' && value !== null && !Array.isArray(value);

}



export function maskCedula(value: string): string {

  const trimmed = value.trim();



  if (trimmed.length <= 4) {

    return '***';

  }



  if (trimmed.length <= 7) {

    return `${trimmed.slice(0, 2)}***${trimmed.slice(-1)}`;

  }



  return `${trimmed.slice(0, 4)}***${trimmed.slice(-3)}`;

}



function redactUploadedFileMetadata(file: Express.Multer.File): string {

  const safeName = file.originalname?.slice(0, 120) ?? 'unknown';

  const safeMime = file.mimetype?.slice(0, 64) ?? 'unknown';



  return `${BINARY_REDACTED_PREFIX}:filename=${safeName},size=${file.size},mimetype=${safeMime}]`;

}



function appendUploadedFilesRedaction(

  sanitized: Record<string, unknown>,

  request: Request,

): void {

  if (request.file) {

    sanitized.file = redactUploadedFileMetadata(request.file);

  }



  const { files } = request;



  if (!files) {

    return;

  }



  if (Array.isArray(files)) {

    if (files.length > 0) {

      sanitized.files = files.map(redactUploadedFileMetadata);

    }

    return;

  }



  const fieldsRecord = files as Record<string, Express.Multer.File[]>;



  for (const [fieldName, fieldFiles] of Object.entries(fieldsRecord)) {

    if (!Array.isArray(fieldFiles) || fieldFiles.length === 0) {

      continue;

    }



    sanitized[fieldName] = fieldFiles.map(redactUploadedFileMetadata);

  }

}



function sanitizeValue(key: string, value: unknown): unknown {

  if (SENSITIVE_FIELD_PATTERN.test(key)) {

    return REDACTED_VALUE;

  }



  if (CEDULA_FIELD_PATTERN.test(key) && typeof value === 'string') {

    return maskCedula(value);

  }



  if (Array.isArray(value)) {

    return value.map((item, index) =>

      sanitizeValue(String(index), item),

    );

  }



  if (isPlainObject(value)) {

    return sanitizeRecord(value);

  }



  return value;

}



export function sanitizeRecord(

  record: Record<string, unknown>,

): Record<string, unknown> {

  const sanitized: Record<string, unknown> = {};



  for (const [key, value] of Object.entries(record)) {

    sanitized[key] = sanitizeValue(key, value);

  }



  return sanitized;

}



export function sanitizeAuditBody(

  request: Request,

): Record<string, unknown> | null {

  const body = request.body;

  const hasBody =

    body && typeof body === 'object' && Object.keys(body).length > 0;

  const hasUploads = Boolean(

    request.file ||

      (Array.isArray(request.files) && request.files.length > 0) ||

      (request.files &&

        !Array.isArray(request.files) &&

        Object.keys(request.files).length > 0),

  );



  if (hasBody) {

    const sanitized = sanitizeRecord(body as Record<string, unknown>);

    appendUploadedFilesRedaction(sanitized, request);

    return sanitized;

  }



  if (hasUploads) {

    const sanitized: Record<string, unknown> = {};

    appendUploadedFilesRedaction(sanitized, request);

    return sanitized;

  }



  return null;

}



export function sanitizeRouteParams(

  params: Request['params'],

): Record<string, unknown> | null {

  if (!params || Object.keys(params).length === 0) {

    return null;

  }



  return sanitizeRecord(params as Record<string, unknown>);

}



export function sanitizeQueryParams(

  query: Request['query'],

): Record<string, unknown> | null {

  if (!query || Object.keys(query).length === 0) {

    return null;

  }



  return sanitizeRecord(query as Record<string, unknown>);

}


