/**
 * SummaryGenie 옵션 페이지 스크립트 (웹 개선 버전)
 * UI 표시 및 사용자 인터랙션 담당
 * v2.3.0 - 깜빡임 방지 적용
 * 
 * 전역 방식: 모든 모듈은 window 객체에 이미 노출되어 있습니다.
 * 
 * 📝 v2.3.0 변경사항:
 * - 프리미엄 사용자만 히스토리 섹션 표시 (잠금 오버레이)
 * - 구독 상태에 따라 구독 섹션 UI 동적 변경
 * - 완전한 다국어 지원
 * - 언어 변경 시 히스토리 오버레이 및 구독 UI 텍스트 즉시 업데이트
 * - 깜빡임 방지 적용
 */

// 전역 객체 사용 확인 (디버깅용)
(function() {
  const requiredGlobals = [
    'languageManager',
    'UIComponents', 
    'storageManager',
    'settingsManager',
    'historyManager',
    'errorHandler',
    'createSafeElement',
    'validateInput',
    'formatRelativeTime',
    'formatDate',
    'usageManager',
    'tokenManager'
  ];
  
  const missing = requiredGlobals.filter(name => !window[name]);
  
  if (missing.length > 0) {
    console.error('[Options] 누락된 전역 객체:', missing);
  } else {
    console.log('[Options] 모든 전역 객체 로드 완료');
  }
})();

