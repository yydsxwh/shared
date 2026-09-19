/**
 * platform Storage / Files API 契约。
 *
 * 边界：platform 负责「对象存在哪、叫什么 key、谁能拿到、链接怎么签」；
 * 业务含义（这是哪门课的封面、哪个帖子的图）由产品自己的库记录 fileId 关联，
 * 不要把结构化业务数据塞进文件 metadata 或 OSS 上的 JSON 来代替数据库。
 *
 * 安全前提：OSS AccessKey 只存在 platform 服务端。浏览器拿到的永远是
 * 短期签名 URL，过期即失效。
 */

/** 对象实际落在哪个后端 */
export const STORAGE_PROVIDERS = ["LOCAL", "ALIYUN_OSS", "ALIYUN_VOD"] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

/**
 * namespace = 一类文件的存放区与策略边界（允许的 MIME、大小上限、默认可见性）。
 * 对象 key 一律带 namespace 前缀，避免不同业务互相覆盖。
 */
export type StorageNamespace = string;

export const FILE_VISIBILITIES = ["PUBLIC", "PRIVATE"] as const;
/** PUBLIC=可直链读取；PRIVATE=每次都要换短期签名 URL */
export type FileVisibility = (typeof FILE_VISIBILITIES)[number];

export const FILE_STATUSES = ["PENDING", "READY", "DELETED"] as const;
/** PENDING=已建记录但字节还没传完，此时不可下载 */
export type FileStatus = (typeof FILE_STATUSES)[number];

export type FileRecord = {
  fileId: string;
  namespace: StorageNamespace;
  /** 对象存储里的完整 key，产品侧不要自己拼 */
  key: string;
  provider: StorageProvider;
  fileName: string;
  mimeType: string;
  size: number;
  visibility: FileVisibility;
  status: FileStatus;
  /** 上传方的业务身份（站点自己的 user id，将来是全局 user sub） */
  ownerId: string | null;
  /** 哪个站点传的 */
  clientId: string;
  /** 由 platform 计算或上传方申报，用于下载校验 */
  checksum: string | null;
  /** 少量标签，便于排查与运营，不承担业务数据职责 */
  labels: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

/** namespace 的策略，供调用方前端提前校验，避免传完才被拒 */
export type NamespacePolicy = {
  namespace: StorageNamespace;
  provider: StorageProvider;
  defaultVisibility: FileVisibility;
  maxBytes: number;
  /** 空数组表示不限 MIME（仍受扩展名与大小限制） */
  allowedMimeTypes: string[];
  /** 是否允许浏览器直传（大文件必须直传，不能经服务端中转） */
  allowDirectUpload: boolean;
};

// ---------------------------------------------------------------------------
// 直传（签名上传）
// ---------------------------------------------------------------------------

export type CreateUploadRequest = {
  namespace: StorageNamespace;
  fileName: string;
  mimeType: string;
  size: number;
  ownerId?: string;
  visibility?: FileVisibility;
  labels?: Record<string, string>;
  /** 大文件分片直传；平台据此下发分片签名而不是单条 PUT */
  multipart?: boolean;
};

/** 浏览器照此发起上传；platform 不下发任何长期密钥 */
export type SignedUploadTarget = {
  method: "PUT" | "POST";
  url: string;
  headers: Record<string, string>;
  /** POST 表单直传时的附加字段 */
  formFields?: Record<string, string>;
  expiresAt: string;
};

export type CreateUploadResponse = {
  file: FileRecord;
  /** multipart=true 时为空，改用 parts 接口逐片签名 */
  upload: SignedUploadTarget | null;
  multipart: {
    uploadId: string;
    /** 建议分片大小；最后一片可小于此值 */
    partSizeBytes: number;
  } | null;
};

export type SignMultipartPartsRequest = {
  uploadId: string;
  /** 从 1 开始，与 OSS partNumber 一致 */
  partNumbers: number[];
};

export type SignMultipartPartsResponse = {
  parts: Array<{
    partNumber: number;
    url: string;
    headers: Record<string, string>;
    expiresAt: string;
  }>;
};

export type CompleteMultipartRequest = {
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
};

export type CompleteUploadRequest = {
  /** 上传方申报的实际字节数，与建记录时不符会被拒 */
  size?: number;
  checksum?: string;
};

// ---------------------------------------------------------------------------
// 服务端代传（小文件）
// ---------------------------------------------------------------------------

/**
 * 经 platform 中转上传，适合头像等小文件。
 * 大文件必须走直传，否则会在中间节点缓冲整包。
 */
export type ProxyUploadFields = {
  namespace: StorageNamespace;
  ownerId?: string;
  visibility?: FileVisibility;
  fileName?: string;
  labels?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// 下载
// ---------------------------------------------------------------------------

export type CreateDownloadUrlRequest = {
  /** 签名有效期，受 namespace 上限约束 */
  expiresInSeconds?: number;
  /** 指定后浏览器按此文件名另存 */
  downloadFileName?: string;
};

export type CreateDownloadUrlResponse = {
  url: string;
  expiresAt: string;
  /** PUBLIC 对象返回的是可缓存直链，没有过期时间语义 */
  signed: boolean;
};

export type ListFilesQuery = {
  namespace?: StorageNamespace;
  ownerId?: string;
  status?: FileStatus;
  limit?: number;
  cursor?: string;
};

export type ListFilesResponse = {
  files: FileRecord[];
  nextCursor: string | null;
};
