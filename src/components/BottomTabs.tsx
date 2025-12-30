'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, Map, MessageCircle, Settings } from 'lucide-react';

const tabs = [
    { name: 'Projects', path: '/projects', icon: Home },
    { name: 'Today', path: '/today', icon: Calendar },
    { name: 'Roadmap', path: '/roadmap', icon: Map },
    { name: 'Chat', path: '/chat', icon: MessageCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
];

export default function BottomTabs() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 safe-area-bottom">
            <div className="flex justify-around items-center h-16 px-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = pathname === tab.path || pathname.startsWith(tab.path + '/');

                    return (
                        <button
                            key={tab.path}
                            onClick={() => router.push(tab.path)}
                            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 ${isActive
                                    ? 'text-zinc-100 bg-zinc-800'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                            <span className={`text-[10px] mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                {tab.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
