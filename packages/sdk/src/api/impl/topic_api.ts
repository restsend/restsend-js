import { BackendService } from "../adapter/backend";
import { ITopicApi } from "../itopic_api";

export class TopicApi implements ITopicApi {
  constructor(private readonly backend: BackendService) {
    this.backend = backend;
  }

  async chatWithUser(userId: string) {
    const resp = await this.backend.post(`/api/topic/create/${userId}`);
    return resp;
  }

  /**
   * Get information of a single chat session
   * @param {String} topicId
   * */
  async getTopic(topicId: string) {
    return await this.backend.post(`/api/topic/info/${topicId}`);
  }

  // Sync topic members information
  async syncTopicMembers(topicId: string, updatedAt: string, limit: number) {
    return await this.backend.post(`/api/topic/members/${topicId}`, {
      updatedAt,
      limit,
    });
  }
  // Create topic chat
  async createTopic(name: string, icon: string, members: string[]) {
    const resp = await this.backend.post(`/api/topic/create`, {
      name,
      icon,
      members,
    });
    return resp.items ?? [];
  }
  // Apply to join topic chat
  async joinTopic(topicId: string, source: string, message: string, memo: string) {
    const resp = await this.backend.post(`/api/topic/knock/${topicId}`, {
      source,
      message,
      memo,
    });
    return resp.items ?? [];
  }
  // Get topic application list, this is not called
  async getTopicApplyList(params: any) {
    const resp = await this.backend.post(`/api/topic/admin/list_knock/${params}`);
    return resp ?? [];
  }
  // Get all topic chat application list
  async getAllTopicApplyList() {
    const resp = await this.backend.post(`/api/topic/admin/list_knock_all/`);
    return resp ?? [];
  }
  // Accept topic chat application
  async acceptTopic(params: any) {
    const resp = await this.backend.post(
      `/api/topic/admin/knock/accept/${params.topicId}/${params.userId}`,
      params
    );
    return resp ?? [];
  }
  // Dismiss topic chat
  async dismissTopic(topicId: string) {
    const resp = await this.backend.post(`/api/topic/dismiss/${topicId}`, {
      topicId,
    });
    return resp.items ?? [];
  }
  // Update topic notice
  async updateTopicNotice(topicId: string, text: string) {
    const resp = await this.backend.post(`/api/topic/admin/notice/${topicId}`, {
      text,
    });
    return resp.items ?? [];
  }
  // Mute the entire topic, if duration is 0 then unmute
  async silentTopic(topicId: string, duration: string) {
    return await this.backend.post(`/api/topic/admin/silent_topic/${topicId}`, {
      duration,
    });
  }

  // Mute topic member, if duration is 0 then unmute
  async silentTopicMember(topicId: string, userId: string, duration: string) {
    return await this.backend.post(`/api/topic/admin/silent/${topicId}/${userId}`, {
      duration,
    });
  }
  // Remove a topic member
  async removeTopicMember(topicId: string, userId: string) {
    return await this.backend.post(`/api/topic/admin/kickout/${topicId}/${userId}`);
  }
}
