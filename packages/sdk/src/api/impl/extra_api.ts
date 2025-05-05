import { BackendService, handleResult } from "../adapter/backend";
import { IExtraApi } from "../iextra_api";

export class ExtraApi implements IExtraApi {
  constructor(private readonly backend: BackendService) {
    this.backend = backend;
  }

  /**
   * Upload file to server
   * @param {File} file
   * @param {String} topicId
   * @param {Boolean} isPrivate
   * @returns {UploadResult}
   */
  async uploadFile(file: File, topicId: string, isPrivate: boolean) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("topicId", topicId);
    formData.append("private", isPrivate ? "true" : "false");

    const authToken = this.backend.token ? `Bearer ${this.backend.token}` : undefined;
    const resp = await fetch(`/api/attachment/upload`, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
      headers: new Headers({
        Authorization: authToken,
      } as HeadersInit),
    });

    return await handleResult(resp);
  }
}
