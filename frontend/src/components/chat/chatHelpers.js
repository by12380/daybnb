export const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const CHAT_ATTACHMENT_ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar";

export function formatAttachmentSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageLikeMimeType(mimeType = "") {
  return typeof mimeType === "string" && mimeType.startsWith("image/");
}

export function isImageAttachment(message) {
  return isImageLikeMimeType(message?.attachment_mime_type);
}

export function getChatMessagePreview(message) {
  if (!message) return "Start chatting...";

  const text = typeof message.content === "string" ? message.content.trim() : "";
  if (text) return text;

  if (message.attachment_name) {
    return `Attachment: ${message.attachment_name}`;
  }

  if (message.attachment_url) {
    return "Attachment";
  }

  return "Start chatting...";
}
