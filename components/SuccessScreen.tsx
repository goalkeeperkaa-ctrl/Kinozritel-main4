import React from 'react';
import { APP_CONFIG } from '../constants';
import { Button } from './ui/Button';
import { CheckCircle, PartyPopper, Star } from 'lucide-react';

export const SuccessScreen: React.FC<{ onRestart: () => void }> = ({ onRestart }) => {
  return (
    <div className="text-center py-16 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-[#FF495C]/20 rounded-full animate-ping opacity-75"></div>
        <div className="bg-[#FF495C] p-8 rounded-full relative z-10 text-white shadow-xl shadow-[#FF495C]/30">
          <PartyPopper size={64} strokeWidth={1.5} />
        </div>
        <div className="absolute -top-2 -right-2 text-[#404040] animate-bounce delay-100">
            <Star fill="#EBF962" stroke="#EBF962" size={32} />
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-4xl font-extrabold text-[#404040] tracking-tight">{APP_CONFIG.form.successTitle}</h2>
        
        <div className="bg-white p-8 rounded-[2rem] border border-[#404040]/5 shadow-xl max-w-md mx-auto relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-[#FF495C]"></div>
          <p className="text-[#404040] text-xl mb-6 font-medium leading-relaxed">{APP_CONFIG.form.successMessage}</p>
          <div className="flex items-center justify-center gap-3 text-sm font-bold text-[#FF495C] bg-[#FF495C]/5 py-3 px-4 rounded-xl">
            <CheckCircle size={18} />
            <span>Данные успешно сохранены</span>
          </div>
        </div>
      </div>

      <div className="pt-8">
        <Button variant="outline" onClick={onRestart}>
          Отправить ещё одну заявку
        </Button>
      </div>
    </div>
  );
};