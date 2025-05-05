import {  UserPublicProfile } from "../../types";
import { BackendService } from "../adapter/backend";
import { IUserApi } from "../iuser_api";

export class UserApi implements IUserApi {
  constructor(private readonly backend: BackendService) {
    this.backend = backend;
  }
  // Set blacklist
  async setBlocked(userId: string) {
    const resp = await this.backend.post(`/api/block/${userId}`);
    return resp.items ?? [];
  }

  // Remove from blacklist
  async unsetBlocked(userId: string) {
    const resp = await this.backend.post(`/api/unblock/${userId}`);
    return resp.items ?? [];
  }

  // View personal information
  async getUserInfo(userId: string): Promise<UserPublicProfile> {
    try {
      return await this.backend.post(`/api/profile/${userId}`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      const u: Partial<UserPublicProfile> = {
        userId: userId,
      };
      return u as UserPublicProfile;
    }
  }
}
