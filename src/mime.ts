/**
 * MIME types by file extension, for uploads sent without --mime-type.
 *
 * The SDK infers a type from the file name too, but its table covers about 30
 * extensions; anything else goes up as application/octet-stream, which an agent
 * that declares the file types it accepts rejects. This is a superset of the
 * SDK's table, with the same values where both have an entry.
 */
const MIME_TYPES: Readonly<Record<string, string>> = {
  // text
  txt: "text/plain",
  text: "text/plain",
  log: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  xml: "text/xml",
  yaml: "application/yaml",
  yml: "application/yaml",
  ics: "text/calendar",
  vtt: "text/vtt",
  srt: "application/x-subrip",
  rtf: "application/rtf",
  eml: "message/rfc822",
  // data
  json: "application/json",
  jsonl: "application/jsonl",
  ndjson: "application/x-ndjson",
  geojson: "application/geo+json",
  // documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  dot: "application/msword",
  dotx: "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  msg: "application/vnd.ms-outlook",
  epub: "application/epub+zip",
  // archives
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  "7z": "application/x-7z-compressed",
  // images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/vnd.microsoft.icon",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  // audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  weba: "audio/webm",
  // video
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
};

/** The MIME type for a file name's extension, or undefined when it is unknown. */
export function mimeTypeForFileName(fileName: string): string | undefined {
  // Like the SDK, the text after the last dot is the extension, so ".json" is JSON.
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return undefined;
  return MIME_TYPES[fileName.slice(dot + 1).toLowerCase()];
}
