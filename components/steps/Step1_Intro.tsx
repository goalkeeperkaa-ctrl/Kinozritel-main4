import React from 'react';
import { StepProps } from '../../types';
import { APP_CONFIG } from '../../constants';
import { Button } from '../ui/Button';
import { CheckCircle2, Heart, Users, ArrowRight, Calendar, MapPin, Wallet, Smile, Sparkles, MessageCircle } from 'lucide-react';

export const Step1_Intro: React.FC<StepProps> = ({ data, updateData, onNext }) => {
  const { intro } = APP_CONFIG;

  const isStepValid = 
    data.step1_confirm_schedule && 
    data.step1_confirm_methodology && 
    data.step1_confirm_audiocontrol;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 slide-in-from-bottom-4">
      
      {/* 1. Meaning / Who we are */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-[#FF495C]/10 text-[#FF495C] px-4 py-1.5 rounded-full text-sm font-bold">
          <Heart size={16} fill="currentColor" />
          <span>О проекте</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-[#404040] tracking-tight">
          {APP_CONFIG.heroSubtitle}
        </h2>
        <p className="text-[#404040]/70 text-lg leading-relaxed max-w-2xl mx-auto">
          {intro.projectDesc}
        </p>
      </div>

      {/* 2. Role / What to do */}
      <div className="bg-gradient-to-br from-[#FAFAFA] to-white p-8 rounded-[2rem] border border-[#404040]/5 shadow-sm">
        <h3 className="text-xl font-bold text-[#404040] mb-6 flex items-center gap-2">
          <Smile className="text-[#FF495C]" />
          {intro.role.title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {intro.role.points.map((point, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF495C]/10 flex items-center justify-center text-[#FF495C] font-bold">
                {i + 1}
              </div>
              <p className="text-[#404040] font-medium leading-relaxed">
                {point}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Day in Life / Workflow */}
      <div>
        <h3 className="text-xl font-bold text-[#404040] mb-6 text-center md:text-left flex items-center gap-2">
          <Sparkles className="text-[#FF495C]" />
          {intro.workflow.title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {intro.workflow.steps.map((step, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-[#404040]/10 hover:border-[#FF495C]/30 transition-colors shadow-sm">
              <h4 className="font-bold text-[#404040] mb-2">{step.title}</h4>
              <p className="text-sm text-[#404040]/70">{step.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 bg-[#404040]/5 p-4 rounded-xl text-sm text-[#404040]/80">
          <MessageCircle size={18} className="text-[#404040]" />
          {intro.workflow.support}
        </div>
      </div>

      {/* 4. Conditions */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#404040] flex items-center gap-2">
          <Users className="text-[#FF495C]" />
          {intro.conditions.title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#FAFAFA] p-5 rounded-2xl border border-[#404040]/5">
            <Calendar className="text-[#FF495C] mb-3" />
            <h4 className="font-bold text-[#404040] mb-1">{intro.conditions.cards[0].title}</h4>
            <p className="text-sm text-[#404040]/70">{intro.conditions.cards[0].text}</p>
          </div>
          <div className="bg-[#FAFAFA] p-5 rounded-2xl border border-[#404040]/5">
            <MapPin className="text-[#FF495C] mb-3" />
            <h4 className="font-bold text-[#404040] mb-1">{intro.conditions.cards[1].title}</h4>
            <p className="text-sm text-[#404040]/70">{intro.conditions.cards[1].text}</p>
          </div>
          <div className="bg-[#FAFAFA] p-5 rounded-2xl border border-[#404040]/5">
            <Wallet className="text-[#FF495C] mb-3" />
            <h4 className="font-bold text-[#404040] mb-1">{intro.conditions.cards[2].title}</h4>
            <p className="text-sm text-[#404040]/70">{intro.conditions.cards[2].text}</p>
          </div>
        </div>
      </div>

      {/* Standards (Friendly Expectation) */}
      <div className="bg-[#FF495C]/5 p-6 rounded-2xl border border-[#FF495C]/10">
        <h4 className="font-bold text-[#404040] mb-2">{intro.standards.title}</h4>
        <p className="text-[#404040]/80 text-sm leading-relaxed">
          {intro.standards.text}
        </p>
      </div>

      {/* Mandatory Checkboxes (Friendly Text) */}
      <div className="space-y-3 pt-2">
        <h4 className="font-bold text-[#404040] mb-2 text-sm uppercase tracking-wider opacity-60">Важное для старта:</h4>
        
        {[
          { key: 'step1_confirm_schedule', text: intro.agreements.schedule },
          { key: 'step1_confirm_methodology', text: intro.agreements.methodology },
          { key: 'step1_confirm_audiocontrol', text: intro.agreements.audiocontrol }
        ].map((item) => (
          <div 
            key={item.key}
            className={`p-4 rounded-xl border-2 flex items-start gap-4 transition-all duration-200 cursor-pointer ${data[item.key as keyof typeof data] ? 'bg-white border-[#FF495C] shadow-md shadow-[#FF495C]/10' : 'bg-white border-[#404040]/10 hover:border-[#404040]/30'}`}
            onClick={() => updateData({ [item.key]: !data[item.key as keyof typeof data] })}
          >
            <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${data[item.key as keyof typeof data] ? 'bg-[#FF495C] border-[#FF495C]' : 'border-[#404040]/30 bg-white'}`}>
              {data[item.key as keyof typeof data] && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <label className="text-[#404040] font-medium text-sm md:text-base cursor-pointer select-none leading-tight">
              {item.text}
            </label>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={onNext} 
          disabled={!isStepValid}
          className="w-full md:w-auto px-10"
        >
          Далее <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};