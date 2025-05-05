import { useAppStore } from "../app.store";

const ConversationList = () => {
  const { conversations, current, chatWith } = useAppStore();

  // 获取会话头像显示文字
  const getAvatarText = (name: string | undefined, topicId: string) => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (topicId.startsWith('rsq') || topicId.startsWith('bob') || topicId.startsWith('8k')) {
      return 'CH';
    }
    return topicId.charAt(0).toUpperCase();
  };

  // 根据topicId生成背景色
  const getAvatarBgColor = (topicId: string) => {
    if (topicId.startsWith('rsq') || topicId.startsWith('bob') || topicId.startsWith('8k')) {
      return 'bg-pink-200'; // CH头像使用粉色背景
    }
    if (topicId.includes('爱丽丝') || topicId.includes('alice')) {
      return 'bg-green-500'; // Alice头像使用绿色背景
    }
    return 'bg-teal-500'; // 默认使用青色背景
  };

  return (
    <div className="flex flex-col w-64 border-r shrink-0 border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">会话列表</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            暂无会话
          </div>
        ) : (
          <div>
            {conversations.map((item) => {
              const avatarText = getAvatarText(item.name, item.topicId);
              const bgColorClass = getAvatarBgColor(item.topicId);
              
              return (
                <div
                  key={item.topicId}
                  className={`border-b border-gray-100 cursor-pointer ${current && current.topicId === item.topicId ? "bg-gray-50" : ""}`}
                  onClick={() => chatWith(item)}>
                  <div className="flex items-center px-3 py-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bgColorClass}`}>
                      <span className={`text-lg font-medium ${bgColorClass === 'bg-pink-200' ? 'text-black' : 'text-white'}`}>
                        {avatarText}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0 ml-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-medium truncate">
                          {item.name || (item.topicId.startsWith('bob') || item.topicId.startsWith('rsq') || item.topicId.startsWith('8k') 
                            ? `会话 ${item.topicId}` 
                            : item.topicId.substring(0, 8))}
                        </h3>
                        <span className="text-sm text-gray-500">
                          22:22
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-gray-500 truncate">
                          最新消息 #{item.lastSeq}
                        </p>
                        {item.unread > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                            {item.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;

