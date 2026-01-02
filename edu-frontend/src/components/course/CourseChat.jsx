import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Send, MessageCircle, Trash2 } from 'lucide-react';
import { chatAPI } from '../../services/api';
import { onNewMessage } from '../../services/socket';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

const CourseChat = ({ courseId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const response = await chatAPI.getMessages(courseId, { limit: 100 });
        setMessages(response.data.data.messages || []);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [courseId]);

  // Socket listener for new messages
  useEffect(() => {
    const handleNewMessage = (message) => {
      if (message.course_id === courseId) {
        // Prevent duplicates - only add if message doesn't exist
        setMessages((prev) => {
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    onNewMessage(handleNewMessage);

    return () => {
      // Cleanup is handled in socket service
    };
  }, [courseId]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      setSending(true);
      await chatAPI.sendMessage(courseId, {
        message: newMessage.trim(),
        messageType: 'text',
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Delete message (teacher only)
  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await chatAPI.deleteMessage(messageId);
      setMessages((prev) => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages Container */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-dark-border">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Course Discussion
          </h3>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-dark-text-secondary">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">Be the first to start the conversation!</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => {
                const isOwn = message.user_id === currentUser.id;
                const isTeacher = message.user_role === 'teacher';

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isTeacher
                          ? 'bg-primary-500 text-white dark:bg-dark-green-500'
                          : 'bg-neutral-300 text-neutral-700 dark:bg-dark-border dark:text-dark-text-primary'
                      }`}>
                        {getInitials(message.user_name)}
                      </div>

                      {/* Message Content */}
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-neutral-700 dark:text-dark-text-primary">
                            {message.user_name}
                          </span>
                          {isTeacher && (
                            <Badge className="bg-primary-500 text-white dark:bg-dark-green-500 text-xs px-2 py-0">
                              Teacher
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-start gap-2">
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              isOwn
                                ? 'bg-primary-500 text-white dark:bg-dark-green-500'
                                : 'bg-neutral-100 text-neutral-900 dark:bg-dark-border dark:text-dark-text-primary'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                          </div>

                          {/* Delete button - only show for teachers */}
                          {currentUser.role === 'teacher' && (
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 rounded transition-colors"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <span className="text-xs text-neutral-500 dark:text-dark-text-secondary mt-1">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Message Input */}
        <div className="p-4 border-t dark:border-dark-border">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-green-500"
              disabled={sending}
            />
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="bg-primary-500 hover:bg-primary-600 dark:bg-dark-green-500 dark:hover:bg-dark-green-600"
            >
              {sending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default CourseChat;
