import { useState, useEffect } from 'react';
import { ApplicationData } from './types';
import { APP_CONFIG } from './constants';
import { ProgressBar } from './components/ProgressBar';
import { Step1_Intro } from './components/steps/Step1_Intro';
import { Step2_Video } from './components/steps/Step2_Video';
import { Step3_Quiz } from './components/steps/Step3_Quiz';
import { Step4_Form } from './components/steps/Step4_Form';
import { SuccessScreen } from './components/SuccessScreen';
import { Briefcase, ArrowRight } from 'lucide-react';
import { Button } from './components/ui/Button';

const INITIAL_DATA: ApplicationData = {
  timestamp: '',
  utm_source: '',
  utm_campaign: '',
  utm_content: '',
  utm_term: '',
  step1_confirm_schedule: false,
  step1_confirm_methodology: false,
  step1_confirm_audiocontrol: false,
  step2_watched: false,
  step2_control_answer: '',
  quiz_answers: {},
  fullName: '',
  phone: '',
  email: '',
  city: '',
  age18Confirmed: false,
  comment: '',
  consentData: false,
  consentContact: false,
  status: 'New'
};

const STEPS_COUNT = 4;

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<ApplicationData>(INITIAL_DATA);

  // Initialize UTM params and timestamp
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFormData(prev => ({
      ...prev,
      timestamp: new Date().toISOString(),
      utm_source: params.get('utm_source') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || ''
    }));
  }, []);

  const updateData = (fields: Partial<ApplicationData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  const nextStep = () => {
    if (currentStep < STEPS_COUNT - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      setIsSuccess(true);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleRestart = () => {
    setFormData({
      ...INITIAL_DATA,
      timestamp: new Date().toISOString()
    });
    setCurrentStep(0);
    setIsSuccess(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-[#404040] bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#404040]/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#404040] p-2 rounded-xl text-white shadow-lg">
               <Briefcase size={22} />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#404040]">{APP_CONFIG.roleName}</span>
          </div>
          {!isSuccess && <div className="text-xs font-bold text-white bg-[#FF495C] px-4 py-1.5 rounded-full shadow-md shadow-[#FF495C]/20 uppercase tracking-wider">
            Набор открыт
          </div>}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-12 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {!isSuccess ? (
            <>
              {/* Hero Section (Only on Step 0) - Styled as the dark block in reference */}
              {currentStep === 0 && (
                <div className="bg-[#404040] rounded-[2.5rem] p-8 md:p-12 mb-12 shadow-2xl text-center md:text-left relative overflow-hidden group">
                  {/* Decorative blobs */}
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FF495C]/20 rounded-full blur-3xl group-hover:bg-[#FF495C]/30 transition-all duration-700"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
                  
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6 backdrop-blur-sm border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-[#FF495C]"></span>
                      Вакансия 2024
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
                      {APP_CONFIG.heroTitle}
                    </h1>
                    <p className="text-lg text-white/70 max-w-lg leading-relaxed mb-8">
                      {APP_CONFIG.heroSubtitle}
                    </p>
                    <div className="md:hidden">
                      <Button onClick={nextStep} className="w-full">
                        Начать <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps Card */}
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-[#404040]/5 border border-[#404040]/5 p-6 md:p-10">
                <ProgressBar currentStep={currentStep} totalSteps={STEPS_COUNT} />
                
                <div className="min-h-[300px]">
                  {currentStep === 0 && (
                    <Step1_Intro data={formData} updateData={updateData} onNext={nextStep} onPrev={prevStep} />
                  )}
                  {currentStep === 1 && (
                    <Step2_Video data={formData} updateData={updateData} onNext={nextStep} onPrev={prevStep} />
                  )}
                  {currentStep === 2 && (
                    <Step3_Quiz data={formData} updateData={updateData} onNext={nextStep} onPrev={prevStep} />
                  )}
                  {currentStep === 3 && (
                    <Step4_Form data={formData} updateData={updateData} onNext={nextStep} onPrev={prevStep} />
                  )}
                </div>
              </div>
            </>
          ) : (
            <SuccessScreen onRestart={handleRestart} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#404040] py-12 text-white/80">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
             <Briefcase size={24} className="text-white" />
          </div>
          <p className="font-bold text-white text-lg mb-6 tracking-wide">{APP_CONFIG.footer.companyName}</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-white/60">
            {APP_CONFIG.footer.links.map((link, i) => (
              <a key={i} href={link.url} className="hover:text-[#FF495C] transition-colors hover:underline decoration-[#FF495C] underline-offset-4">
                {link.label}
              </a>
            ))}
          </div>
          <p className="mt-8 text-xs text-white/30">© {new Date().getFullYear()} All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
