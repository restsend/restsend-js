import { BackendService } from "../adapter/backend";
import { IAuthApi } from "../iauth_api";

export class AuthApi implements IAuthApi {
  private myId: string = "";

  constructor(private readonly backend: BackendService) {
    this.backend = backend;
  }

  /**
   * User logout
   */
  async logout() {
    const resp = await this.backend.get(`/auth/logout`);
    return resp;
  }
  /**
   * User registration
   */
  async signup(email: string, password: string, remember = true) {
    const resp = await this.backend.post(`/auth/register`, {
      email,
      password,
      remember,
    });
    return resp;
  }

  async guestLogin(guestId: string, remember = true, extra = undefined) {
    const resp = await this.backend.post(`/api/guest/login`, {
      guestId,
      remember,
      extra,
    });
    this.myId = resp.email;

    this.backend.token = resp.token;

    return resp;
  }
  /**
   * User login
   */
  async login(email: string, password: string, remember = true) {
    const resp = await this.backend.post(`/auth/login`, {
      email,
      password,
      remember,
    });
    this.backend.token = resp.token;

    this.myId = resp.email;
    return resp;
  }

  /**
   * Login with token
   */
  async loginWithToken(email: string, token: string) {
    if (!token) {
      throw new Error("token not found");
    }

    if (!email) {
      throw new Error("username not found");
    }

    const resp = await this.backend.post(`/auth/login`, {
      email,
      token,
      remember: true,
    });
    this.backend.token = resp.token;
    this.myId = email;
    return resp;
  }

  getMyId() {
    return this.myId;
  }

  getAuthToken() {
    return this.backend.token;
  }
}