const elements = {
  languageSelect: document.getElementById('languageSelect'),
  themeSelect: document.getElementById('themeSelect'),
  viewHistoryBtn: document.getElementById('viewHistoryBtn'),
  exportHistoryBtn: document.getElementById('exportHistoryBtn'),
  importHistoryBtn: document.getElementById('importHistoryBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  importFile: document.getElementById('importFile'),
  subscribeBtn: document.getElementById('subscribeBtn'),
  historyModal: document.getElementById('historyModal'),
  closeHistoryBtn: document.getElementById('closeHistoryBtn'),
  searchHistory: document.getElementById('searchHistory'),
  filterPeriod: document.getElementById('filterPeriod'),
  historyList: document.getElementById('historyList'),
  historyDetailModal: document.getElementById('historyDetailModal'),
  closeDetailBtn: document.getElementById('closeDetailBtn'),
  detailTitle: document.getElementById('detailTitle'),
  detailUrl: document.getElementById('detailUrl'),
  detailTime: document.getElementById('detailTime'),
  detailSummary: document.getElementById('detailSummary'),
  detailQASection: document.getElementById('detailQASection'),
  detailQAList: document.getElementById('detailQAList'),
  openPageBtn: document.getElementById('openPageBtn'),
  version: document.getElementById('version'),
  privacyLink: document.getElementById('privacyLink'),
  termsLink: document.getElementById('termsLink'),
  resetBtn: document.getElementById('resetBtn'),
  saveBtn: document.getElementById('saveBtn'),
  messageBox: document.getElementById('message-box'),
  
  // ✅ 구독 관련 요소 추가
  subscriptionStatus: document.querySelector('.subscription-status'),
  subscriptionInfo: document.querySelector('.subscription-info'),
  subscriptionTitle: document.querySelector('.subscription-title'),
  subscriptionDescription: document.querySelector('.subscription-description'),
  subscriptionBadge: document.querySelector('.subscription-badge'),
  subscriptionFeatures: document.querySelector('.subscription-features')
};

let appState = {
  currentHistoryPage: 0,
  historyPageSize: 50
};

/**
 * 메시지 표시 함수 (Toast 대체)
 * @param {string} message - 표시할 메시지
 * @param {string} type - 메시지 타입 ('success', 'error', 'info')
 */
function showMessage(message, type = 'success') {
  const messageBox = elements.messageBox;
  messageBox.textContent = message;
  
  messageBox.classList.remove('show', 'success', 'error', 'info');
  messageBox.classList.add('show', type);
  
  setTimeout(() => {
    messageBox.classList.remove('show');
  }, 3000);
}

/**
 * ✅ 구독 상태에 따라 구독 섹션 UI 업데이트
 * @param {boolean} isPremium - 프리미엄 사용자 여부
 * @param {Object} usageData - 사용량 데이터 (선택)
 */
function updateSubscriptionUI(isPremium, usageData = null) {
  try {
    console.log('[Options] 구독 UI 업데이트:', isPremium ? '프리미엄' : '무료');
    
    if (isPremium) {
      // 🌟 프리미엄 사용자
      
      // 구독 설명 변경
      if (elements.subscriptionDescription) {
        elements.subscriptionDescription.setAttribute('data-i18n', 'proPlanDescription');
        elements.subscriptionDescription.textContent = 
          window.languageManager.getMessage('proPlanDescription') || 
          '프리미엄 플랜을 이용 중입니다.';
      }
      
      // 구독 배지 변경
      if (elements.subscriptionBadge) {
        elements.subscriptionBadge.classList.remove('free');
        elements.subscriptionBadge.classList.add('pro');
        elements.subscriptionBadge.setAttribute('data-i18n', 'proBadge');
        elements.subscriptionBadge.textContent = 
          window.languageManager.getMessage('proBadge') || '프로';
      }
      
      // 구독 버튼 텍스트 변경
      if (elements.subscribeBtn) {
        const btnTextSpan = elements.subscribeBtn.querySelector('span:last-child');
        if (btnTextSpan) {
          btnTextSpan.setAttribute('data-i18n', 'manageSubscription');
          btnTextSpan.textContent = 
            window.languageManager.getMessage('manageSubscription') || '구독 관리';
        }
      }
      
      // 프리미엄 혜택 목록 숨김 (이미 프리미엄이므로)
      if (elements.subscriptionFeatures) {
        elements.subscriptionFeatures.style.display = 'none';
      }
      
    } else {
      // 💵 무료 사용자
      
      // 구독 설명 변경
      if (elements.subscriptionDescription) {
        elements.subscriptionDescription.setAttribute('data-i18n', 'freePlanDescription');
        elements.subscriptionDescription.textContent = 
          window.languageManager.getMessage('freePlanDescription') || 
          '무료 플랜 이용 중입니다.';
      }
      
      // 구독 배지 변경
      if (elements.subscriptionBadge) {
        elements.subscriptionBadge.classList.remove('pro');
        elements.subscriptionBadge.classList.add('free');
        elements.subscriptionBadge.setAttribute('data-i18n', 'freeBadge');
        
        // 사용량 정보가 있으면 표시
        let badgeText = window.languageManager.getMessage('freeBadge') || '무료 (3회/일)';
        
        if (usageData && !usageData.isPremium) {
          const limit = usageData.dailyLimit === Infinity ? '∞' : usageData.dailyLimit;
          const timesText = window.languageManager.getMessage('times') || '회';
          badgeText = `무료 (${limit}${timesText}/일)`;
        }
        
        elements.subscriptionBadge.textContent = badgeText;
      }
      
      // 구독 버튼 텍스트 변경
      if (elements.subscribeBtn) {
        const btnTextSpan = elements.subscribeBtn.querySelector('span:last-child');
        if (btnTextSpan) {
          btnTextSpan.setAttribute('data-i18n', 'subscribePremium');
          btnTextSpan.textContent = 
            window.languageManager.getMessage('subscribePremium') || 
            '프리미엄 구독하기 / 관리';
        }
      }
      
      // 프리미엄 혜택 목록 표시
      if (elements.subscriptionFeatures) {
        elements.subscriptionFeatures.style.display = '';
      }
    }
    
    console.log('[Options] 구독 UI 업데이트 완료');
    
  } catch (error) {
    console.error('[Options] 구독 UI 업데이트 오류:', error);
    window.errorHandler.handle(error, 'updateSubscriptionUI');
  }
}

/**
 * ✅ 히스토리 오버레이 텍스트만 업데이트 (언어 변경 시)
 */
function updateHistoryOverlayText() {
  const historySection = document.querySelector('.settings-section:has(#viewHistoryBtn)');
  
  if (!historySection) {
    return;
  }
  
  const overlay = historySection.querySelector('.lock-overlay');
  
  if (overlay) {
    // 기존 오버레이가 있으면 텍스트만 업데이트
    const lockTitle = overlay.querySelector('.lock-title');
    const lockDescription = overlay.querySelector('.lock-description');
    const upgradeBtn = overlay.querySelector('#upgradeFromHistory span:last-child');
    const overlayHint = overlay.querySelector('.overlay-hint');
    
    if (lockTitle) {
      lockTitle.textContent = window.languageManager.getMessage('historyFeatureTitle');
    }
    
    if (lockDescription) {
      lockDescription.innerHTML = window.languageManager.getMessage('historyFeatureDescription');
    }
    
    if (upgradeBtn) {
      upgradeBtn.textContent = window.languageManager.getMessage('upgradeToPremium');
    }
    
    if (overlayHint) {
      overlayHint.textContent = window.languageManager.getMessage('overlayHint');
    }
    
    console.log('[Options] 히스토리 오버레이 텍스트 업데이트 완료');
  }
}

/**
 * ✅ 프리미엄 상태 확인 및 히스토리 섹션 + 구독 섹션 제어
 */
async function checkPremiumAndToggleHistory() {
  try {
    console.log('[Options] 프리미엄 상태 확인 중...');
    
    let isPremium = false;
    let usageData = null;
    
    // 방법 1: usageManager 사용 (서버 기반, 가장 정확)
    if (window.usageManager) {
      try {
        usageData = await window.usageManager.getUsageStatus();
        isPremium = usageData.isPremium === true;
        console.log('[Options] usageManager 기반 프리미엄 상태:', isPremium);
      } catch (usageError) {
        console.warn('[Options] usageManager 조회 실패, tokenManager로 대체');
      }
    }
    
    // 방법 2: tokenManager 사용 (백업)
    if (!isPremium && window.tokenManager) {
      try {
        const token = await window.tokenManager.getAccessToken();
        
        if (token) {
          const decoded = window.tokenManager.decodeToken(token);
          isPremium = decoded?.isPremium === true;
          console.log('[Options] tokenManager 기반 프리미엄 상태:', isPremium);
        }
      } catch (tokenError) {
        console.warn('[Options] tokenManager 조회 실패');
      }
    }
    
    // ✅ 히스토리 섹션 제어
    toggleHistorySection(isPremium);
    
    // ✅ 구독 섹션 UI 업데이트
    updateSubscriptionUI(isPremium, usageData);
    
  } catch (error) {
    console.error('[Options] 프리미엄 확인 오류:', error);
    window.errorHandler.handle(error, 'check-premium-status');
    
    // 에러 시 안전하게 무료로 표시
    toggleHistorySection(false);
    updateSubscriptionUI(false);
  }
}

/**
 * ✅ 히스토리 섹션 잠금/해제 (항상 오버레이)
 * @param {boolean} isPremium - 프리미엄 사용자 여부
 */
function toggleHistorySection(isPremium) {
  // 히스토리 관리 섹션 찾기
  const historySection = document.querySelector('.settings-section:has(#viewHistoryBtn)');
  
  if (!historySection) {
    console.warn('[Options] 히스토리 섹션을 찾을 수 없습니다');
    return;
  }
  
  if (isPremium) {
    // ✅ 프리미엄: 정상 표시
    historySection.style.display = '';
    historySection.style.position = '';
    historySection.style.minHeight = '';
    historySection.classList.remove('locked');
    
    // 기존 오버레이 제거
    const existingOverlay = historySection.querySelector('.lock-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // 버튼 활성화
    const buttons = historySection.querySelectorAll('.history-btn');
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    });
    
    console.log('[Options] ✅ 히스토리 섹션 활성화 (프리미엄 사용자)');
    
  } else {
    // ❌ 무료: 잠금 오버레이 표시
    historySection.style.display = '';
    historySection.style.position = 'relative';
    historySection.style.minHeight = '250px'; // ✅ 최소 높이 설정
    historySection.classList.add('locked');
    
    // 버튼 비활성화
    const buttons = historySection.querySelectorAll('.history-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.3';
    });
    
    // 오버레이가 이미 있으면 추가하지 않음
    if (!historySection.querySelector('.lock-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'lock-overlay';
      overlay.innerHTML = `
        <div class="lock-content">
          <div class="lock-header">
            <span class="material-icons lock-icon">history</span>
            <p class="lock-title">${window.languageManager.getMessage('historyFeatureTitle')}</p>
          </div>
          <p class="lock-description">
            ${window.languageManager.getMessage('historyFeatureDescription')}
          </p>
          <button class="upgrade-btn-small" id="upgradeFromHistory">
            <span class="material-icons">workspace_premium</span>
            <span>${window.languageManager.getMessage('upgradeToPremium')}</span>
          </button>
          <p class="overlay-hint">${window.languageManager.getMessage('overlayHint')}</p>
        </div>
      `;
      
      historySection.appendChild(overlay);
      
      // 업그레이드 버튼 이벤트
      const upgradeBtn = overlay.querySelector('#upgradeFromHistory');
      if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
          chrome.tabs.create({ 
            url: 'https://summarygenie.com/premium' 
          });
        });
      }
    }
    
    console.log('[Options] 🔒 히스토리 섹션 잠금 (무료 사용자)');
  }
}

