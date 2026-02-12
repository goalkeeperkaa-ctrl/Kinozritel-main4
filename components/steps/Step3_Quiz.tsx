import React, { useState } from 'react';
import { StepProps } from '../../types';
import { APP_CONFIG } from '../../constants';
import { Button } from '../ui/Button';
import { AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export const Step3_Quiz: React.FC<StepProps> = ({ data, updateData, onNext, onPrev }) => {
  const [error, setError] = useState('');

  const handleOptionChange = (questionId: string, value: string) => {
    updateData({
      quiz_answers: {
        ...data.quiz_answers,
        [questionId]: value
      }
    });
    setError('');
  };

  const validateAndNext = () => {
    const unanswered = APP_CONFIG.quiz.questions.find(q => !data.quiz_answers[q.id]);
    if (unanswered) {
      setError(`Пожалуйста, ответьте на вопрос: "${unanswered.text}"`);
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
       <div className="text-center md:text-left">
        <h2 className="text-3xl font-bold text-[#404040] mb-3 tracking-tight">{APP_CONFIG.quiz.title}</h2>
        <p className="text-[#404040]/70 text-lg">{APP_CONFIG.quiz.description}</p>
      </div>

      <div className="space-y-8">
        {APP_CONFIG.quiz.questions.map((q, index) => (
          <div key={q.id} className="bg-white p-8 rounded-[2rem] border border-[#404040]/5 shadow-lg shadow-[#404040]/5 transition-all hover:shadow-xl">
            <h3 className="font-bold text-lg text-[#404040] mb-6 flex items-start">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#404040] text-white flex items-center justify-center mr-3 text-sm">{index + 1}</span>
              <span className="mt-1">{q.text}</span>
            </h3>
            
            <div className="space-y-3 pl-0 md:pl-11">
              {q.type === 'radio' && q.options.map(option => {
                const isSelected = data.quiz_answers[q.id] === option;
                return (
                  <label key={option} className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 ${isSelected ? 'border-[#FF495C] bg-[#FF495C]/5' : 'border-transparent bg-[#FAFAFA] hover:bg-[#F0F0F0]'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#FF495C]' : 'border-[#404040]/20'}`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#FF495C]"></div>}
                    </div>
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      checked={isSelected}
                      onChange={(e) => handleOptionChange(q.id, e.target.value)}
                      className="hidden"
                    />
                    <span className={`font-medium ${isSelected ? 'text-[#404040]' : 'text-[#404040]/80'}`}>{option}</span>
                  </label>
                )
              })}

              {q.type === 'select' && (
                <div className="relative">
                  <select
                    value={data.quiz_answers[q.id] || ''}
                    onChange={(e) => handleOptionChange(q.id, e.target.value)}
                    className="w-full p-4 bg-[#FAFAFA] border-2 border-transparent rounded-xl text-[#404040] font-medium focus:ring-4 focus:ring-[#FF495C]/20 focus:border-[#FF495C] outline-none appearance-none transition-all"
                  >
                    <option value="" disabled>Выберите вариант...</option>
                    {q.options.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#404040]/50">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-[#FF495C] text-white p-4 rounded-2xl flex items-center gap-3 animate-bounce shadow-lg shadow-[#FF495C]/30">
          <AlertCircle size={24} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="flex justify-between pt-6 pb-4">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 w-5 h-5" /> Назад
        </Button>
        <Button onClick={validateAndNext}>
          Перейти к заявке <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};