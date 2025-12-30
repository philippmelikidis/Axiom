'use client';

import { useAppStore } from '@/lib/store';
import ProjectPicker from '@/components/ProjectPicker';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, User, Bot, Wand2, Trash2 } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export default function ChatPage() {
    const router = useRouter();
    const project = useAppStore((s) => s.getSelectedProject());
    const { updateProject } = useAppStore();

    // Load messages from project's chatHistory
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load chat history when project changes
    useEffect(() => {
        if (project?.chatHistory) {
            setMessages(project.chatHistory);
        } else {
            setMessages([]);
        }
    }, [project?.projectId]);

    // Save messages to project whenever they change
    useEffect(() => {
        if (project && messages.length > 0) {
            updateProject(project.projectId, {
                chatHistory: messages
            });
        }
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!project) {
        return (
            <div className="px-4 py-6 max-w-lg mx-auto text-center">
                <h1 className="text-2xl font-bold text-zinc-100 mb-4">Chat</h1>
                <p className="text-zinc-500 mb-6">Select a project to chat about</p>
                <button onClick={() => router.push('/projects')} className="px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium">Go to Projects</button>
            </div>
        );
    }

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        const newUserMsg: Message = {
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        };

        setInput('');
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, newUserMsg],
                    project
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Chat failed');
            }

            const assistantMsg: Message = {
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Failed to get response. Please try again.',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyChanges = async () => {
        if (!project || messages.length === 0) return;

        // Get the last assistant message as the adjustment text
        const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
        if (!lastAssistantMessage) return;

        setIsApplying(true);

        try {
            const response = await fetch('/api/plan/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentProject: project,
                    dailyCheck: {
                        date: new Date().toISOString().split('T')[0],
                        completedTaskIds: [],
                        skippedTaskIds: [],
                        notes: 'Applied via chat'
                    },
                    adjustmentText: `User requested: ${messages.filter(m => m.role === 'user').slice(-1)[0]?.content || ''}\n\nAI suggested: ${lastAssistantMessage.content}`
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to apply changes');
            }

            // Update the project with new data
            updateProject(project.projectId, data.project);

            // Add confirmation message
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Changes applied to your project.',
                timestamp: new Date().toISOString()
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Failed to apply changes: ${err instanceof Error ? err.message : 'Unknown error'}`,
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsApplying(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        if (project) {
            updateProject(project.projectId, { chatHistory: [] });
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-5rem)] max-w-lg mx-auto">
            <div className="px-4 py-4 border-b border-zinc-800 flex items-center justify-between">
                <ProjectPicker />
                {messages.length > 0 && (
                    <button
                        onClick={handleClearChat}
                        className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Clear chat"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <Bot className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                        <h2 className="text-lg font-medium text-zinc-300 mb-2">Chat with AXIOM</h2>
                        <p className="text-sm text-zinc-500 mb-4">
                            Ask questions or request changes to your plan
                        </p>
                        <div className="space-y-2 text-sm text-zinc-600">
                            <p>"Can I reduce today's run to 20 minutes?"</p>
                            <p>"Move my long run to Sunday"</p>
                            <p>"What should I focus on this week?"</p>
                        </div>
                    </div>
                )}

                {messages.map((message, i) => (
                    <div
                        key={i}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-zinc-400" />
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] px-4 py-3 rounded-2xl ${message.role === 'user'
                                    ? 'bg-zinc-100 text-zinc-900'
                                    : 'bg-zinc-800 text-zinc-200'
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-zinc-300" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                        </div>
                        <div className="bg-zinc-800 px-4 py-3 rounded-2xl">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Apply changes button when there's a conversation */}
            {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !isLoading && (
                <div className="px-4 py-2 border-t border-zinc-800">
                    <button
                        onClick={handleApplyChanges}
                        disabled={isApplying}
                        className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isApplying ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Applying...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4" />
                                Apply Changes to Project
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className="px-4 py-4 border-t border-zinc-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask about your plan..."
                        className="flex-1 px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                        disabled={isLoading || isApplying}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || isApplying || !input.trim()}
                        className="w-12 h-12 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