async function initialize() {
  try {
    await window.languageManager.initialize();
    await window.settingsManager.initialize();
    await window.historyManager.initialize();
    
    // 🆕 syncManager 초기화
    if (window.syncManager) {
      await window.syncManager.initialize();
      console.log('[Options] syncManager 초기화 완료');
    } else {
      console.warn('[Options] syncManager를 찾을 수 없습니다');
    }
    
    // ✅ 프리미엄 상태 확인 및 히스토리 섹션 + 구독 섹션 제어
    await checkPremiumAndToggleHistory();
    
    updateUIFromSettings();
    
    const manifest = chrome.runtime.getManifest();
    elements.version.textContent = manifest.version;
    
    updateSelectOptions();
    setupEventListeners();
    
    window.settingsManager.onSettingsChange((newSettings, oldSettings) => {
      console.log('[Settings] 설정 변경 감지');
      
      if (oldSettings.language !== newSettings.language) {
        window.languageManager.changeLanguage(newSettings.language).then(() => {
          updateSelectOptions();
        });
      }
    });
    
    console.log('[Options] 초기화 완료');
    
    // ✅ 깜빡임 방지: 초기화 완료 후 페이드인
    document.body.classList.add('loaded');
    
  } catch (error) {
    console.error('[Options] 초기화 오류:', error);
    window.errorHandler.handle(error, 'options-initialization');
    showMessage(window.languageManager.getMessage('toastError'), 'error');
    
    // ✅ 에러 발생 시에도 페이지 표시
    document.body.classList.add('loaded');
  }
}

