import React, { useState, useEffect, useRef } from 'react';
import { ChatLog } from "@resetsend/sdk";
import DotsIcon from '../assets/DotsIcon';

interface MessageDropdownMenuProps {
  item: ChatLog;
  position: 'left' | 'right';
  onReply: (item: ChatLog) => void;
  onRecall?: (item: ChatLog) => void;
  onDelete: (item: ChatLog) => void;
}

const MessageDropdownMenu: React.FC<MessageDropdownMenuProps> = ({
  item,
  position,
  onReply,
  onRecall,
  onDelete
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        buttonRef.current && 
        !menuRef.current.contains(event.target as Node) && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);
  
  // 计算菜单位置
  useEffect(() => {
    if (isMenuOpen && buttonRef.current && menuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      
      // 检查视窗宽高
      const viewportHeight = window.innerHeight;
      
      // 计算top位置
      let top = 0;
      
      // 将菜单垂直居中对齐按钮
      top = -menuRect.height / 2 + buttonRect.height / 2;
      
      // 如果超出底部屏幕，向上调整
      if (buttonRect.top + top + menuRect.height > viewportHeight) {
        top = viewportHeight - buttonRect.top - menuRect.height;
      }
      
      // 如果超出顶部屏幕，向下调整
      if (buttonRect.top + top < 0) {
        top = -buttonRect.top;
      }
      
      // 计算水平位置
      let left = 0;
      let right = 0;
      
      if (position === 'right') {
        // 右侧菜单，向左展开
        left = buttonRect.width + 5;
      } else {
        // 左侧菜单，向右展开
        right = buttonRect.width + 5;
      }
      
      setMenuPosition({ top, left, right });
    }
  }, [isMenuOpen, position]);
  
  // 切换菜单
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <>
      {/* 菜单按钮 */}
      <button 
        ref={buttonRef}
        onClick={toggleMenu}
        className={`absolute top-1/2 -translate-y-1/2 ${position === 'right' ? 'right-[-30px]' : 'left-[-30px]'} p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity`}
      >
        <DotsIcon />
      </button>
      
      {/* 下拉菜单 */}
      {isMenuOpen && (
        <div 
          ref={menuRef}
          style={{
            position: 'absolute',
            top: `${menuPosition.top}px`,
            ...(position === 'right' ? { left: `${menuPosition.left}px` } : { right: `${menuPosition.right}px` }),
            zIndex: 50,
          }}
          className="w-40 bg-white divide-y divide-gray-100 rounded-lg shadow-lg"
        >
          <ul className="py-2 text-sm text-gray-700">
            <li>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(item);
                  setIsMenuOpen(false);
                }}
                className="block px-4 py-2 w-full text-left hover:bg-gray-100"
              >
                回复
              </button>
            </li>
            {onRecall && (
              <li>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecall(item);
                    setIsMenuOpen(false);
                  }}
                  className="block px-4 py-2 w-full text-left hover:bg-gray-100"
                >
                  撤回
                </button>
              </li>
            )}
            <li>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                  setIsMenuOpen(false);
                }}
                className="block px-4 py-2 w-full text-left hover:bg-gray-100"
              >
                删除
              </button>
            </li>
          </ul>
        </div>
      )}
    </>
  );
};

export default MessageDropdownMenu; 