import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between mb-2 text-xs font-bold text-[#404040] uppercase tracking-wider">
        <span>Шаг {Math.min(currentStep + 1, totalSteps)} из {totalSteps}</span>
        <span>{Math.round(progressPercentage)}%</span>
      </div>
      <div className="w-full bg-[#404040]/10 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-[#FF495C] h-3 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,73,92,0.3)]" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};