/* eslint-disable @typescript-eslint/no-explicit-any */


export interface IExtraApi {
  /**
   * 上传文件到服务器
   * @param file 文件
   * @param topicId 话题ID
   * @param isPrivate 是否私有
   */
  uploadFile(file: File, topicId: string, isPrivate: boolean): Promise<any>;
} 