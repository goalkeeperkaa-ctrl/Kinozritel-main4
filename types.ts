export interface QuizQuestion {
  id: string;
  text: string;
  type: 'radio' | 'select';
  options: string[];
  correctAnswer?: string; // Optional: used for auto-rejection logic
  isCritical?: boolean;   // If true and answer is wrong/no, reject
}

export interface ApplicationData {
  // Meta
  timestamp: string;
  utm_source: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  
  // Step 1: Methodology & Rules (New specific gates)
  step1_confirm_schedule: boolean;    // "Я понял(а) график..."
  step1_confirm_methodology: boolean; // "Я понял(а), что нельзя переформулировать..."
  step1_confirm_audiocontrol: boolean;// "Я понял(а), что каждое интервью записывается..."
  
  // Step 2: Video
  step2_watched: boolean;
  step2_control_answer: string;
  
  // Step 3: Quiz
  quiz_answers: Record<string, string>;
  
  // Step 4: Contact
  fullName: string;
  phone: string;
  email: string;
  city: string;
  age18Confirmed: boolean;
  comment: string;
  consentData: boolean;
  consentContact: boolean;
  
  // Calculated
  status:
    | 'New'
    | 'In review'
    | 'Contacted'
    | 'No answer'
    | 'Interview scheduled'
    | 'Interview passed'
    | 'Training'
    | 'Exam scheduled'
    | 'Approved'
    | 'Rejected'
    | 'Reserve';
}

export interface StepProps {
  data: ApplicationData;
  updateData: (fields: Partial<ApplicationData>) => void;
  onNext: () => void;
  onPrev: () => void;
}