function updateUIFromSettings() {
  const settings = window.settingsManager.getSettings();
  
  elements.languageSelect.value = settings.language;
  elements.themeSelect.value = settings.theme;
}

function collectAndValidateSettings() {
  const languageValidation = window.validateInput(elements.languageSelect.value, {
    type: 'string',
    required: true,
    allowedValues: ['ko', 'en', 'ja', 'zh']
  });
  
  if (!languageValidation.valid) {
    throw new Error(`언어 설정: ${languageValidation.error}`);
  }
  
  const themeValidation = window.validateInput(elements.themeSelect.value, {
    type: 'string',
    required: true,
    allowedValues: ['light', 'dark', 'auto']
  });
  
  if (!themeValidation.valid) {
    throw new Error(`테마 설정: ${themeValidation.error}`);
  }
  
  return {
    language: languageValidation.sanitized,
    theme: themeValidation.sanitized
  };
}

async function saveSettings() {
  try {
    const previousLanguage = window.settingsManager.getSetting('language');
    const newSettings = collectAndValidateSettings();
    
    console.log('[Options] 설정 저장 중...');
    
    await window.settingsManager.saveSettings(newSettings);
    
    if (previousLanguage !== newSettings.language) {
      await window.languageManager.changeLanguage(newSettings.language);
      updateSelectOptions();
      
      // ✅ 언어 변경 시 UI 업데이트
      updateHistoryOverlayText();
      
      // ✅ 구독 UI도 다시 체크하여 업데이트
      await checkPremiumAndToggleHistory();
    }
    
    showMessage(window.languageManager.getMessage('toastSettingsSaved'), 'success');
    
  } catch (error) {
    console.error('[Options] 설정 저장 오류:', error);
    window.errorHandler.handle(error, 'save-settings');
    showMessage(error.message || window.languageManager.getMessage('toastError'), 'error');
  }
}

async function resetSettings() {
  const confirmed = await window.UIComponents.confirm.show(
    window.languageManager.getMessage('confirmReset'),
    {
      title: window.languageManager.getMessage('confirm') || 'Confirm',
      confirmText: window.languageManager.getMessage('reset') || 'Reset',
      cancelText: window.languageManager.getMessage('cancel') || 'Cancel',
      type: 'warning'
    }
  );
  
  if (!confirmed) return;
  
  try {
    await window.settingsManager.resetSettings();
    updateUIFromSettings();
    
    const newLanguage = window.settingsManager.getSetting('language');
    if (newLanguage !== window.languageManager.getCurrentLanguage()) {
      await window.languageManager.changeLanguage(newLanguage);
      updateSelectOptions();
      updateHistoryOverlayText();
    }
    
    showMessage(window.languageManager.getMessage('toastResetComplete'), 'success');
  } catch (error) {
    console.error('[Options] 설정 초기화 오류:', error);
    window.errorHandler.handle(error, 'reset-settings');
    showMessage(window.languageManager.getMessage('toastError'), 'error');
  }
}

