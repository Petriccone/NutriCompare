import React from 'react';
import { Settings, ScanLine } from 'lucide-react';
import { UserGoal } from '../types';

interface HeaderProps {
    userGoal?: UserGoal;
    onChangeGoal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ userGoal, onChangeGoal }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-cyan-400" />
            <span className="font-mono font-bold text-white text-sm tracking-wider">NUTRI<span className="text-cyan-400">SCAN</span></span>
        </div>
        
        <div className="flex items-center gap-3">
             {userGoal && (
                 <button 
                    onClick={onChangeGoal}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md border border-gray-800 rounded-full text-[10px] font-mono font-bold text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
                 >
                    <Settings className="w-3 h-3" />
                    <span>{userGoal.toUpperCase().replace('_', ' ')}</span>
                 </button>
             )}
        </div>
      </div>
    </header>
  );
};