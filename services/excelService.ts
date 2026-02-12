import { ApplicationData } from '../types';

/**
 * ============================================================================
 * ИНСТРУКЦИЯ ПО ПРЯМОЙ СВЯЗИ С EXCEL / GOOGLE SHEETS
 * ============================================================================
 * 
 * Чтобы данные падали напрямую в таблицу (бесплатно и без Zapier):
 * 
 * 1. Создайте Google Таблицу (или Excel Online через Power Automate).
 * 2. Если используете Google Таблицы:
 *    - Откройте таблицу -> Расширения -> Apps Script.
 *    - Полностью замените код в редакторе на скрипт ниже:
 * 
 *    function doPost(e) {
 *      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *      var data = JSON.parse(e.postData.contents);
 *      
 *      // Если заголовков нет, создаем их
 *      if (sheet.getLastRow() === 0) {
 *        sheet.appendRow(["Date", "Status", "Name", "Phone", "City", "Age18+", "Quiz_Availability", "Quiz_Device", "Score_Result", "All_Data_JSON"]);
 *      }
 *      
 *      sheet.appendRow([
 *        new Date(),
 *        data.status,
 *        data.fullName,
 *        data.phone,
 *        data.city,
 *        data.age18Confirmed ? "Yes" : "No",
 *        data.quiz_answers['q_availability'] || '-',
 *        data.quiz_answers['q_device'] || '-',
 *        data.status === 'New' ? 'Pass' : 'Fail',
 *        JSON.stringify(data)
 *      ]);
 *      
 *      return ContentService.createTextOutput(JSON.stringify({"result":"success"})).setMimeType(ContentService.MimeType.JSON);
 *    }
 * 
 * 3. Нажмите "Начать развертывание" (Deploy) -> "Новое развертывание" (New Deployment).
 * 4. Выберите тип: "Веб-приложение" (Web App).
 * 5. ВАЖНО: В поле "У кого есть доступ" (Who has access) выберите "ВСЕ" (Anyone).
 * 6. Нажмите "Развернуть", скопируйте "URL веб-приложения" и вставьте его ниже в WEBHOOK_URL.
 */

const WEBHOOK_URL = ''; // <-- ВСТАВЬТЕ СЮДА ВАШУ ССЫЛКУ ОТ GOOGLE APPS SCRIPT

export const submitToExcel = async (data: ApplicationData): Promise<boolean> => {
  console.log("Preparing to send data to Direct Excel Integration...");
  
  // 1. Calculate Status Logic
  let computedStatus = 'New';
  
  if (!data.age18Confirmed) {
    computedStatus = 'Rejected (Age)';
  } else {
    const qAvailability = data.quiz_answers['q_availability'];
    const qDevice = data.quiz_answers['q_device'];
    const qLearning = data.quiz_answers['q_learning'];

    if (
      (qAvailability && qAvailability.includes("Нет")) ||
      (qDevice && qDevice.includes("Нет")) ||
      (qLearning && qLearning.includes("импровизировать"))
    ) {
      computedStatus = 'Rejected (Criteria)';
    }
  }

  const payload = {
    ...data,
    status: computedStatus,
    submittedAt: new Date().toISOString()
  };

  // 2. Local Simulation (if no URL provided)
  if (!WEBHOOK_URL) {
    console.warn("⚠️ WEBHOOK_URL пустой. Данные не отправлены в таблицу.");
    console.log("PAYLOAD:", payload);
    // Имитация задержки сети
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true; // Возвращаем true, чтобы показать экран успеха в демо-режиме
  }

  // 3. Direct Send (Google Apps Script / Power Automate compatible)
  try {
    // Используем 'no-cors' для Google Apps Script, если обычный запрос блокируется
    // Или используем text/plain, чтобы избежать preflight запросов (CORS)
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', // Важно для Google Apps Script Webhook
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // В режиме no-cors мы не можем прочитать статус ответа (он всегда 0/opaque),
    // поэтому считаем, что если ошибка сети не вылетела, то всё ок.
    console.log("Request sent (no-cors mode). Assuming success.");
    return true;
    
  } catch (error) {
    console.error("Network error submitting data", error);
    return false;
  }
};