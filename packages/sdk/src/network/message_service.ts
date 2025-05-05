import { IAllApi } from "../api";
import { IClientStore } from "../store";
import { ChatRequest, Content } from "../types";
import { randText } from "../utils";
import { Connection } from "./connection";
import { FileMessageParams, GenericMessageParams, ImageMessageParams, IMessageService, LinkMessageParams, LocationMessageParams, ReadMessageParams, RecallMessageParams, TextMessageParams, UpdateExtraParams, VideoMessageParams, VoiceMessageParams } from "./imessage_service";

const CHAT_ID_LENGTH = 8;


export class MessageService implements IMessageService{
  private connection: Connection;

  private store: IClientStore;

  private apis: IAllApi;

  constructor(connection: Connection, store: IClientStore, apis: IAllApi) {
    this.connection = connection;
    this.store = store;
    this.apis = apis;
  }

  /**
   * Typing indicator, only for personal chat
   * @param {String} topicId
   */
  async doTyping(topicId: string): Promise<void> {
    let req = {
      topicId,
      type: "typing",
    } as ChatRequest;
     await this.connection.doSendRequest(req, false);
  }

  /**
   * Chat message read
   * @param {String} topicId
   */
  async doRead({ topicId, lastSeq }: ReadMessageParams): Promise<void> {
    let req = {
      topicId,
      type: "read",
      seq: lastSeq,
    } as ChatRequest;
     await this.connection.doSendRequest(req, false);
  }
  /**
   * Recall a message
   * @param {String} topicId
   * @param {String} chatId
   * @param {Function} onsent Callback function after the message is sent
   */
  async doRecall(params: RecallMessageParams): Promise<void>  {
    const { topicId, chatId, onsent, onack, onfail, extra } = params;

    const req = {
      type: "chat",
      topicId,
      chatId: randText(CHAT_ID_LENGTH),
      content: {
        type: "recall",
        text: chatId,
        extra,
      },
    } as ChatRequest;
    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }

  /**
   * Send text message
   * @param {String} topicId
   * @param {String} text
   * @option @param {Array<String>} mentions Mentioned people
   * @option @param {String} reply Reply message id
   * @param {Function} onsent Callback function after the message is sent
   */
  async doSendText(params: TextMessageParams): Promise<void> {
    const { topicId, text, mentions, reply, onsent, onack, onfail, extra } = params;

    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type: "text",
        text,
        mentions,
        reply,
        extra,
      } as Content,
    } as ChatRequest;

    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }
  /**
   * Send image message
   * @param {String} topicId
   * @param {String} urlOrData Image URL or base64 encoded image content
   * @option @param {Array<String>} mentions Mentioned people
   * @option @param {String} reply Reply message id
   * @option @param {Number} size Image size
   * @param {Function} onsent Callback function after the message is sent
   */
  async doSendImage(params: ImageMessageParams): Promise<void> {
    const { topicId, urlOrData, size, mentions, reply, onsent, onack, onfail, extra } = params;

    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type: "image",
        text: urlOrData,
        size,
        mentions,
        reply,
        extra,
      } as Content,
    } as ChatRequest;

    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }
  /**
   * Send voice message
   * @param {String} topicId
   * @param {String} urlOrData
   * @param {String} duration Voice duration, format is 00:00
   * @option @param {Array<String>} mentions Mentioned people
   * @option @param {String} reply Reply message id
   * @param {Function} onsent Callback function after the message is sent
   * */
  async doSendVoice(params: VoiceMessageParams): Promise<void> {
    const { topicId, urlOrData, duration, mentions, reply, onsent, onack, onfail, extra } = params;
    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type: "voice",
        text: urlOrData,
        duration,
        mentions,
        reply,
        extra,
      } as Content,
    } as ChatRequest;

    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }
  /**
   * Send video message
   * @param {String} topicId
   * @param {String} url Video URL
   * @param {String} thumbnail Video thumbnail
   * @param {String} duration Video duration, format is 00:00
   * @option @param {Array<String>} mentions Mentioned people
   * @option @param {String} reply Reply message id
   * @param {Function} onsent Callback function after the message is sent
   */
  async doSendVideo(params: VideoMessageParams): Promise<void> {
    const {
      topicId,
      urlOrData,
      thumbnail,
      duration,
      mentions,
      reply,
      onsent,
      onack,
      onfail,
      extra,
    } = params;

    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type: "video",
        text: urlOrData,
        thumbnail,
        duration,
        mentions,
        reply,
        extra,
      } as Content,
    } as ChatRequest;

    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }

  /**
   * Send file message
   * @param {String} topicId
   * @param {String} urlOrData File URL or base64 encoded file content
   * @param {String} filename File name
   * @param {Number} size File size
   * @option @param {Array<String>} mentions Mentioned people
   * @option @param {String} reply Reply message id
   * @param {Function} onsent Callback function after the message is sent
   * */
  async doSendFile(params: FileMessageParams) {
    const { topicId, urlOrData, filename, size, mentions, reply, onsent, onack, onfail, extra } =
      params;

    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type: "file",
        text: urlOrData,
        placeholder: filename, // File name
        size,
        mentions,
        reply,
        extra,
      } as Content,
    } as ChatRequest;

    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }

  /**
   * Send location message
   * @param {String} topicId
   * @param {Number} latitude Latitude
   * @param {Number} longitude Longitude
   * @param {String} address Address
   * @option @param {Array<String>} mentions Mentioned people
   * @option @param {String} reply Reply message id
   * @param {Function} onsent Callback function after the message is sent
   */
  async doSendLocation(params: LocationMessageParams): Promise<void> {
    const { topicId, latitude, longitude, address, mentions, reply, onsent, onack, onfail, extra } =
      params;
    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type: "file",
        text: `${latitude},${longitude}`,
        placeholder: address,
        mentions,
        reply,
        extra,
      } as Content,
    } as ChatRequest;
    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }

  /**
   * Send link message
   * @param {String} topicId
   * @param {String} url Link URL
   * @option @param {Array<String>} mentions Mentioned people
   * @option @param {String} reply Reply message id
   * @param {Function} onsent Callback function after the message is sent
   */
  async doSendLink(params: LinkMessageParams) {
    const { topicId, url, mentions, reply, onsent, onack, onfail, extra } = params;

    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type: "link",
        text: url,
        mentions,
        reply,
        extra,
      } as Content,
    } as ChatRequest;

    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }
  /**
   * Send message
   * @param {String} type
   * @param {String} topicId
   * @param {String} text Message content
   * @option @param {String} placeholder Placeholder text
   * @option @param {Array<String>} mentions Mentioned people
   * @option @param {String} reply Reply message id
   * @param {Function} onsent Callback function after the message is sent
   */
  async doSendMessage(params: GenericMessageParams): Promise<void> {
    const { type, topicId, text, placeholder, mentions, reply, onsent, onack, onfail, extra } =
      params;
    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type,
        text,
        mentions,
        reply,
        placeholder,
        extra,
      } as Content,
    } as ChatRequest;

    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }
  /// Update sent chat message's extra
  /// # Arguments
  /// * @param {String} topicId The topic id
  /// * @param {String} chatId The chat id
  /// * @param {Object} extra The extra, optional
  /// * @param {Function} onsent Callback function after the message is sent
  async doUpdateExtra(params: UpdateExtraParams): Promise<void> {
    const { topicId, chatId, extra, onsent, onack, onfail } = params;

    const req = {
      type: "chat",
      chatId: randText(CHAT_ID_LENGTH),
      topicId,
      content: {
        type: "update.extra",
        text: chatId,
        extra,
      },
    } as ChatRequest;

    return await this.connection.sendAndWaitResponse(
      req,
      onsent || (() => {}),
      onack || (() => {}),
      onfail || (() => {})
    );
  }

  /**
   * Delete a single message, whether to sync to the server
   * @param {String} topicId
   * @param {String} chatId
   */
  async deleteMessage(topicId: string, chatId: string) {
    this.store.getMessageStore(topicId).deleteMessage(chatId);
    return this.apis.chat.deleteMessage(topicId, chatId);
  }
}
