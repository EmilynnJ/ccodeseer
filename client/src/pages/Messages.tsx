import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, Search } from 'lucide-react';
import api from '../services/api';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    profileImage: string;
    role: string;
    isOnline: boolean;
  };
  unreadCount: number;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function Messages() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in');
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.getConversations();
        setConversations(response.data.data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isSignedIn) {
      fetchConversations();
    }
  }, [isSignedIn]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return;
      try {
        const response = await api.getMessages(selectedConversation);
        setMessages(response.data.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await api.sendMessage(selectedConversation, newMessage.trim());
      setNewMessage('');
      // Refresh messages
      const response = await api.getMessages(selectedConversation);
      setMessages(response.data.data);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-playfair text-white mb-6">Messages</h1>

        <div className="card overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-primary-400/10 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-primary-400/10">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    className="input pl-10"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="skeleton w-12 h-12 rounded-full" />
                        <div className="flex-1">
                          <div className="skeleton h-4 w-24 mb-2" />
                          <div className="skeleton h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length > 0 ? (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full p-4 flex gap-3 hover:bg-dark-700/50 transition-colors ${
                        selectedConversation === conv.id ? 'bg-dark-700' : ''
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={conv.otherUser.profileImage}
                          alt={conv.otherUser.fullName}
                          className="avatar avatar-md"
                        />
                        {conv.otherUser.isOnline && (
                          <div className="absolute bottom-0 right-0 status-online" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-white truncate">
                            {conv.otherUser.fullName}
                          </h3>
                          {conv.unreadCount > 0 && (
                            <span className="badge-primary text-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-400 truncate">
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <MessageCircle size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No conversations yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => {
                      const conv = conversations.find((c) => c.id === selectedConversation);
                      const isOwn = message.senderId !== conv?.otherUser.id;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              isOwn
                                ? 'bg-primary-400/20 text-white'
                                : 'bg-dark-700 text-gray-200'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? 'text-primary-300' : 'text-gray-500'
                              }`}
                            >
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Message Input */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-4 border-t border-primary-400/10"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="input flex-1"
                      />
                      <button type="submit" className="btn-primary px-4">
                        <Send size={20} />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <MessageCircle size={64} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl text-white mb-2">Select a Conversation</h3>
                    <p className="text-gray-400">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
