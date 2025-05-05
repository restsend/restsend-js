import { IAllApi } from "../api";
import { Callback } from "../callback";
import { LogStatusSending } from "../constants";
import { IClientStore } from "../store";
import { ChatLog, ChatRequest } from "../types";
import { conversationFromTopic, formatDate, logger } from "../utils";
import { WrappedWxSocket } from "./wrappedsocket";

const REQUEST_TIMEOUT = 15; // 15 seconds
const keepaliveInterval = 30 * 1000; // 30 seconds
const reconnectInterval = 5 * 1000; // 5 seconds
import "miniprogram-api-typings";

function createWebSocket(url: string) {
  if (typeof wx !== "undefined") {
    return new WrappedWxSocket(url, []);
  }
  return new WebSocket(url);
}

interface Waiting {
  req: ChatRequest;
  resolve: Function;
  onack: Function;
  onfail: Function;
}

export class Connection {
  device: string = "web";
  endpoint: string = "";
  running = true;
  ws?: WebSocket | WrappedWxSocket;

  keepalive?: NodeJS.Timeout;
  reconnect?: NodeJS.Timeout;
  status = "disconnected";
  waiting: Record<string, Waiting> = {};
  pending: ChatRequest[] = [];

  store: IClientStore;
  callback?: Callback;
  apis: IAllApi;

  handlers: Record<string, Function> = {};

  constructor(
    endpoint: string,
    apis: IAllApi,
    store: IClientStore,
    callback?: Callback
  ) {
    this.device = "web";
    endpoint = endpoint || "";
    this.endpoint = endpoint.replace(/http/, "ws");
    this.apis = apis;
    this.store = store;
    this.callback = callback;

    this._initHandlers();
  }

  _initHandlers() {
    this.handlers = {
      nop: (topicId: string, senderId: string, req: ChatRequest) => {
        logger.debug("nop", topicId, senderId, req);
      },
      system: (_topicId: string, _senderId: string, req: ChatRequest) => {
        this.callback?.onSystemMessage?.(req);
      },
      resp: async (_topicId: string, _senderId: string, resp: ChatRequest) => {
        const w = this.waiting[resp.chatId];
        if (w) {
          delete this.waiting[resp.chatId];
          if (resp.code !== 200) {
            logger.warn("response error", resp);
            w.onfail && w.onfail(resp.chatId, resp);
          } else {
            w.onack && w.onack(resp);
          }
          await w.resolve(resp);
        } else {
          logger.warn("no waiting for resp", resp);
        }
      },
      kickout: (_topicId: string, _senderId: string, req: ChatRequest) => {
        this.callback?.onKickoffByOtherClient?.(req.message || "");
        this.shutdown();
      },
      typing: (topicId: string, senderId: string, _req: ChatRequest) => {
        this.callback?.onTyping?.(topicId, senderId);
      },
      read: async (topicId: string, senderId: string, req: ChatRequest) => {
        let topic = await this.store.getTopic(topicId);
        if (!topic) {
          // bad topic id
          logger.warn("bad topic id", topicId, senderId, req);
          return;
        }
        let conversation = conversationFromTopic(topic);

        conversation.unread = 0;
        this.callback?.onConversationUpdated?.(conversation);
      },
    };
  }

  start() {
    this.running = true; // If false, it means it has been closed, do not attempt to reconnect

    this.ws = undefined;
    this.keepalive = undefined;
    this.reconnect = undefined;
    this.status = "disconnected";
    this.waiting = {};
    this.pending = [];
  }

  shutdown() {
    this.running = false;
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    if (this.keepalive) {
      clearInterval(this.keepalive);
      this.keepalive = undefined;
    }
    if (this.reconnect) {
      clearInterval(this.reconnect);
      this.reconnect = undefined;
    }
  }

