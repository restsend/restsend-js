/* eslint-disable @typescript-eslint/no-explicit-any */

// 声明微信小程序的全局变量
declare const wx: {
  request: (options: {
    url: string;
    method: string;
    data?: any;
    header?: Record<string, string>;
    success: (res: any) => void;
    fail: (error: any) => void;
  }) => void;
};

export async function handleResult(resp: Response) {
  if (resp.status !== 200) {
    let reason = await resp.text();
    const contentType = resp.headers.get("Content-Type") || "";
    if (contentType && /json/i.test(contentType)) {
      const data = JSON.parse(reason);
      reason = data.error || reason;
    }
    if (!reason) reason = resp.statusText;
    throw reason;
  }
  return await resp.json();
}
async function wxSendReq(method: string, url: string, data: any, token: string) {
  const header = token ? { Authorization: `Bearer ${token}` } : undefined;
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      header,
      success: (res: any) => resolve(res.data),
      fail: reject,
    });
  });
}
async function webSendReq(method: string, url: string, data: any, token: string) {
  const authToken = token ? `Bearer ${token}` : undefined;
  const resp = await fetch(url, {
    method,
    credentials: "same-origin",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      "Authorization": authToken,
    } as HeadersInit,
  });
  return await handleResult(resp);
}
export async function sendReq(method: string, url: string, data: any, token: string) {
  if (typeof wx !== "undefined") {
    return await wxSendReq(method, url, data, token);
  }
  return await webSendReq(method, url, data, token);
}

export class BackendService {
  private _token: string = "";

  private _endpoint: string = "";

  constructor(endpoint: string) {
    if (endpoint.endsWith("/")) {
      endpoint = endpoint.slice(0, -1);
    }
    this._endpoint = endpoint;
  }

  async delete(url: string, data: any) {
    if (!url.startsWith("/")) {
      url = `/${url}`;
    }
    return await sendReq("DELETE", `${this._endpoint}${url}`, data, this._token);
  }

  async get(url: string) {
    if (!url.startsWith("/")) {
      url = `/${url}`;
    }
    return await sendReq("GET", `${this._endpoint}${url}`, undefined, this._token);
  }

  async put(url: string, data: any) {
    if (!url.startsWith("/")) {
      url = `/${url}`;
    }
    return await sendReq("PUT", `${this._endpoint}${url}`, data, this._token);
  }

  async patch(url: string, data: any) {
    if (!url.startsWith("/")) {
      url = `/${url}`;
    }
    return await sendReq("PATCH", `${this._endpoint}${url}`, data, this._token);
  }

  async post(url: string, data?: any) {
    if (!url.startsWith("/")) {
      url = `/${url}`;
    }
    return await sendReq("POST", `${this._endpoint}${url}`, data, this._token);
  }

  public get token() {
    return this._token;
  }

  public set token(token: string) {
    this._token = token;
  }
}