async function openHistoryModal() {
  try {
    elements.historyModal.classList.remove('hidden');
    
    while (elements.historyList.firstChild) {
      elements.historyList.removeChild(elements.historyList.firstChild);
    }
    
    const loadingDiv = window.createSafeElement('div', {
      style: 'text-align: center; padding: 40px; color: var(--text-secondary);'
    });
    const spinner = window.createSafeElement('div', {
      class: 'spinner',
      style: 'margin: 0 auto 16px; width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;'
    });
    const text = window.createSafeElement('p', {}, 
      window.languageManager.getMessage('loadingHistory')
    );
    
    loadingDiv.appendChild(spinner);
    loadingDiv.appendChild(text);
    elements.historyList.appendChild(loadingDiv);
    
    console.log('[Options] 히스토리 동기화 시작');
    
    try {
      const syncResult = await window.historyManager.mergeWithCloud();
      console.log('[Options] 동기화 완료:', syncResult);
      
      showMessage(
        window.languageManager.getMessage('historySynced', [syncResult.downloaded]),
        'success'
      );
    } catch (syncError) {
      console.warn('[Options] 동기화 실패 (로컬만 표시):', syncError);
      showMessage(
        window.languageManager.getMessage('syncFailed'),
        'info'
      );
    }
    
    await displayHistory();
    
  } catch (error) {
    console.error('[Options] 히스토리 모달 열기 오류:', error);
    window.errorHandler.handle(error, 'openHistoryModal');
    showMessage(window.languageManager.getMessage('toastError'), 'error');
  }
}

async function displayHistory(filter = 'all', searchTerm = '') {
  try {
    const result = await window.historyManager.getHistory({
      query: searchTerm,
      filter: filter,
      sort: searchTerm ? 'relevance' : 'date',
      limit: appState.historyPageSize,
      offset: appState.currentHistoryPage * appState.historyPageSize
    });
    
    while (elements.historyList.firstChild) {
      elements.historyList.removeChild(elements.historyList.firstChild);
    }
    
    if (result.items.length === 0) {
      const noHistoryMessage = window.languageManager.getMessage('noHistory');
      const noHistoryDiv = window.createSafeElement('div', {
        style: 'text-align: center; color: var(--text-disabled); padding: 40px;'
      });
      
      const icon = window.createSafeElement('span', {
        class: 'material-icons',
        style: 'font-size: 48px; color: var(--border-color);'
      }, 'history');
      
      const text = window.createSafeElement('p', {
        style: 'margin-top: 16px;'
      }, noHistoryMessage);
      
      noHistoryDiv.appendChild(icon);
      noHistoryDiv.appendChild(text);
      elements.historyList.appendChild(noHistoryDiv);
      
      return;
    }
    
    const timeMessages = {
      justNow: window.languageManager.getMessage('justNow') || '방금 전',
      minutesAgo: (n) => window.languageManager.getMessage('minutesAgo', [n]) || `${n}분 전`,
      hoursAgo: (n) => window.languageManager.getMessage('hoursAgo', [n]) || `${n}시간 전`,
      daysAgo: (n) => window.languageManager.getMessage('daysAgo', [n]) || `${n}일 전`
    };
    
    result.items.forEach(item => {
      const historyItem = window.createSafeElement('div', { class: 'history-item' });
      
      const header = window.createSafeElement('div', { class: 'history-item-header' });
      
      const titleContainer = window.createSafeElement('div', { 
        style: 'display: flex; align-items: center; gap: 8px;' 
      });
      
      const title = window.createSafeElement('div', { class: 'history-item-title' }, item.title);
      titleContainer.appendChild(title);
      
      if (item.pending_sync) {
        const syncIcon = window.createSafeElement('span', {
          class: 'material-icons',
          style: 'font-size: 16px; color: var(--warning-color);',
          title: window.languageManager.getMessage('syncing')
        }, 'sync');
        titleContainer.appendChild(syncIcon);
      }
      
      const date = window.createSafeElement('div', { class: 'history-item-date' },
        window.formatRelativeTime(item.timestamp, window.languageManager.getCurrentLanguage(), timeMessages)
      );
      
      header.appendChild(titleContainer);
      header.appendChild(date);
      
      const url = window.createSafeElement('div', { class: 'history-item-url' }, item.url);
      const summary = window.createSafeElement('div', { class: 'history-item-summary' }, item.summary);
      
      historyItem.appendChild(header);
      historyItem.appendChild(url);
      historyItem.appendChild(summary);
      
      historyItem.addEventListener('click', () => {
        viewHistoryDetail(item.id);
      });
      
      elements.historyList.appendChild(historyItem);
    });
    
  } catch (error) {
    console.error('[Options] 히스토리 표시 오류:', error);
    window.errorHandler.handle(error, 'display-history');
    showMessage(window.languageManager.getMessage('toastError'), 'error');
  }
}

