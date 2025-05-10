import { ChatLog } from '../../src/types';
import { jest } from '@jest/globals';

/**
 * 模拟的API实现，用于单元测试
 */
export const createMockApis = () => {
  return {
    auth: {
      getMyId: jest.fn().mockReturnValue('test_user')
    },
    chat: {
      getChatLogsDesc: jest.fn().mockImplementation(
        (...args: any[]) => {
          return Promise.resolve({
            items: [] as ChatLog[],
            hasMore: false
          });
        }
      )
    }
  };
};

/**
 * 创建测试用的聊天日志数据
 * @param count 要创建的消息数量
 * @param selfId 自己的用户ID，用于标记消息是否是自己发送的
 * @returns 创建的聊天日志数组
 */
export const createMockChatLogs = (count: number, selfId: string = 'test_user'): ChatLog[] => {
  const logs: ChatLog[] = [];
  
  for (let i = 0; i < count; i++) {
    const seq = i + 1;
    const senderId = seq % 2 === 0 ? selfId : 'other_user';
    
    const log = new ChatLog();
    log.chatId = `msg_${seq}`;
    log.seq = seq;
    log.senderId = senderId;
    log.isSentByMe = senderId === selfId;
    log.content = { 
      type: 'text',
      text: `Test message ${seq}`
    };
    log.createdAt = new Date(Date.now() - (count - i) * 60000);
    log.updatedAt = log.createdAt;
    
    logs.push(log);
  }
  
  return logs;
}; 