import React, { useState } from 'react';
import { StepProps } from '../../types';
import { APP_CONFIG } from '../../constants';
import { Button } from '../ui/Button';
import { AlertCircle, Lock, ArrowLeft, Send } from 'lucide-react';
import { submitToExcel } from '../../services/excelService';

export const Step4_Form: React.FC<StepProps> = ({ data, updateData, onNext, onPrev }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.fullName.trim()) newErrors.fullName = 'Введите ФИО';
    if (!data.phone.trim()) newErrors.phone = 'Введите телефон';
    if (!data.city.trim()) newErrors.city = 'Укажите город';
    if (!data.age18Confirmed) newErrors.age18Confirmed = 'Необходимо подтвердить возраст 18+';
    if (!data.consentData) newErrors.consentData = 'Необходимо согласие на обработку данных';
    if (!data.consentContact) newErrors.consentContact = 'Необходимо согласие на связь';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const success = await submitToExcel(data);
    setIsSubmitting(false);

    if (success) {
      onNext();
    } else {
      setErrors({ submit: 'Ошибка отправки. Попробуйте еще раз.' });
    }
  };

  const InputField = ({ label, id, type = 'text', value, required = false, placeholder = '' }: any) => (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-bold text-[#404040] ml-1">
        {label} {required && <span className="text-[#FF495C]">*</span>}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          updateData({ [id]: e.target.value });
          if (errors[id]) setErrors({ ...errors, [id]: '' });
        }}
        className={`w-full p-4 rounded-xl border-2 ${errors[id] ? 'border-[#FF495C] bg-[#FF495C]/5' : 'border-[#404040]/10 bg-[#FAFAFA]'} focus:ring-4 focus:ring-[#FF495C]/20 focus:border-[#FF495C] outline-none transition-all font-medium text-[#404040] placeholder:text-[#404040]/30`}
      />
      {errors[id] && <p className="text-xs font-bold text-[#FF495C] ml-1">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-bold text-[#404040] mb-3 tracking-tight">{APP_CONFIG.form.title}</h2>
        <p className="text-[#404040]/70 text-lg">Оставьте свои контакты для связи.</p>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-[#404040]/5 shadow-lg space-y-6">
        <InputField id="fullName" label="ФИО" value={data.fullName} required placeholder="Иванов Иван Иванович" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField id="phone" label="Телефон" type="tel" value={data.phone} required placeholder="+7 (999) 000-00-00" />
          <InputField id="email" label="Email (необязательно)" type="email" value={data.email} placeholder="mail@example.com" />
        </div>
        
        <InputField id="city" label="Город проживания" value={data.city} required />
        
        <div className="space-y-2">
          <label htmlFor="comment" className="block text-sm font-bold text-[#404040] ml-1">Комментарий (опыт, вопросы)</label>
          <textarea
            id="comment"
            rows={3}
            value={data.comment}
            onChange={(e) => updateData({ comment: e.target.value })}
            className="w-full p-4 rounded-xl border-2 border-[#404040]/10 bg-[#FAFAFA] focus:ring-4 focus:ring-[#FF495C]/20 focus:border-[#FF495C] outline-none transition-all font-medium text-[#404040]"
          ></textarea>
        </div>
      </div>

      <div className="space-y-4 bg-[#404040]/5 p-6 rounded-[2rem]">
        {[
          { id: 'age18Confirmed', label: 'Мне исполнилось 18 лет' },
          { id: 'consentData', label: 'Согласен(на) на обработку персональных данных' },
          { id: 'consentContact', label: 'Согласен(на) на связь по телефону/мессенджерам' }
        ].map((item) => (
          <div key={item.id}>
             <label className="flex items-start gap-4 cursor-pointer group">
              <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${data[item.id as keyof typeof data] ? 'bg-[#FF495C] border-[#FF495C]' : 'border-[#404040]/30 bg-white group-hover:border-[#FF495C]/50'}`}>
                {data[item.id as keyof typeof data] && <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <input
                type="checkbox"
                checked={data[item.id as keyof typeof data] as boolean}
                onChange={(e) => {
                  updateData({ [item.id]: e.target.checked });
                  if (errors[item.id]) setErrors({ ...errors, [item.id]: '' });
                }}
                className="hidden"
              />
              <span className="text-sm font-medium text-[#404040] pt-0.5">{item.label}</span>
            </label>
            {errors[item.id] && <p className="text-xs font-bold text-[#FF495C] ml-10 mt-1">{errors[item.id]}</p>}
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-2 text-xs font-medium text-[#404040]/40 justify-center">
        <Lock size={12} />
        Ваши данные надежно защищены.
      </div>

      {errors.submit && (
        <div className="bg-[#FF495C]/10 text-[#FF495C] p-4 rounded-xl text-center flex items-center justify-center gap-2 border border-[#FF495C]/20 font-bold">
          <AlertCircle size={20} />
          {errors.submit}
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
           <ArrowLeft className="mr-2 w-5 h-5" /> Назад
        </Button>
        <Button onClick={handleSubmit} variant="primary" isLoading={isSubmitting} className="px-10">
          Отправить заявку <Send className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};