import React, { useState, useEffect, useRef } from 'react';
import { TelepartyClient, SocketEventHandler, SocketMessageTypes, SessionChatMessage } from 'teleparty-websocket-lib';

interface TypingMessageData {
  anyoneTyping: boolean;
  usersTyping: string[];
}

const ChatApp = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [userIcon, setUserIcon] = useState('');
  const [currentView, setCurrentView] = useState<'join' | 'chat'>('join');
  const [messages, setMessages] = useState<SessionChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const clientRef = useRef<TelepartyClient>();

  useEffect(() => {
    console.log('Initializing Teleparty Client...');
    
    const eventHandler: SocketEventHandler = {
      onConnectionReady: () => {
        console.log("WebSocket connection established successfully");
        setIsConnected(true);
      },
      onClose: () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
        alert("Connection lost. Please reload the application.");
      },
      onMessage: (message) => {
        console.log('Received message:', message);
        switch (message.type) {
          case SocketMessageTypes.SEND_MESSAGE:
            setMessages(prev => [...prev, message.data as SessionChatMessage]);
            break;
          case SocketMessageTypes.SET_TYPING_PRESENCE:
            const typingData = message.data as TypingMessageData;
            setTypingUsers(typingData.usersTyping);
            break;
          case SocketMessageTypes.JOIN_ROOM:
            console.log('Successfully joined room');
            break;
        }
      }
    };

    clientRef.current = new TelepartyClient(eventHandler);

    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateRoom = async () => {
    if (!nickname || !clientRef.current) {
      console.log('Create room validation failed:', { nickname, clientRef: !!clientRef.current });
      alert('Please enter a nickname and ensure connection is established');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Attempting to create room with:', { nickname, hasUserIcon: !!userIcon });
      const newRoomId = await clientRef.current.createChatRoom(nickname, userIcon || undefined);
      console.log('Room created successfully:', newRoomId);
      
      setRoomId(newRoomId);
      setCurrentView('chat');
      
      alert(`Your room has been created! Room ID: ${newRoomId}\nShare this ID with others to let them join your room.`);
    } catch (error) {
      console.error('Failed to create room. Full error:', error);
      alert(`Failed to create room: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId || !nickname || !clientRef.current) {
      alert('Please enter both nickname and room ID');
      return;
    }
    
    setIsLoading(true);
    try {
      await clientRef.current.joinChatRoom(nickname, roomId, userIcon || undefined);
      
      // Get message history
      const messageHistory = await clientRef.current.getMessageHistory();
      if (messageHistory && messageHistory.messages) {
        setMessages(messageHistory.messages);
      }
      
      setCurrentView('chat');
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room. Please check the room ID and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !clientRef.current) return;

    try {
      await clientRef.current.sendMessage(SocketMessageTypes.SEND_MESSAGE, {
        body: newMessage.trim()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleTyping = () => {
    if (!isTyping && clientRef.current) {
      setIsTyping(true);
      clientRef.current.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, {
        typing: true
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      clientRef.current?.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, {
        typing: false
      });
    }, 1000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  if (currentView === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl transform transition-all hover:scale-[1.01]">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Join Chat Room
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Your Nickname</label>
              <input
                type="text"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="icon-upload"
                />
                <button
                  onClick={() => document.getElementById('icon-upload')?.click()}
                  className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Picture
                </button>
                {userIcon && (
                  <img
                    src={userIcon}
                    alt="User icon"
                    className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover"
                  />
                )}
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!nickname || !isConnected || isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              {isLoading ? 'Creating...' : 'Create New Room'}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or join existing</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Room ID</label>
              <input
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={!nickname || !roomId || !isConnected || isLoading}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>

            {!isConnected && (
              <div className="text-sm text-center text-red-500 animate-pulse">
                Connecting to server...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl flex flex-col h-[800px] transform transition-all hover:scale-[1.01]">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-800">Chat Room</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {roomId}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {userIcon && (
                <img
                  src={userIcon}
                  alt="Your icon"
                  className="w-8 h-8 rounded-full border-2 border-blue-500"
                />
              )}
              <span className={`text-sm px-3 py-1 rounded-full ${
                isConnected 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? nickname : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col p-6 gap-6">
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${
                    message.isSystemMessage
                      ? 'items-center'
                      : message.userNickname === nickname
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >
                  {message.isSystemMessage ? (
                    <div className="bg-gray-50 px-4 py-2 rounded-lg text-gray-600 text-sm">
                      {message.body}
                    </div>
                  ) : (
                    <div
                      className={`flex items-end gap-2 max-w-[80%] ${
                        message.userNickname === nickname ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {message.userIcon && (
                        <img
                          src={message.userIcon}
                          alt="User icon"
                          className="w-8 h-8 rounded-full border-2 border-gray-200"
                        />
                      )}
                      <div
                        className={`rounded-2xl p-4 ${
                          message.userNickname === nickname
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">
                          {message.userNickname}
                        </div>
                        <div className="text-base">{message.body}</div>
                        <div className={`text-xs mt-2 ${
                          message.userNickname === nickname
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  <span className="text-sm italic">
                    {typingUsers.length === 1
                      ? 'Someone is typing...'
                      : 'Multiple people are typing...'}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type your message..."
              className="flex-1 px-6 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!isConnected}
              className="px-6 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;