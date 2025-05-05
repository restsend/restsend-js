import { create } from "zustand";
import {
  Client,
  createRsClient,
  ChatLog,
  Conversation,
  compareChatLogs,
  compareConversations,
  Topic,
  Callback,
} from "@resetsend/sdk";

const endpoint = "https://chat.ruzhila.cn";

interface Log {
  time: string;
  text: string;
}

type State = {
  client: Client | null;
  conversations: Conversation[];
  current: Conversation | undefined;
  messages: ChatLog[];
  messageIds: Record<string, number>;
  textMessage: string;
  quoteMessage: ChatLog | undefined;
  logs: Log[];
  first: boolean;
};

type Actions = {
  setClient: (client: Client | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setCurrent: (current: Conversation | undefined) => void;
  setMessages: (messages: ChatLog[]) => void;
  setMessageIds: (messageIds: Record<string, number>) => void;
  setTextMessage: (textMessage: string) => void;
  setQuoteMessage: (quoteMessage: ChatLog | undefined) => void;
  logit: (log: string) => void;
  clearLogs: () => void;

  startApp: (userId?: string, isRandom?: boolean) => Promise<void>;
  shutdown: () => void;
  fetchLastLogs: (params: { topicId: string; lastSeq: number; limit: number }) => Promise<void>;
  chatWith: (conversation: Conversation) => Promise<void>;
  sendMessage: () => Promise<void>;
  doTyping: () => void;
  doQuoteMessage: (message?: ChatLog) => void;
  doRecallMessage: (message: ChatLog) => Promise<void>;
  doDeleteMessage: (message: ChatLog) => Promise<void>;
  doSendFiles: (file: File, topicId: string) => Promise<void>;
};

export const useAppStore = create<State & Actions>((set, get) => ({
  client: null,
  clientRef: undefined,
  conversations: [],
  current: undefined,
  currentRef: undefined,
  messages: [],
  messageIds: {},
  textMessage: "",
  quoteMessage: undefined,
  logs: [],
  first: true,

  setClient: (client) => set({ client }),
  setConversations: (conversations) => set({ conversations }),
  setCurrent: (current) => set({ current }),
  setMessages: (messages) => set({ messages }),
  setMessageIds: (messageIds) => set({ messageIds }),
  setTextMessage: (textMessage) => set({ textMessage }),
  setQuoteMessage: (quoteMessage) => set({ quoteMessage }),
  clearLogs: () => set({ logs: [] }),

  logit: (log: string) =>
    set({ logs: [...get().logs, { time: new Date().toLocaleTimeString(), text: log }] }),

  startApp: async (username, guestRandom = false) => {
    const { shutdown, logit, setClient, setCurrent, fetchLastLogs } = get();

    shutdown();

    const callback = {
      onConnected: () => {
        logit("onConnected");
      },

      onTopicMessage: (topic: Topic, message: ChatLog) => {
        const { current, setCurrent } = get();
        let hasRead = current && current.topicId === topic.id;
        if (hasRead && message.readable) {
          current!.typing = false;
          setCurrent(current);
        }
        return { code: 200, hasRead };
      },

      onConversationUpdated: (conversation: Conversation) => {
        const newConversations = get().conversations;

        let idx = newConversations.findIndex((c) => c.topicId === conversation.topicId);
        if (idx >= 0) {
          newConversations[idx] = conversation;
        } else {
          newConversations.push(conversation);
        }
        newConversations.sort(compareConversations);

        set({ conversations: newConversations });

        const currentConversation = get().current;

        if (currentConversation && conversation.topicId === currentConversation.topicId) {
          const lastSeq = currentConversation.lastSeq || 0;
          const newLastSeq = Math.max(conversation.lastSeq || 0, lastSeq);
          const limit = newLastSeq - lastSeq;
          setCurrent(conversation);

          console.log(
            "currentConversation",
            currentConversation,
            "conversation",
            conversation,
            "newLastSeq",
            newLastSeq,
            "limit",
            limit
          );
          fetchLastLogs({ topicId: conversation.topicId, lastSeq: newLastSeq, limit });
        }
      },
    } as Callback;
    const newClient = createRsClient(endpoint, callback) as Client;

    setClient(newClient);

    let authInfo = undefined;
    try {
      if (!username) {
        let guestId = "guest-demo";
        if (guestRandom) {
          guestId = `${Math.random().toString(36).substring(2)}-guest-random`;
        }
        // this.logit('start app with', guestId)
        authInfo = await newClient.guestLogin(guestId);
      } else {
        authInfo = await newClient.login(username, `${username}:demo`);
      }
      logit(`登录成功: ${JSON.stringify(authInfo)}`);
      console.log("登录成功: ", authInfo);
    } catch (e) {
      // this.logit('login failed', e)
      logit(`登录失败: ${e}`);
      return;
    }

    newClient.beginSyncConversations();
    await newClient.connect();

    logit("startApp " + username);
  },

  shutdown: () => {
    set({ conversations: [] });

    const { client } = get();

    if (client) {
      client.shutdown();
      set({ client: null });
    }
  },

  fetchLastLogs: async ({ topicId, lastSeq, limit }) => {
    const { client, messages, messageIds, setMessages, setMessageIds } = get();

    if (!client) return;

    const { logs, hasMore } = await client.syncChatlogs(topicId, lastSeq, limit);
    if (logs) {
      const newMessageIds = { ...messageIds };
      const newMessages = [...messages] as ChatLog[];

      logs.forEach((log: ChatLog) => {
        if (!log.chatId) {
          return;
        }
        if (newMessageIds[log.chatId] === undefined) {
          newMessages.push(log);
          newMessageIds[log.chatId] = newMessages.length - 1;
        } else {
          let idx = newMessageIds[log.chatId];
          newMessages[idx] = log;
        }
      });

      newMessages.sort(compareChatLogs);
      setMessages(newMessages);
      setMessageIds(newMessageIds);
    }
  },

  chatWith: async (conversation) => {
    const { setCurrent, setMessages, setMessageIds, fetchLastLogs, logit } = get();

    setCurrent(conversation);
    logit(`chatWith: ${JSON.stringify(conversation)}`);
    setMessages([]);
    setMessageIds({});

    if (conversation) {
      await fetchLastLogs({
        topicId: conversation.topicId,
        lastSeq: 0,
        limit: 20,
      });
    }
  },

  sendMessage: async () => {
    const { textMessage, current, client, quoteMessage, setTextMessage, setQuoteMessage } = get();
    console.log("sendMessage", textMessage, current, client, quoteMessage);
    if (!textMessage.trim() || !current || !client) return;

    try {
      const quoteId = quoteMessage?.chatId;
      await client.doSendText({
        topicId: current.topicId,
        text: textMessage,
        mentions: [],
        reply: quoteId,
        onack: () => {
          console.log("发送成功，onack");
        },
      });
      setTextMessage("");
      setQuoteMessage(undefined);
    } catch (e) {
      console.error(`发送消息失败: ${e}`);
    }
  },

  doTyping: () => {
    const { current, client } = get();
    if (!current || !client) return;
    client.doTyping(current.topicId);
  },

  doQuoteMessage: (message) => {
    set({ quoteMessage: message });
  },

  doRecallMessage: async (message) => {
    const { current, client } = get();

    if (message.content?.type === "recall") {
      return;
    }
    if (!client || !current) return;
    try {
      await client.doRecall({
        topicId: current.topicId,
        chatId: message.chatId,
      });
      console.log(`撤回消息: ${message.chatId}`);
    } catch (e) {
      console.log(`撤回消息失败: ${e}`);
    }
  },

  doDeleteMessage: async (message: ChatLog) => {
    message.content!.type = "";

    const { messages, setMessages } = get();

    const newMessages = messages.map((m) => {
      if (m.chatId === message.chatId) {
        m.content!.type = "";
      }
      return m;
    });

    setMessages(newMessages);

    const { current, client } = get();

    if (!client || !current) return;
    try {
      await client.deleteMessage(current.topicId, message.chatId);
      console.log(`删除消息: ${message.chatId}`);
    } catch (e) {
      console.log(`删除消息失败: ${e}`);
    }
  },

  doSendFiles: async (file, topicId) => {
    const { client } = get();

    if (!client) return;

    let result = await client.getApis().extra.uploadFile(file, topicId, false);
    if (file.type.startsWith("image/")) {
      await client.doSendImage({ topicId, urlOrData: result.path });
    } else {
      await client.doSendFile({
        topicId,
        urlOrData: result.path,
        filename: result.fileName,
        size: result.size,
      });
    }
  },
}));
