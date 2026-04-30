import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  FileText, 
  Upload, 
  Settings, 
  Moon, 
  Sun,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useUIStore, useChatHistory } from '@/store';
import { useTheme } from '@/store';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { activeView, setActiveView } = useUIStore();
  const { messages, messageCount, clearHistory } = useChatHistory();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      description: 'Ask questions about your documents'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      description: 'Upload and manage documents'
    }
  ];

  const recentMessages = messages.slice(-5).reverse();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed top-0 left-0 h-full w-80 z-50 ${
          isDark ? 'bg-gray-900' : 'bg-white'
        } border-r ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Knowledge Engine
            </h2>
            
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-gray-700 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Mobile Close */}
              <button
                onClick={onToggle}
                className="lg:hidden p-2 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as 'chat' | 'documents')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeView === item.id
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDark
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.label}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  </div>
                  {activeView === item.id && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Recent History */}
          {activeView === 'chat' && messageCount > 0 && (
            <div className={`flex-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Recent History
                  </h3>
                  <button
                    onClick={clearHistory}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      isDark
                        ? 'hover:bg-gray-700 text-gray-400'
                        : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    Clear
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <AnimatePresence>
                    {recentMessages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                          isDark
                            ? 'border-gray-700 hover:bg-gray-700'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          // This would typically scroll to the message
                          // For now, just a visual indicator
                        }}
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                            message.role === 'user'
                              ? 'bg-blue-500'
                              : isDark
                                ? 'bg-gray-600'
                                : 'bg-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {message.content}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="text-center">
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {messageCount} messages in history
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
