/** platform Storage / Files 客户端 */

import type {
  CompleteMultipartRequest,
  CompleteUploadRequest,
  CreateDownloadUrlRequest,
  CreateDownloadUrlResponse,
  CreateUploadRequest,
  CreateUploadResponse,
  FileRecord,
  ListFilesQuery,
  ListFilesResponse,
  NamespacePolicy,
  ProxyUploadFields,
  SignMultipartPartsRequest,
  SignMultipartPartsResponse,
} from "../contracts/storage";
import type { PlatformHttpClient } from "./http";

export class StorageClient {
  constructor(private readonly http: PlatformHttpClient) {}

  /** 取 namespace 策略，前端据此提前拦掉超限/非法类型，少传一趟 */
  getNamespacePolicy(namespace: string): Promise<NamespacePolicy> {
    return this.http.request(`/storage/namespaces/${encodeURIComponent(namespace)}`);
  }

  /** 申请直传：返回短期签名地址，浏览器据此上传，不接触任何长期密钥 */
  createUpload(input: CreateUploadRequest): Promise<CreateUploadResponse> {
    return this.http.request("/storage/uploads", { method: "POST", json: input });
  }

  signMultipartParts(
    fileId: string,
    input: SignMultipartPartsRequest,
  ): Promise<SignMultipartPartsResponse> {
    return this.http.request(
      `/storage/files/${encodeURIComponent(fileId)}/multipart/parts`,
      { method: "POST", json: input },
    );
  }

  completeMultipart(
    fileId: string,
    input: CompleteMultipartRequest,
  ): Promise<FileRecord> {
    return this.http.request(
      `/storage/files/${encodeURIComponent(fileId)}/multipart/complete`,
      { method: "POST", json: input },
    );
  }

  /** 直传完成后回执；未回执的文件保持 PENDING，不可下载 */
  completeUpload(
    fileId: string,
    input: CompleteUploadRequest = {},
  ): Promise<FileRecord> {
    return this.http.request(
      `/storage/files/${encodeURIComponent(fileId)}/complete`,
      { method: "POST", json: input },
    );
  }

  /** 小文件经 platform 中转；大文件请用 createUpload 直传 */
  async proxyUpload(
    file: Blob,
    fields: ProxyUploadFields & { fileName: string },
  ): Promise<FileRecord> {
    const form = new FormData();
    form.set("file", file, fields.fileName);
    form.set("namespace", fields.namespace);
    if (fields.ownerId) form.set("ownerId", fields.ownerId);
    if (fields.visibility) form.set("visibility", fields.visibility);
    if (fields.labels) form.set("labels", JSON.stringify(fields.labels));
    return this.http.request("/storage/files", { method: "POST", body: form });
  }

  getFile(fileId: string): Promise<FileRecord> {
    return this.http.request(`/storage/files/${encodeURIComponent(fileId)}`);
  }

  listFiles(query: ListFilesQuery = {}): Promise<ListFilesResponse> {
    return this.http.request("/storage/files", {
      query: {
        namespace: query.namespace,
        ownerId: query.ownerId,
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      },
    });
  }

  /** 每次下载都换新签名，不要把返回的 URL 长期写进页面或数据库 */
  createDownloadUrl(
    fileId: string,
    input: CreateDownloadUrlRequest = {},
  ): Promise<CreateDownloadUrlResponse> {
    return this.http.request(
      `/storage/files/${encodeURIComponent(fileId)}/download-url`,
      { method: "POST", json: input },
    );
  }

  deleteFile(fileId: string): Promise<void> {
    return this.http.request(`/storage/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
    });
  }
}