async function viewHistoryDetail(historyId) {
  try {
    const item = await window.historyManager.getHistoryById(historyId);
    
    if (!item) {
      showMessage(window.languageManager.getMessage('noHistory'), 'error');
      return;
    }
    
    elements.detailTitle.textContent = item.title || window.languageManager.getMessage('noTitle');
    elements.detailUrl.textContent = item.url;
    elements.detailTime.textContent = window.formatDate(
      item.timestamp,
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      },
      window.languageManager.getCurrentLanguage()
    );
    elements.detailSummary.textContent = item.summary;
    
    while (elements.detailQAList.firstChild) {
      elements.detailQAList.removeChild(elements.detailQAList.firstChild);
    }
    
    if (item.qaHistory && item.qaHistory.length > 0) {
      elements.detailQASection.classList.remove('hidden');
      
      item.qaHistory.forEach(qa => {
        const qaItem = window.createSafeElement('div', { class: 'detail-qa-item' });
        const question = window.createSafeElement('div', { class: 'detail-qa-question' }, `Q: ${qa.question}`);
        const answer = window.createSafeElement('div', { class: 'detail-qa-answer' }, `A: ${qa.answer}`);
        
        qaItem.appendChild(question);
        qaItem.appendChild(answer);
        elements.detailQAList.appendChild(qaItem);
      });
    } else {
      elements.detailQASection.classList.add('hidden');
    }
    
    elements.openPageBtn.onclick = () => {
      chrome.tabs.create({ url: item.url });
    };
    
    elements.historyDetailModal.classList.remove('hidden');
    
  } catch (error) {
    console.error('[Options] 히스토리 상세보기 오류:', error);
    window.errorHandler.handle(error, 'view-history-detail');
    showMessage(window.languageManager.getMessage('toastError'), 'error');
  }
}

async function exportHistory() {
  try {
    const stats = await window.historyManager.getStatistics();
    
    if (stats.total === 0) {
      showMessage(window.languageManager.getMessage('noHistoryExport'), 'error');
      return;
    }
    
    const jsonData = await window.historyManager.exportHistory('json', {
      includeQA: true
    });
    
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summarygenie-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    const message = window.languageManager.getMessage('historyExported', [stats.total]) ||
                    `${stats.total}개의 히스토리를 내보냈습니다`;
    showMessage(message, 'success');
    
  } catch (error) {
    console.error('[Options] 히스토리 내보내기 오류:', error);
    window.errorHandler.handle(error, 'export-history');
    showMessage(window.languageManager.getMessage('toastError'), 'error');
  }
}

function importHistory(file) {
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      const importData = e.target.result;
      
      const result = await window.historyManager.importHistory(importData, {
        merge: true,
        replace: false
      });
      
      const message = window.languageManager.getMessage('historyImported', [result.imported]) ||
                      `${result.imported}개의 새로운 히스토리를 가져왔습니다`;
      showMessage(message, 'success');
      
      const filter = elements.filterPeriod.value;
      const searchTerm = elements.searchHistory.value;
      await displayHistory(filter, searchTerm);
      
    } catch (error) {
      console.error('[Options] 히스토리 가져오기 오류:', error);
      window.errorHandler.handle(error, 'import-history');
      showMessage(error.message || window.languageManager.getMessage('importFailed'), 'error');
    }
  };
  
  reader.readAsText(file);
}

