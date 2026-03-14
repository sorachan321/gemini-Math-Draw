import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Send, Plus, X, Loader2, Bot, Menu, MessageSquare, Settings, PlusCircle, ChevronDown, Key, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { TikzRenderer } from './components/TikzRenderer';

type Message = {
  role: 'user' | 'model';
  text: string;
  images?: string[]; // base64 strings
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
};

type ModelType = 'fast' | 'thinking' | 'pro';

export default function App() {
  const [chats, setChats] = useState<ChatSession[]>([{ id: '1', title: '新对话', messages: [] }]);
  const [currentChatId, setCurrentChatId] = useState('1');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState(process.env.GEMINI_API_KEY || '');
  const [selectedModel, setSelectedModel] = useState<ModelType>('fast');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find(c => c.id === currentChatId) || chats[0];

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat.messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const createNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        // Update title based on first user message if it's still "新对话"
        let title = chat.title;
        if (title === '新对话' && newMessages.length > 0 && newMessages[0].role === 'user') {
          title = newMessages[0].text.slice(0, 15) + (newMessages[0].text.length > 15 ? '...' : '');
        }
        return { ...chat, messages: newMessages, title };
      }
      return chat;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && images.length === 0) return;
    if (!apiKey) {
      alert('请先在设置中填写 API Key');
      setShowSettings(true);
      if (window.innerWidth < 768) setIsSidebarOpen(true);
      return;
    }

    const userMessage: Message = { role: 'user', text: input, images: [...images] };
    const updatedMessages = [...currentChat.messages, userMessage];
    updateChatMessages(currentChatId, updatedMessages);
    
    setInput('');
    setImages([]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare contents for Gemini
      const contents = updatedMessages.map(msg => {
        const msgParts: any[] = [];
        if (msg.text) msgParts.push({ text: msg.text });
        msg.images?.forEach(img => {
          const match = img.match(/^data:(image\/[a-z]+);base64,(.*)$/);
          if (match) {
            msgParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        });
        return { role: msg.role, parts: msgParts };
      });

      let modelName = 'gemini-3-flash-preview';
      const config: any = {
        systemInstruction: "你是一个资深的数学和几何老师。当用户需要查看几何图形时，你必须且只能使用标准的 LaTeX TikZ 代码来绘制图形。请将 TikZ 代码包裹在标准的 Markdown 代码块中，并标记语言为 tikz，例如：\n```tikz\n\\begin{tikzpicture}\n...\n\\end{tikzpicture}\n```",
      };

      if (selectedModel === 'fast') {
        modelName = 'gemini-3-flash-preview';
        config.thinkingConfig = { thinkingLevel: 'low' };
      } else if (selectedModel === 'thinking') {
        modelName = 'gemini-3-flash-preview';
        config.thinkingConfig = { thinkingLevel: 'high' };
      } else if (selectedModel === 'pro') {
        modelName = 'gemini-3.1-pro-preview';
        config.thinkingConfig = { thinkingLevel: 'high' };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config
      });

      updateChatMessages(currentChatId, [...updatedMessages, { role: 'model', text: response.text || '' }]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      updateChatMessages(currentChatId, [...updatedMessages, { role: 'model', text: '抱歉，发生了一些错误，请检查 API Key 或稍后再试。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden text-gray-900 font-sans">
      {/* Sidebar */}
      <div 
        className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          fixed md:relative z-30 w-72 h-full bg-[#f9f9f9] border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between gap-2">
          <button 
            onClick={createNewChat}
            className="flex-1 flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            新对话
          </button>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors hidden md:block"
            title="收起侧边栏"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => {
                setCurrentChatId(chat.id);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                currentChatId === chat.id ? 'bg-[#ebebeb] text-gray-900' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate font-medium">{chat.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          {showSettings ? (
            <div className="space-y-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Key className="w-4 h-4" /> API Key
                </span>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入 Gemini API Key"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none"
              />
            </div>
          ) : (
            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">设置</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 p-2 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
            title="打开侧边栏"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        )}

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-40">
          <div className="max-w-3xl mx-auto space-y-6">
            {currentChat.messages.length === 0 && (
              <div className="text-center text-gray-500 mt-20 md:mt-32">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                  <Bot className="w-10 h-10 text-gray-700" />
                </div>
                <h2 className="text-2xl font-medium text-gray-800 mb-2">有什么我可以帮忙的？</h2>
                <p className="text-gray-500 text-sm">
                  问我数学问题，或者让我为你绘制几何图形。
                </p>
              </div>
            )}
            
            {currentChat.messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200 mt-1">
                    <Bot className="w-5 h-5 text-gray-700" />
                  </div>
                )}
                
                <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Images */}
                  {msg.images && msg.images.length > 0 && (
                    <div className={`flex flex-wrap gap-2 mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.images.map((img, i) => (
                        <img key={i} src={img} alt="Uploaded" className="max-w-[240px] max-h-[240px] rounded-2xl object-cover border border-gray-200 shadow-sm" />
                      ))}
                    </div>
                  )}
                  
                  {/* Text / Markdown */}
                  {msg.text && (
                    <div className={`px-5 py-3.5 ${
                      msg.role === 'user' 
                        ? 'bg-[#f4f4f4] text-gray-900 rounded-3xl rounded-tr-sm' 
                        : 'text-gray-800'
                    }`}>
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            img(props: any) {
                              return <img {...props} onLoad={scrollToBottom} className="max-w-full h-auto rounded-lg my-2" />;
                            },
                            code(props: any) {
                              const { children, className, node, ...rest } = props;
                              const match = /language-(\w+)/.exec(className || '');
                              
                              if (match && match[1] === 'tikz') {
                                return <TikzRenderer code={String(children).replace(/\n$/, '')} onResize={scrollToBottom} />;
                              }
                              
                              return match ? (
                                <pre className="bg-gray-50 text-gray-800 p-4 rounded-xl overflow-x-auto my-3 border border-gray-200 text-sm">
                                  <code className={className} {...rest}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded-md text-sm font-mono text-gray-800" {...rest}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200 mt-1">
                  <Bot className="w-5 h-5 text-gray-700" />
                </div>
                <div className="px-5 py-3.5 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            {/* Image Preview */}
            {images.length > 0 && (
              <div className="flex gap-3 mb-3 overflow-x-auto pb-2 px-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group flex-shrink-0">
                    <img src={img} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-gray-200 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative bg-[#f4f4f4] rounded-3xl border border-gray-200 p-3 transition-shadow focus-within:shadow-md">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="问问 Gemini 3"
                className="w-full max-h-40 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2 px-3 text-gray-800 placeholder-gray-500 text-base outline-none"
                rows={1}
              />
              <div className="flex items-center justify-between mt-2 px-1">
                <div className="flex items-center gap-1">
                  <label className="p-2 text-gray-500 hover:bg-gray-200 rounded-full cursor-pointer transition-colors">
                    <Plus className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      {selectedModel === 'fast' ? '快速' : selectedModel === 'thinking' ? '思考' : 'Pro'}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {isModelDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsModelDropdownOpen(false)}></div>
                        <div className="absolute bottom-full right-0 mb-2 w-32 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20 py-1">
                          <button type="button" onClick={() => { setSelectedModel('fast'); setIsModelDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${selectedModel === 'fast' ? 'text-black font-medium bg-gray-50' : 'text-gray-600'}`}>快速</button>
                          <button type="button" onClick={() => { setSelectedModel('thinking'); setIsModelDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${selectedModel === 'thinking' ? 'text-black font-medium bg-gray-50' : 'text-gray-600'}`}>思考</button>
                          <button type="button" onClick={() => { setSelectedModel('pro'); setIsModelDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${selectedModel === 'pro' ? 'text-black font-medium bg-gray-50' : 'text-gray-600'}`}>Pro</button>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && images.length === 0)}
                    className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
            <div className="text-center mt-3 text-xs text-gray-400">
              Gemini 可能会犯错。请核查重要信息。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
