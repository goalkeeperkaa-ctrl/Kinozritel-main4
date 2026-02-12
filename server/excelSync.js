const EXCEL_WEBHOOK_URL = process.env.EXCEL_WEBHOOK_URL || '';
const EXCEL_WORKBOOK_URL = process.env.EXCEL_WORKBOOK_URL || '';

const boolToRu = (value) => (value ? 'Да' : 'Нет');

export const mapToExcelRow = (application) => ({
  ID: application.id,
  Timestamp: application.created_at,
  FullName: application.full_name,
  Phone: application.phone,
  Email: application.email || '',
  City: application.city,
  Age18Confirmed: boolToRu(application.age_18_confirmed),
  Step1Confirmed: boolToRu(application.step1_confirmed),
  Step2Watched: boolToRu(application.step2_video_watched),
  Step2ControlAnswer: application.step2_control_answer || '',
  QuizAnswers: JSON.stringify(application.quiz_answers || {}),
  Status: application.status,
  AssignedTo: application.assigned_to || '',
  Notes: application.notes || '',
  UTM_Source: application.source_utm?.utm_source || '',
  UTM_Campaign: application.source_utm?.utm_campaign || '',
  UTM_Content: application.source_utm?.utm_content || '',
  UTM_Term: application.source_utm?.utm_term || '',
  LastContactAt: application.last_contact_at || '',
  ContactAttempts: application.contact_attempts || 0,
  RejectReason: application.reject_reason || '',
  InterviewAt: application.interview_at || '',
  Duplicate: boolToRu(Boolean(application.duplicate)),
});

export const getExcelWorkbookUrl = () => EXCEL_WORKBOOK_URL;

export const syncApplicationToExcel = async (application, action) => {
  if (!EXCEL_WEBHOOK_URL) {
    // eslint-disable-next-line no-console
    console.warn('[excel-sync] EXCEL_WEBHOOK_URL is empty. Sync skipped.');
    return { synced: false, reason: 'missing_webhook_url' };
  }

  const payload = {
    action,
    timestamp: new Date().toISOString(),
    application_id: application.id,
    row: mapToExcelRow(application),
    application,
  };

  try {
    const response = await fetch(EXCEL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      // eslint-disable-next-line no-console
      console.error('[excel-sync] Webhook error', response.status, body);
      return { synced: false, reason: `http_${response.status}` };
    }

    return { synced: true };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[excel-sync] Network error', error);
    return { synced: false, reason: 'network_error' };
  }
};