async function clearHistory() {
  const confirmed = await window.UIComponents.confirm.show(
    window.languageManager.getMessage('confirmDeleteHistory'),
    {
      title: window.languageManager.getMessage('confirm') || 'Confirm',
      confirmText: window.languageManager.getMessage('delete') || 'Delete',
      cancelText: window.languageManager.getMessage('cancel') || 'Cancel',
      type: 'danger'
    }
  );
  
  if (!confirmed) return;
  
  try {
    await window.historyManager.clearHistory();
    
    await displayHistory();
    
    showMessage(window.languageManager.getMessage('toastHistoryCleared'), 'success');
    
  } catch (error) {
    console.error('[Options] 히스토리 삭제 오류:', error);
    window.errorHandler.handle(error, 'clear-history');
    showMessage(window.languageManager.getMessage('historyDeleteFailed'), 'error');
  }
}

function handleSubscribe() {
  chrome.tabs.create({ 
    url: 'https://summarygenie.com/subscribe' 
  });
  
  showMessage(window.languageManager.getMessage('redirectingToSubscription'), 'info');
}

function updateSelectOptions() {
  if (elements.themeSelect) {
    const options = elements.themeSelect.querySelectorAll('option');
    options[0].textContent = window.languageManager.getMessage('themeLight');
    options[1].textContent = window.languageManager.getMessage('themeDark');
    options[2].textContent = window.languageManager.getMessage('themeAuto');
  }
  
  if (elements.filterPeriod) {
    const options = elements.filterPeriod.querySelectorAll('option');
    options[0].textContent = window.languageManager.getMessage('filterAll');
    options[1].textContent = window.languageManager.getMessage('filterToday');
    options[2].textContent = window.languageManager.getMessage('filterWeek');
    options[3].textContent = window.languageManager.getMessage('filterMonth');
  }
}

function setupEventListeners() {
  elements.themeSelect.addEventListener('change', (e) => {
    window.settingsManager.applyTheme(e.target.value);
  });
  
  elements.languageSelect.addEventListener('change', async (e) => {
    const newLanguage = e.target.value;
    await window.languageManager.changeLanguage(newLanguage);
    updateSelectOptions();
    
    // ✅ 히스토리 오버레이 텍스트 즉시 업데이트
    updateHistoryOverlayText();
    
    // ✅ 구독 UI도 업데이트
    await checkPremiumAndToggleHistory();
    
    if (!elements.historyModal.classList.contains('hidden')) {
      const filter = elements.filterPeriod.value;
      const searchTerm = elements.searchHistory.value;
      await displayHistory(filter, searchTerm);
    }
  });
  
  elements.viewHistoryBtn.addEventListener('click', async () => {
    await openHistoryModal();
  });
  
  elements.closeHistoryBtn.addEventListener('click', () => {
    elements.historyModal.classList.add('hidden');
  });
  
  elements.closeDetailBtn?.addEventListener('click', () => {
    elements.historyDetailModal.classList.add('hidden');
  });
  
  elements.historyModal.addEventListener('click', (e) => {
    if (e.target === elements.historyModal) {
      elements.historyModal.classList.add('hidden');
    }
  });
  
  elements.historyDetailModal?.addEventListener('click', (e) => {
    if (e.target === elements.historyDetailModal) {
      elements.historyDetailModal.classList.add('hidden');
    }
  });
  
  elements.searchHistory.addEventListener('input', async (e) => {
    const filter = elements.filterPeriod.value;
    await displayHistory(filter, e.target.value);
  });
  
  elements.filterPeriod.addEventListener('change', async (e) => {
    const searchTerm = elements.searchHistory.value;
    await displayHistory(e.target.value, searchTerm);
  });
  
  elements.exportHistoryBtn.addEventListener('click', exportHistory);
  
  elements.importHistoryBtn.addEventListener('click', () => {
    elements.importFile.click();
  });
  
  elements.importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importHistory(file);
      e.target.value = '';
    }
  });
  
  elements.clearHistoryBtn.addEventListener('click', clearHistory);
  
  elements.subscribeBtn.addEventListener('click', handleSubscribe);
  
  elements.saveBtn.addEventListener('click', saveSettings);
  
  elements.resetBtn.addEventListener('click', resetSettings);
  
  elements.privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://summarygenie.com/privacy' });
  });
  
  elements.termsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://summarygenie.com/terms' });
  });
}

document.addEventListener('DOMContentLoaded', initialize);