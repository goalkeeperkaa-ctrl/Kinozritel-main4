import React, { useState, useEffect } from 'react';
import { StepProps } from '../../types';
import { APP_CONFIG } from '../../constants';
import { Button } from '../ui/Button';
import { Play, Clock, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export const Step2_Video: React.FC<StepProps> = ({ data, updateData, onNext, onPrev }) => {
  const [timeLeft, setTimeLeft] = useState(APP_CONFIG.video.durationSeconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState('');

  // Timer logic for simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setShowControls(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (!data.step2_watched) {
      setError('Пожалуйста, подтвердите просмотр видео.');
      return;
    }
    
    // Check Control Question
    if (data.step2_control_answer !== APP_CONFIG.video.correctControlAnswer) {
      setError('Ответ на контрольный вопрос неверен. Пожалуйста, посмотрите видео внимательнее.');
      return;
    }

    setError('');
    onNext();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-bold text-[#404040] mb-3 tracking-tight">{APP_CONFIG.video.title}</h2>
        <p className="text-[#404040]/70 text-lg">Посмотрите короткое видео о вакансии, чтобы ответить на проверочный вопрос.</p>
      </div>

      {/* Video Placeholder */}
      <div className="relative w-full aspect-video bg-[#404040] rounded-3xl overflow-hidden shadow-2xl group border-4 border-[#404040]">
        {!isPlaying ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer" onClick={handlePlay}>
            <div className="bg-[#FF495C] p-6 rounded-full mb-6 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,73,92,0.5)] transition-all duration-300">
              <Play fill="white" className="w-10 h-10 text-white ml-1.5" />
            </div>
            <p className="text-white font-bold text-lg tracking-wide">{APP_CONFIG.video.placeholderText}</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2a2a2a]">
             {timeLeft > 0 ? (
               <div className="text-center">
                 <div className="animate-pulse bg-[#404040] p-6 rounded-2xl border border-white/10">
                    <Clock className="w-10 h-10 text-[#FF495C] mx-auto mb-3" />
                    <p className="text-white/60 font-medium">Видео воспроизводится...</p>
                    <p className="text-3xl font-mono text-white mt-3 tabular-nums">00:{timeLeft.toString().padStart(2, '0')}</p>
                 </div>
               </div>
             ) : (
               <div className="text-white text-lg font-bold bg-[#FF495C] px-8 py-4 rounded-full shadow-lg">
                 Видео просмотрено
               </div>
             )}
          </div>
        )}
      </div>

      {/* Controls appearing after video */}
      <div className={`transition-all duration-700 overflow-hidden ${showControls ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-[#FAFAFA] p-8 rounded-[2rem] border border-[#404040]/5 space-y-6">
          
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#404040]/5 shadow-sm">
             <input 
              type="checkbox" 
              id="watched"
              checked={data.step2_watched}
              onChange={(e) => updateData({ step2_watched: e.target.checked })}
              className="w-6 h-6 text-[#FF495C] rounded-md border-[#404040]/30 focus:ring-[#FF495C]"
            />
            <label htmlFor="watched" className="text-[#404040] font-bold cursor-pointer text-lg">
              Я полностью посмотрел(а) видео
            </label>
          </div>

          <div className="pt-4 border-t border-[#404040]/10">
            <label className="block text-lg font-bold text-[#404040] mb-4">
              Контрольный вопрос: <span className="text-[#FF495C]">{APP_CONFIG.video.controlQuestion}</span>
            </label>
            <div className="space-y-3">
              {APP_CONFIG.video.controlOptions.map((opt) => (
                <label key={opt} className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all ${data.step2_control_answer === opt ? 'border-[#FF495C] bg-[#FF495C]/5' : 'border-transparent bg-white hover:border-[#404040]/10'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${data.step2_control_answer === opt ? 'border-[#FF495C]' : 'border-[#404040]/30'}`}>
                     {data.step2_control_answer === opt && <div className="w-2.5 h-2.5 rounded-full bg-[#FF495C]"></div>}
                  </div>
                  <input 
                    type="radio" 
                    name="control_q"
                    value={opt}
                    checked={data.step2_control_answer === opt}
                    onChange={(e) => {
                      updateData({ step2_control_answer: e.target.value });
                      setError('');
                    }}
                    className="hidden"
                  />
                  <span className="text-[#404040] font-medium">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#FF495C]/10 text-[#FF495C] p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-[#FF495C]/20">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 w-5 h-5" /> Назад
        </Button>
        <Button onClick={handleNext} disabled={!showControls}>
          Далее <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};