  /**
   * 创建 WebSocket 连接并设置事件处理
   * @param url WebSocket URL
   */
  private createWebSocketConnection(url: string): void {
    this.ws = createWebSocket(url);
    this.ws.onopen = () => {
      this.status = "connected";

      this.callback?.onConnected?.();

      let pending = this.pending.splice(0, this.pending.length);
      if (pending.length > 0) {
        logger.debug("flush pending requests", pending.length);
        pending.forEach((req) => {
          this.ws!.send(JSON.stringify(req));
        });
      }

      this.keepalive = setInterval(() => {
        if (this.status !== "connected") {
          clearInterval(this.keepalive);
          this.keepalive = undefined;
          return;
        }
        this.ws!.send(JSON.stringify({ type: "nop" }));
      }, keepaliveInterval);
    };
    this.ws.onclose = (event) => {
      this.status = "disconnected";
      logger.warn("websocket close", event.code, event.reason);
      this.callback?.onNetBroken?.(event.reason || "");
    };
    this.ws.onerror = (event) => {
      this.status = "disconnected";
      logger.warn("websocket error", event);
      this.callback?.onNetBroken?.("error");
    };
    this.ws.onmessage = async (event) => {
      if (event.type === "ping") {
        this.ws!.send(JSON.stringify({ type: "pong" }));
        return;
      }
      logger.debug("incoming", event.type, event.data);

      if (!event.data) return;

      let req: ChatRequest = JSON.parse(event.data);
      req = Object.assign({}, req);
      req.receivedAt = Date.now();

      // Call the subclass's handler function
      let code = 200;
      const { chatId, topicId, senderId, type } = req;
      const handler = this.handlers[type || ""];
      if (handler) {
        await handler(topicId, senderId, req);
      } else {
        logger.warn("unknown message type", req);
        code = 501;
      }

      if (chatId && type !== "resp") {
        await this.doSendRequest({
          type: "resp",
          chatId: req.chatId,
          code,
        } as ChatRequest);
      }
    };
  }

  /**
   * 发送请求
   * @param req 请求
   * @param retry 是否重试
   * @returns
   */
  async doSendRequest(req: ChatRequest, retry?: boolean) {
    if (!this.running) {
      throw new Error("connection is shutdown");
    }

    if (this.status !== "connected") {
      if (retry) {
        logger.debug("add pending", req);
        this.pending.push(req);
        await this.connect();
      }
      return req;
    }

    logger.debug("outgoing", req);

    this.ws!.send(JSON.stringify(req));
    return req;
  }

  async sendAndWaitResponse(
    req: ChatRequest,
    onsent: Function,
    onack: Function,
    onfail: Function,
    retry = true
  ): Promise<void> {
    req = Object.assign({}, req);

    const store = this.store.getMessageStore(req.topicId || "");
    let logItem = Object.assign(new ChatLog(), req) as ChatLog;
    logItem.attendee = req.attendee;
    logItem.senderId = this.apis.auth.getMyId();
    logItem.isSentByMe = true;
    logItem.status = LogStatusSending;

    logItem.createdAt = formatDate(req.createdAt || new Date());
    logItem.updatedAt = formatDate(req.createdAt || new Date());

    store.updateMessages([logItem]);

    return new Promise((resolve, _) => {
      this.waiting[req.chatId] = {
        req,
        resolve,
        onack,
        onfail,
      };
      if (onsent) {
        onsent(logItem);
      }
      this.doSendRequest(req, retry)
        .then(() => {})
        .catch((e) => {
          let w = this.waiting[req.chatId];
          if (w) {
            onfail && onfail(req.chatId, e);
            delete this.waiting[req.chatId];
          }
        });

      setTimeout(() => {
        let w = this.waiting[req.chatId];
        if (w) {
          onfail && onfail(req.chatId, new Error("timeout"));
          delete this.waiting[req.chatId];
        }
      }, REQUEST_TIMEOUT * 1000);
    });
  }

  /**
   * 手动创建 WebSocket 连接，登录成功后调用
   */
  async connect() {
    //检查连接状态，避免重复连接
    if (this.status === "connected" || this.status === "connecting") {
      return;
    }
    this.status = "connecting";

    // 清除心跳计时器
    if (this.keepalive) {
      clearInterval(this.keepalive);
      this.keepalive = undefined;
    }

    // 设置重连计时器
    if (!this.reconnect) {
      this.reconnect = setInterval(async () => {
        if (this.status === "disconnected" && this.running) {
          await this.connect();
        }
      }, reconnectInterval);
    }

    // 获取端点 URL
    let endpoint = this.endpoint;
    if (!this.endpoint) {
      // get current location and scheme
      const loc = window.location;
      const scheme = loc.protocol === "https:" ? "wss" : "ws";
      endpoint = `${scheme}://${loc.host}`;
    }
    let url = `${endpoint}/api/connect?device=${this.device}`;
    // check is same origin
    if (typeof wx !== "undefined" || endpoint.indexOf(`://${window.location}`) === -1) {
      url = `${url}&token=${this.apis.auth.getAuthToken()}`;
    }
    this.createWebSocketConnection(url);
  }
}
