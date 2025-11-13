/**
 * extension\sidepanel.js
 * SummaryGenie Side Panel Main Script
 * popup.js 기반으로 Side Panel 전용 기능 추가
 *
 * ✨ v7.0.0 업데이트:
 * - PDF 타임아웃 180초로 통일
 * - Service Worker Keep-Alive 구현 (15초 주기)
 * - PDF 진행 상황 실시간 UI 업데이트
 * - 페이드인 효과로 깜빡임 방지
 *
 * @version 7.0.0
 */

class SidePanelController {
  constructor() {
    this.currentPageContent = '';
    this.currentPageInfo = {
      title: '',
      url: '',
      domain: '',
    };
    this.currentSummary = '';
    this.currentHistoryId = null;
    this.currentUser = null;
    this.usage = {
      daily: 0,
      limit: 5,
    };
    this.isPremium = false;
    this.settingsUnsubscribe = null;
    this.initialized = false;

    // 실시간 사용량 업데이트 리스너
    this.storageChangeListener = null;
    this.visibilityChangeListener = null;
    this.focusListener = null;
    this.usagePollingInterval = null;

    // Side Panel 전용: 활성 탭 추적
    this.currentTabId = null;

    // ✨ Service Worker Keep-Alive (새로 추가)
    this.keepAliveInterval = null;
    this.progressListener = null;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[SidePanel] 초기화 시작');

      // Background 없이 직접 토큰 체크
      const isAuthenticated = await this.checkAuthStatusDirect();

      if (!isAuthenticated) {
        console.log('[Auth] 로그인 필요 - 안내 화면 표시');
        this.showLoginRequiredScreen();
        
        // ✅ 로그인 화면도 페이드인
        document.body.classList.add('loaded');
        return;
      }

      await window.languageManager.initialize();
      await window.settingsManager.initialize();
      await window.historyManager.initialize();

      this.updateUITexts();
      await this.loadCurrentTab();
      await window.qaManager.initialize();
      await this.checkUsage();

      await this.checkPremiumAndToggleQuestion();

      this.setupEventListeners();
      this.setupSettingsChangeListener();
      this.setupRealtimeUsageUpdate();
      this.setupTabChangeListener();
      this.setupProgressListener(); // ✨ 진행 상황 리스너 설정
      window.languageManager.applyLanguageFont();

      this.displayUserInfo();

      this.initialized = true;
      console.log('[SidePanel] 초기화 완료');

      // ✅ 깜빡임 방지: 초기화 완료 후 페이드인
      document.body.classList.add('loaded');

      await this.checkAutoSummarize();
    } catch (error) {
      console.error('[SidePanel] 초기화 오류:', error);
      window.errorHandler.handle(error, 'sidepanel-initialization');
      this.showError('initializationError');
      
      // ✅ 에러 발생 시에도 페이지 표시
      document.body.classList.add('loaded');
    }
  }

  /**
   * ✨ 진행 상황 리스너 설정 (새로 추가)
   */
  setupProgressListener() {
    this.progressListener = (message, sender, sendResponse) => {
      if (message.action === 'pdfProgress') {
        this.updatePDFProgress(message.data);
      }
    };
    
    chrome.runtime.onMessage.addListener(this.progressListener);
    console.log('[SidePanel] 진행 상황 리스너 설정 완료');
  }

  /**
   * ✨ PDF 진행 상황 UI 업데이트 (새로 추가)
   */
  updatePDFProgress(data) {
    const container = document.getElementById('pdfProgressContainer');
    const progressBar = document.getElementById('pdfProgressBar');
    const progressText = document.getElementById('pdfProgressText');
    const progressDetail = document.getElementById('pdfProgressDetail');

    if (!container || !progressBar || !progressText || !progressDetail) {
      return;
    }

    // 컨테이너 표시
    container.classList.remove('hidden');

    // 진행률 계산
    const percentage = data.progress || 0;
    progressBar.style.width = `${percentage}%`;

    // 단계별 메시지
    switch (data.stage) {
      case 'download':
        progressText.textContent = 'PDF 다운로드 중...';
        progressDetail.textContent = data.message || '파일을 가져오는 중입니다...';
        break;
      
      case 'offscreen':
        progressText.textContent = 'PDF 처리 준비 중...';
        progressDetail.textContent = data.message || 'PDF 분석 도구를 준비하고 있습니다...';
        break;
      
      case 'extract':
        progressText.textContent = 'PDF 텍스트 추출 중...';
        if (data.currentPage && data.totalPages) {
          progressDetail.textContent = `페이지 ${data.currentPage}/${data.totalPages} 추출 중...`;
        } else {
          progressDetail.textContent = data.message || '텍스트를 추출하고 있습니다...';
        }
        break;
      
      case 'complete':
        progressText.textContent = 'PDF 추출 완료!';
        progressDetail.textContent = data.message || '추출이 완료되었습니다.';
        // 2초 후 숨김
        setTimeout(() => {
          container.classList.add('hidden');
        }, 2000);
        break;
      
      case 'error':
        progressText.textContent = 'PDF 추출 실패';
        progressDetail.textContent = data.message || '오류가 발생했습니다.';
        progressBar.style.background = 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)';
        // 3초 후 숨김
        setTimeout(() => {
          container.classList.add('hidden');
          progressBar.style.background = '';
        }, 3000);
        break;
      
      default:
        progressText.textContent = 'PDF 처리 중...';
        progressDetail.textContent = data.message || '잠시만 기다려주세요...';
    }

    console.log('[SidePanel] 진행 상황 업데이트:', data);
  }

  /**
   * ✅ 자동 요약 플래그 확인 및 실행
   */
  async checkAutoSummarize() {
    try {
      const result = await chrome.storage.local.get('autoSummarize');

      if (result.autoSummarize === true) {
        console.log('[SidePanel] 자동 요약 시작');

        await chrome.storage.local.remove('autoSummarize');

        setTimeout(() => {
          this.summarizePage();
        }, 500);
      }
    } catch (error) {
      console.error('[SidePanel] 자동 요약 확인 오류:', error);
    }
  }

  /**
   * ✅ Side Panel 전용: 활성 탭 변경 감지
   */
  setupTabChangeListener() {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log('[SidePanel] 탭 변경 감지:', activeInfo.tabId);
      this.currentTabId = activeInfo.tabId;
      await this.loadCurrentTab();
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (tabId === this.currentTabId && changeInfo.status === 'complete') {
        console.log('[SidePanel] 탭 업데이트 완료');
        await this.loadCurrentTab();
      }
    });
  }

  /**
   * ✅ 질문 섹션 오버레이 텍스트만 업데이트 (언어 변경 시)
   */
  updateQuestionOverlayText() {
    const questionSection = document.getElementById('questionSection');

    if (!questionSection) {
      return;
    }

    const overlay = questionSection.querySelector('.question-lock-overlay');

    if (overlay) {
      const lockTitle = overlay.querySelector('.question-lock-title');
      const lockDescription = overlay.querySelector('.question-lock-description');
      const upgradeBtn = overlay.querySelector(
        '#upgradeFromQuestion span:last-child'
      );
      const overlayHint = overlay.querySelector('.question-overlay-hint');

      if (lockTitle) {
        lockTitle.textContent =
          window.languageManager.getMessage('questionFeatureTitle');
      }

      if (lockDescription) {
        lockDescription.innerHTML = window.languageManager.getMessage(
          'questionFeatureDescription'
        );
      }

      if (upgradeBtn) {
        upgradeBtn.textContent =
          window.languageManager.getMessage('upgradeToPremium');
      }

      if (overlayHint) {
        overlayHint.textContent = window.languageManager.getMessage('overlayHint');
      }

      console.log('[SidePanel] 질문 섹션 오버레이 텍스트 업데이트 완료');
    }
  }

  /**
   * ✅ 프리미엄 상태 확인 및 질문 섹션 제어
   */
  async checkPremiumAndToggleQuestion() {
    try {
      console.log('[SidePanel] 질문 섹션 - 프리미엄 상태 확인 중...');

      let isPremium = false;

      if (window.usageManager) {
        try {
          const usageStatus = await window.usageManager.getUsageStatus();
          isPremium = usageStatus.isPremium === true;
          console.log('[SidePanel] usageManager 기반 프리미엄 상태:', isPremium);
        } catch (usageError) {
          console.warn('[SidePanel] usageManager 조회 실패, tokenManager로 대체');
        }
      }

      if (!isPremium && window.tokenManager) {
        try {
          const token = await window.tokenManager.getAccessToken();

          if (token) {
            const decoded = window.tokenManager.decodeToken(token);
            isPremium = decoded?.isPremium === true;
            console.log('[SidePanel] tokenManager 기반 프리미엄 상태:', isPremium);
          }
        } catch (tokenError) {
          console.warn('[SidePanel] tokenManager 조회 실패');
        }
      }

      this.toggleQuestionSection(isPremium);
    } catch (error) {
      console.error('[SidePanel] 질문 섹션 프리미엄 확인 오류:', error);
      window.errorHandler.handle(error, 'check-premium-status-question');
      this.toggleQuestionSection(false);
    }
  }

  /**
   * ✅ 질문 섹션 잠금/해제 (항상 오버레이)
   */
  toggleQuestionSection(isPremium) {
    const questionSection = document.getElementById('questionSection');

    if (!questionSection) {
      console.warn('[SidePanel] 질문 섹션을 찾을 수 없습니다');
      return;
    }

    if (isPremium) {
      questionSection.style.position = '';
      questionSection.style.minHeight = '';
      questionSection.classList.remove('locked');

      const existingOverlay = questionSection.querySelector(
        '.question-lock-overlay'
      );
      if (existingOverlay) {
        existingOverlay.remove();
      }

      const questionInput = questionSection.querySelector('#questionInput');
      const askBtn = questionSection.querySelector('#askBtn');
      const clearQABtn = questionSection.querySelector('#clearQABtn');

      if (questionInput) {
        questionInput.disabled = false;
        questionInput.style.pointerEvents = 'auto';
        questionInput.style.opacity = '1';
      }

      if (askBtn) {
        askBtn.disabled = false;
        askBtn.style.pointerEvents = 'auto';
        askBtn.style.opacity = '1';
      }

      if (clearQABtn) {
        clearQABtn.disabled = false;
        clearQABtn.style.pointerEvents = 'auto';
        clearQABtn.style.opacity = '1';
      }

      console.log('[SidePanel] ✅ 질문 섹션 활성화 (프리미엄 사용자)');
    } else {
      questionSection.style.position = 'relative';
      questionSection.style.minHeight = '180px';
      questionSection.classList.add('locked');

      const questionInput = questionSection.querySelector('#questionInput');
      const askBtn = questionSection.querySelector('#askBtn');
      const clearQABtn = questionSection.querySelector('#clearQABtn');

      if (questionInput) {
        questionInput.disabled = true;
        questionInput.style.pointerEvents = 'none';
        questionInput.style.opacity = '0.3';
      }

      if (askBtn) {
        askBtn.disabled = true;
        askBtn.style.pointerEvents = 'none';
        askBtn.style.opacity = '0.3';
      }

      if (clearQABtn) {
        clearQABtn.disabled = true;
        clearQABtn.style.pointerEvents = 'none';
        clearQABtn.style.opacity = '0.3';
      }

      if (!questionSection.querySelector('.question-lock-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'question-lock-overlay';
        overlay.innerHTML = `
          <div class="question-lock-content">
            <div class="question-lock-header">
              <span class="material-icons question-lock-icon">help_outline</span>
              <p class="question-lock-title">${window.languageManager.getMessage(
                'questionFeatureTitle'
              )}</p>
            </div>
            <p class="question-lock-description">
              ${window.languageManager.getMessage('questionFeatureDescription')}
            </p>
            <button class="question-upgrade-btn" id="upgradeFromQuestion">
              <span class="material-icons">workspace_premium</span>
              <span>${window.languageManager.getMessage(
                'upgradeToPremium'
              )}</span>
            </button>
            <p class="question-overlay-hint">${window.languageManager.getMessage(
              'overlayHint'
            )}</p>
          </div>
        `;

        questionSection.appendChild(overlay);

        const upgradeBtn = overlay.querySelector('#upgradeFromQuestion');
        if (upgradeBtn) {
          upgradeBtn.addEventListener('click', () => {
            chrome.tabs.create({
              url: 'https://summarygenie.com/premium',
            });
          });
        }
      }

      console.log('[SidePanel] 🔒 질문 섹션 잠금 (무료 사용자)');
    }
  }

  showLoginRequiredScreen() {
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        font-family: 'Roboto', sans-serif;
        height: 100vh;
      ">
        <div style="
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        ">
          <span class="material-icons" style="color: white; font-size: 48px;">lock</span>
        </div>
        
        <h2 style="
          color: #212121;
          margin-bottom: 12px;
          font-size: 20px;
          font-weight: 500;
        ">로그인이 필요합니다</h2>
        
        <p style="
          color: #757575;
          margin-bottom: 32px;
          line-height: 1.6;
          font-size: 14px;
        ">
          SummaryGenie를 사용하려면<br>
          먼저 로그인해주세요
        </p>
        
        <button id="loginBtn" style="
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 32px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        " onmouseover="this.style.background='#1976D2'" onmouseout="this.style.background='#2196F3'">
          <span class="material-icons">login</span>
          로그인하기
        </button>
        
        <button id="signupBtn" style="
          background: transparent;
          color: #2196F3;
          border: 2px solid #2196F3;
          border-radius: 8px;
          padding: 10px 32px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.background='#E3F2FD'" onmouseout="this.style.background='transparent'">
          계정이 없으신가요? 회원가입
        </button>
      </div>
    `;

    document.getElementById('loginBtn').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('auth.html'),
      });
    });

    document.getElementById('signupBtn').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('auth.html#signup'),
      });
    });
  }

  async checkAuthStatusDirect() {
    try {
      console.log('[Auth] 직접 storage에서 토큰 확인');

      const result = await chrome.storage.local.get('tokens');

      if (!result.tokens || !result.tokens.accessToken) {
        console.log('[Auth] 토큰 없음');
        return false;
      }

      const token = result.tokens.accessToken;
      const parts = token.split('.');

      if (parts.length !== 3) {
        console.warn('[Auth] 잘못된 토큰 형식');
        return false;
      }

      try {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        );
        const exp = payload.exp * 1000;
        const now = Date.now();

        if (exp <= now) {
          console.warn('[Auth] 토큰 만료됨');
          return false;
        }

        console.log('[Auth] 토큰 유효함 - 서버에서 사용자 정보 조회');

        const API_BASE_URL = 'http://localhost:3000';

        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();

            this.currentUser = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              isPremium: data.user.isPremium,
            };

            this.isPremium = data.user.isPremium;

            console.log('[Auth] 프리미엄 상태:', this.isPremium);
            return true;
          } else {
            console.warn('[Auth] 사용자 정보 조회 실패:', response.status);
          }
        } catch (apiError) {
          console.error('[Auth] API 호출 오류:', apiError);
        }

        console.log('[Auth] 폴백: 토큰에서 기본 정보 사용');
        this.currentUser = {
          id: payload.sub || payload.userId,
          email: payload.email,
          name: payload.name,
          isPremium: false,
        };

        this.isPremium = false;
        return true;
      } catch (decodeError) {
        console.error('[Auth] 토큰 디코딩 실패:', decodeError);
        return false;
      }
    } catch (error) {
      console.error('[Auth] 토큰 체크 오류:', error);
      return false;
    }
  }

  displayUserInfo() {
    if (!this.currentUser) return;

    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement && this.currentUser.email) {
      userEmailElement.textContent = this.currentUser.email;
    }

    const userNameElement = document.getElementById('userName');
    if (userNameElement && this.currentUser.name) {
      userNameElement.textContent = this.currentUser.name;
    }
  }

  setupSettingsChangeListener() {
    this.settingsUnsubscribe = window.settingsManager.onSettingsChange(
      (newSettings, oldSettings) => {
        console.log('[SidePanel] 설정 변경 감지');

        if (newSettings.language !== oldSettings.language) {
          window.languageManager.changeLanguage(newSettings.language).then(() => {
            this.updateUITexts();
            this.updateUsageDisplay();
            window.languageManager.applyLanguageFont();
            this.updateQuestionOverlayText();
          });
        }

        if (newSettings.theme !== oldSettings.theme) {
          window.settingsManager.applyTheme(newSettings.theme);
        }

        if (
          newSettings.useProxy !== oldSettings.useProxy ||
          newSettings.apiKey !== oldSettings.apiKey
        ) {
          this.updateUsageDisplay();
        }
      }
    );
  }

  setupRealtimeUsageUpdate() {
    console.log('[Usage Update] 실시간 사용량 업데이트 설정');

    this.storageChangeListener = (changes, areaName) => {
      if (areaName === 'local' && changes.usageData) {
        console.log(
          '[Usage Update] Storage에서 사용량 변경 감지:',
          changes.usageData.newValue
        );

        if (changes.usageData.newValue) {
          const usageData = changes.usageData.newValue;
          this.usage.daily = usageData.dailyUsed || 0;
          this.usage.limit = usageData.dailyLimit || 5;

          this.updateUsageDisplay();
          console.log('[Usage Update] 사용량 UI 업데이트 완료 (Storage 기반)');
        }
      }
    };
    chrome.storage.onChanged.addListener(this.storageChangeListener);

    this.visibilityChangeListener = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Usage Update] Side Panel이 다시 보임 - 사용량 조회');
        await this.checkUsage();
      }
    };
    document.addEventListener(
      'visibilitychange',
      this.visibilityChangeListener
    );

    this.focusListener = async () => {
      console.log('[Usage Update] Side Panel에 포커스 - 사용량 조회');
      await this.checkUsage();
    };
    window.addEventListener('focus', this.focusListener);

    this.usagePollingInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Usage Update] 주기적 폴링 - 사용량 조회');
        await this.checkUsage();
      }
    }, 30000);

    console.log('[Usage Update] 실시간 업데이트 리스너 등록 완료');
  }

  updateUITexts() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (summarizeBtn) {
      const buttonText = summarizeBtn.querySelector(
        'span[data-i18n="summarizeButton"]'
      );
      if (buttonText) {
        buttonText.textContent =
          window.languageManager.getMessage('summarizeButton');
      }
    }

    this.updateUsageDisplay();

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
      const analyzingMessages = [
        '현재 페이지를 분석 중...',
        'Analyzing current page...',
        '現在のページを分析中...',
        '正在分析当前页面...',
      ];

      if (analyzingMessages.includes(pageTitle.textContent)) {
        pageTitle.textContent =
          window.languageManager.getMessage('analyzingPage');
      }
    }

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n');
      const message = window.languageManager.getMessage(key);

      if (message && message !== key) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = message;
        } else {
          element.textContent = message;
        }
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      const key = element.getAttribute('data-i18n-title');
      const message = window.languageManager.getMessage(key);

      if (message && message !== key) {
        element.title = message;
      }
    });

    this.updateQuestionOverlayText();
  }

  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url) {
        throw new Error(window.languageManager.getMessage('errorExtractContent'));
      }

      this.currentTabId = tab.id;

      this.currentPageInfo = {
        title: tab.title || window.languageManager.getMessage('noTitle'),
        url: tab.url,
        domain: new URL(tab.url).hostname,
      };

      window.uiManager.displayPageInfo(this.currentPageInfo);

      if (window.isRestrictedPage(tab.url)) {
        window.uiManager.disablePage();
        this.showToast('errorRestrictedPage');
      }
    } catch (error) {
      console.error('[SidePanel] 탭 정보 로드 오류:', error);
      window.errorHandler.handle(error, 'load-current-tab');
      this.showError('errorExtractContent');
    }
  }

  /**
   * ✨ v8.0 - 콘텐츠 추출 메서드 (타임아웃 180초 + Keep-Alive)
   */
  async extractPageContent() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url) {
        throw new Error(window.languageManager.getMessage('errorExtractContent'));
      }

      console.log('[SidePanel] 현재 탭 URL:', tab.url);

  if (this.isPDFUrl(tab.url)) {
  console.log('[SidePanel] PDF 페이지 감지 - Offscreen Document 통한 추출 시작');

  try {
    // ✨ Keep-Alive 시작
    this.startKeepAlive();

    // ✨ 진행 상황 초기화
    this.updatePDFProgress({
      stage: 'download',
      progress: 0,
      message: 'PDF 파일을 가져오는 중...'
    });

    console.log('[SidePanel] 🔵 Service Worker 깨우는 중...');
    await this.wakeUpServiceWorker();
    console.log('[SidePanel] 🔵 Service Worker 활성화 완료');

    console.log('[SidePanel] 🔵 PDF 추출 메시지 전송');

    // ✨ 1. ACK 응답만 받음 (즉시 반환)
    const ackResponse = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ACK 응답 타임아웃 (10초)'));
      }, 10000);

      chrome.runtime.sendMessage(
        {
          action: 'extractPDF',
          url: tab.url
        },
        (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            console.error('[SidePanel] 🔴 런타임 에러:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (!response) {
            reject(new Error('응답이 비어있습니다'));
            return;
          }
          
          resolve(response);
        }
      );
    });

    console.log('[SidePanel] ✅ ACK 응답 받음:', ackResponse);

    if (!ackResponse.success) {
      throw new Error(ackResponse.error || 'PDF 추출 요청 실패');
    }

    // ✨ 2. 실제 결과는 별도 메시지로 받음 (180초 대기)
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopKeepAlive();
        reject(new Error('PDF 추출 타임아웃 (180초)'));
      }, 180000);

      // ✨ 완료 메시지 리스너 등록
      const completionListener = (message, sender, sendResponse) => {
        if (message.action === 'pdfExtractionComplete') {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(completionListener);
          
          console.log('[SidePanel] ✅ PDF 추출 완료 메시지 받음');
          resolve(message.result);
        }
      };

      chrome.runtime.onMessage.addListener(completionListener);
    });

    // ✨ Keep-Alive 중지
    this.stopKeepAlive();

    console.log('[SidePanel] PDF 추출 결과:', result);

    if (!result || !result.success) {
      throw new Error(result?.error || 'PDF 추출 실패');
    }

    if (!result.text || result.text.length < 50) {
      throw new Error('PDF에서 텍스트를 찾을 수 없습니다. 이미지 기반 PDF는 지원하지 않습니다.');
    }

    // ✨ 진행 상황 완료
    this.updatePDFProgress({
      stage: 'complete',
      progress: 100,
      message: '추출이 완료되었습니다!'
    });

    const contentValidation = window.validateInput(result.text, {
      type: 'string',
      required: true,
      minLength: 50,
      maxLength: 100000,
    });

    if (!contentValidation.valid) {
      throw new Error(`PDF 콘텐츠 검증 실패: ${contentValidation.error}`);
    }

    this.currentPageContent = contentValidation.sanitized;

    if (result.metadata) {
      this.currentPageInfo.isPDF = true;
      this.currentPageInfo.pdfPages = result.metadata.extractedPages;
      this.currentPageInfo.pdfTotalPages = result.metadata.totalPages;
    }

    console.log('[SidePanel] ✅ PDF 콘텐츠 추출 완료:', 
      this.currentPageContent.length, '문자');

    return this.currentPageContent;

  } catch (pdfError) {
    console.error('[SidePanel] PDF 추출 실패:', pdfError);

    // ✨ Keep-Alive 중지
    this.stopKeepAlive();

    // ✨ 진행 상황 에러 표시
    this.updatePDFProgress({
      stage: 'error',
      progress: 0,
      message: pdfError.message
    });

    let errorMessage = 'PDF를 추출할 수 없습니다.';

    if (pdfError.message.includes('Chrome 114+')) {
      errorMessage = 'PDF 추출 기능은 Chrome 114 이상 버전에서만 사용할 수 있습니다.';
    } else if (pdfError.message.includes('텍스트를 찾을 수 없습니다')) {
      errorMessage = pdfError.message;
    } else if (pdfError.message.includes('접근')) {
      errorMessage = 'PDF 파일에 접근할 수 없습니다.';
    } else if (pdfError.message.includes('타임아웃') || pdfError.message.includes('시간')) {
      errorMessage = 'PDF 추출 시간이 초과되었습니다. 파일이 너무 크거나 복잡할 수 있습니다.';
    } else if (pdfError.message.includes('응답이 비어있습니다') || pdfError.message.includes('ACK')) {
      errorMessage = 'Service Worker가 응답하지 않습니다. 확장 프로그램을 새로고침해주세요.';
    } else if (pdfError.message.includes('Service Worker')) {
      errorMessage = 'Service Worker 통신 오류가 발생했습니다. 확장 프로그램을 새로고침해주세요.';
    }

    throw new Error(errorMessage);
  }
}

      // 일반 웹페이지 처리
      if (window.isRestrictedPage && window.isRestrictedPage(tab.url)) {
        throw new Error(window.languageManager.getMessage('errorRestrictedPage'));
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });

        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content-styles.css'],
        });

        console.log('[SidePanel] Content script 주입 완료');
      } catch (injectError) {
        console.log('[SidePanel] Content script 주입 실패 (이미 주입되었을 수 있음):', injectError.message);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'extractContent',
        });

        if (response && response.content) {
          const contentValidation = window.validateInput(response.content, {
            type: 'string',
            required: true,
            minLength: 50,
            maxLength: 50000,
          });

          if (!contentValidation.valid) {
            throw new Error(`콘텐츠 검증 실패: ${contentValidation.error}`);
          }

          this.currentPageContent = contentValidation.sanitized;
          console.log('[SidePanel] 콘텐츠 추출 및 검증 완료:', this.currentPageContent.length, '문자');
          return this.currentPageContent;
        }
      } catch (messageError) {
        console.log('[SidePanel] Content script 통신 오류 - 백업 방법 사용:', messageError.message);
      }

      console.log('[SidePanel] 백업 방법으로 콘텐츠 추출 시도');

      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const unwantedElements = document.querySelectorAll('script, style, noscript, iframe');
          unwantedElements.forEach((el) => el.remove());

          const contentSelectors = [
            'article',
            'main',
            '[role="main"]',
            '.content',
            '#content',
            '.post-content',
            '.entry-content',
          ];

          for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.trim().length > 100) {
              return element.innerText.trim().substring(0, 10000);
            }
          }

          return document.body.innerText.trim().substring(0, 10000);
        },
      });

      if (result && result.result) {
        const contentValidation = window.validateInput(result.result, {
          type: 'string',
          required: true,
          minLength: 50,
          maxLength: 50000,
        });

        if (!contentValidation.valid) {
          throw new Error(`콘텐츠 검증 실패: ${contentValidation.error}`);
        }

        this.currentPageContent = contentValidation.sanitized;
        console.log('[SidePanel] 백업 방법으로 콘텐츠 추출 및 검증 완료:', this.currentPageContent.length, '문자');
        return this.currentPageContent;
      }

      throw new Error(window.languageManager.getMessage('errorExtractContent'));

    } catch (error) {
      console.error('[SidePanel] 콘텐츠 추출 오류:', error);
      window.errorHandler.handle(error, 'extract-page-content');
      
      // ✨ Keep-Alive 중지 (에러 시에도)
      this.stopKeepAlive();
      
      throw error;
    }
  }

  /**
   * ✨ Service Worker Keep-Alive 시작 (새로 추가)
   */
  startKeepAlive() {
    console.log('[Keep-Alive] 시작 - 15초 주기');
    
    // 기존 인터벌이 있으면 제거
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // 15초마다 ping 전송
    this.keepAliveInterval = setInterval(async () => {
      try {
        await chrome.runtime.sendMessage({ action: 'ping' });
        console.log('[Keep-Alive] 🔵 Ping 전송 성공');
      } catch (error) {
        console.warn('[Keep-Alive] ⚠️ Ping 실패:', error.message);
      }
    }, 15000);
  }

  /**
   * ✨ Service Worker Keep-Alive 중지 (새로 추가)
   */
  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('[Keep-Alive] 중지');
    }
  }

  /**
   * ✅ Service Worker 깨우기 (타임아웃 3초 → 5초로 증가)
   */
  async wakeUpServiceWorker() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    const PING_TIMEOUT = 5000; // ✨ 3초 → 5초
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[SidePanel] Service Worker 깨우기 시도 ${attempt}/${MAX_RETRIES}`);
        
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Ping 타임아웃'));
          }, PING_TIMEOUT);

          chrome.runtime.sendMessage(
            { action: 'ping' },
            (response) => {
              clearTimeout(timeout);
              
              if (chrome.runtime.lastError) {
                console.log(`[SidePanel] 시도 ${attempt} - 런타임 에러:`, chrome.runtime.lastError.message);
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              
              resolve(response);
            }
          );
        });
        
        if (response && response.success) {
          console.log(`[SidePanel] ✅ Service Worker 활성화 성공 (시도 ${attempt}/${MAX_RETRIES})`);
          return;
        }
        
        console.log(`[SidePanel] 시도 ${attempt} - 응답 없음, 재시도...`);
        
      } catch (error) {
        console.warn(`[SidePanel] 시도 ${attempt}/${MAX_RETRIES} 실패:`, error.message);
        
        if (attempt < MAX_RETRIES) {
          console.log(`[SidePanel] ${RETRY_DELAY}ms 대기 후 재시도...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        } else {
          console.warn('[SidePanel] ⚠️ Service Worker 응답 없음 - 진행 시도');
          return;
        }
      }
    }
    
    console.warn('[SidePanel] ⚠️ 모든 재시도 실패 - PDF 추출 진행');
  }

  /**
   * PDF URL 확인
   */
  isPDFUrl(url) {
    if (!url) return false;

    const urlLower = url.toLowerCase();

    if (urlLower.endsWith('.pdf') ||
        urlLower.includes('.pdf?') ||
        urlLower.includes('.pdf#')) {
      return true;
    }

    if (urlLower.startsWith('chrome-extension://') && urlLower.includes('.pdf')) {
      return true;
    }

    if (urlLower.startsWith('file://') && urlLower.includes('.pdf')) {
      return true;
    }

    return false;
  }

  /**
   * ✨ v6.0 - 콘텐츠 길이 기반 최적 요약 길이 자동 판단
   */
  determineOptimalLength(contentLength) {
    if (contentLength < 1000) {
      console.log(
        '[SidePanel] 자동 길이 선택: short (콘텐츠 길이:',
        contentLength,
        ')'
      );
      return 'short';
    } else if (contentLength < 3000) {
      console.log(
        '[SidePanel] 자동 길이 선택: medium (콘텐츠 길이:',
        contentLength,
        ')'
      );
      return 'medium';
    } else if (contentLength < 7000) {
      console.log(
        '[SidePanel] 자동 길이 선택: detailed (콘텐츠 길이:',
        contentLength,
        ')'
      );
      return 'detailed';
    } else if (contentLength < 15000) {
      console.log(
        '[SidePanel] 자동 길이 선택: very_detailed (콘텐츠 길이:',
        contentLength,
        ')'
      );
      return 'very_detailed';
    } else {
      console.log(
        '[SidePanel] 자동 길이 선택: ultra_detailed (콘텐츠 길이:',
        contentLength,
        ')'
      );
      return 'ultra_detailed';
    }
  }

  /**
   * ✨ v6.0 - 콘텐츠 길이 기반 max_tokens 동적 계산
   */
  calculateMaxTokens(contentLength) {
    if (contentLength < 1000) {
      return 500;
    } else if (contentLength < 3000) {
      return 1000;
    } else if (contentLength < 7000) {
      return 1500;
    } else if (contentLength < 15000) {
      return 2000;
    } else {
      return 2500;
    }
  }

  async summarizePage() {
    try {
      const canUse = await window.usageManager.canSummarize();

      if (!canUse.allowed) {
        if (canUse.reason === 'DAILY_LIMIT_EXCEEDED') {
          this.showUpgradeModal('summary');
          return;
        }
        throw new Error(window.languageManager.getMessage('errorDailyLimit'));
      }

      if (!window.settingsManager.isApiReady()) {
        this.showToast('errorApiNotConfigured');
        return;
      }

      window.uiManager.showLoading(true);
      window.uiManager.resetSections();

      const content = await this.extractPageContent();

      if (!content || content.length < 100) {
        throw new Error(window.languageManager.getMessage('errorExtractContent'));
      }

      console.log('[SidePanel] 요약 시작 - 콘텐츠 길이:', content.length);

      const optimalLength = this.determineOptimalLength(content.length);
      const maxTokens = this.calculateMaxTokens(content.length);

      console.log('[SidePanel] 자동 설정:', {
        length: optimalLength,
        maxTokens: maxTokens,
      });

      this.currentSummary = await window.apiService.summarizeText(
        content,
        optimalLength,
        this.currentPageInfo,
        maxTokens
      );
      console.log(
        '[SidePanel] 요약 완료 (길이:',
        this.currentSummary.length,
        '문자)'
      );

      window.uiManager.displaySummary(this.currentSummary);

      const historyId = await this.saveSummaryHistory();
      this.currentHistoryId = historyId;

      await window.qaManager.initialize(historyId, content);

      await this.checkPremiumAndToggleQuestion();

      await this.updateUsage();

      this.showToast('toastSaved');
    } catch (error) {
      console.error('[SidePanel] 요약 오류:', error);
      window.errorHandler.handle(error, 'summarize-page');
      this.showError('errorSummarize');
    } finally {
      window.uiManager.showLoading(false);
    }
  }

  async askQuestion() {
    const questionInput = window.uiManager.getElement('questionInput');
    const questionText = questionInput.value.trim();

    const validation = window.validateInput(questionText, {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 5000,
      pattern: /^[^<>]*$/,
    });

    if (!validation.valid) {
      console.warn('[SidePanel] 질문 검증 실패:', validation.error);
      this.showToast('enterQuestion');
      return;
    }

    const question = validation.sanitized;

    const canUse = await window.usageManager.canAskQuestion();

    if (!canUse.allowed) {
      if (canUse.reason === 'QUESTION_LIMIT_EXCEEDED') {
        this.showUpgradeModal('question');
        return;
      }
      throw new Error(window.languageManager.getMessage('errorDailyLimit'));
    }

    if (!window.settingsManager.isApiReady()) {
      this.showToast('errorApiNotConfigured');
      return;
    }

    try {
      console.log('[SidePanel] 질문 처리 중 - 길이:', question.length);

      await window.qaManager.processQuestion(question);

      await this.updateUsage();

      questionInput.value = '';

      console.log('[SidePanel] 질문 처리 완료');
    } catch (error) {
      console.error('[SidePanel] 질문 처리 오류:', error);
      window.errorHandler.handle(error, 'ask-question');
      this.showError(error.message || 'errorAnswer');
    }
  }

  copySummary() {
    if (!this.currentSummary) {
      this.showToast('nothingToCopy');
      return;
    }

    navigator.clipboard
      .writeText(this.currentSummary)
      .then(() => {
        console.log('[SidePanel] 요약 복사 완료');
        this.showToast('toastCopied');
        window.uiManager.animateCopyButton();
      })
      .catch((err) => {
        console.error('[SidePanel] 복사 실패:', err);
        window.errorHandler.handle(err, 'copy-summary');
        this.showToast('copyFailed');
      });
  }

  async saveSummaryHistory() {
    const settings = window.settingsManager.getSettings();

    if (!settings.saveHistory) {
      console.log('[SidePanel] 히스토리 저장 비활성화됨');
      return null;
    }

    try {
      const historyItem = await window.historyManager.addHistory({
        title: this.currentPageInfo.title,
        url: this.currentPageInfo.url,
        summary: this.currentSummary,
        qaHistory: [],
        metadata: {
          domain: this.currentPageInfo.domain,
          language: window.languageManager.getCurrentLanguage(),
          userId: this.currentUser?.id,
        },
      });

      await window.storageManager.updateUsageStatistics();

      console.log(
        '[SidePanel] 히스토리 저장 완료:',
        historyItem.id.substring(0, 10) + '...'
      );

      return historyItem.id;
    } catch (error) {
      console.error('[SidePanel] 히스토리 저장 오류:', error);
      window.errorHandler.handle(error, 'save-history');
      return null;
    }
  }

  async checkUsage() {
    try {
      console.log('[Usage] getUsageStatus 호출 시작...');
      const usageStatus = await window.usageManager.getUsageStatus();

      console.log('[Usage] getUsageStatus 응답:', usageStatus);

      this.usage.daily = usageStatus.isPremium ? 0 : usageStatus.dailyUsed;
      this.usage.limit = usageStatus.isPremium
        ? Infinity
        : usageStatus.dailyLimit;

      this.updateUsageDisplay();

      console.log('[SidePanel] 사용량 조회 완료:', {
        isPremium: usageStatus.isPremium,
        used: this.usage.daily,
        limit: this.usage.limit,
      });
    } catch (error) {
      console.error('[SidePanel] 사용량 확인 오류:', error);
      window.errorHandler.handle(error, 'check-usage');

      this.usage.daily = 0;
      this.usage.limit = 5;
      this.updateUsageDisplay();
    }
  }

  async updateUsage() {
    try {
      await this.checkUsage();
    } catch (error) {
      console.error('[SidePanel] 사용량 업데이트 오류:', error);
      window.errorHandler.handle(error, 'update-usage');
    }
  }

  updateUsageDisplay() {
    const usageText = document.getElementById('usageText');
    if (!usageText) {
      console.warn('[Usage Display] usageText 요소를 찾을 수 없습니다');
      return;
    }

    const isPremium = window.usageManager.isPremium();
    console.log('[Usage Display] 프리미엄 상태:', isPremium);

    if (isPremium) {
      const unlimitedMsg =
        window.languageManager.getMessage('unlimited') || '무제한';
      usageText.textContent = `✨ ${unlimitedMsg}`;
      usageText.style.color = '#4CAF50';
      console.log('[Usage Display] 프리미엄 사용자 - 표시:', usageText.textContent);
    } else {
      const usedCount = this.usage.daily;
      const totalLimit = this.usage.limit;

      console.log('[Usage Display] 무료 사용자 - 사용량:', {
        usedCount,
        totalLimit,
      });

      const currentLang = window.languageManager.getCurrentLanguage();
      let message;

      switch (currentLang) {
        case 'en':
          message = `Today: ${usedCount}/${totalLimit}`;
          break;
        case 'ja':
          message = `今日: ${usedCount}/${totalLimit}`;
          break;
        case 'zh':
          message = `今日: ${usedCount}/${totalLimit}`;
          break;
        case 'ko':
        default:
          message = `오늘 ${usedCount}회/${totalLimit}회`;
          break;
      }

      console.log('[Usage Display] 최종 메시지:', message);

      usageText.textContent = message;
      usageText.style.color = '';
    }

    const summarizeBtn = document.getElementById('summarizeBtn');
    if (!isPremium && this.usage.daily >= this.usage.limit) {
      if (summarizeBtn) {
        summarizeBtn.disabled = true;
        const buttonText = summarizeBtn.querySelector('span:last-child');
        if (buttonText) {
          buttonText.textContent =
            window.languageManager.getMessage('dailyLimitExceeded');
        }
        console.log('[Usage Display] 버튼 비활성화 - 사용 한도 초과');
      }
    } else {
      if (summarizeBtn) {
        summarizeBtn.disabled = false;
        const buttonText = summarizeBtn.querySelector('span:last-child');
        if (buttonText) {
          buttonText.textContent =
            window.languageManager.getMessage('summarizeButton');
        }
        console.log('[Usage Display] 버튼 활성화');
      }
    }
  }

  showToast(messageKey) {
    const message = window.languageManager.getMessage(messageKey);
    if (message && message !== messageKey) {
      window.uiManager.showToast(message);
    } else {
      window.uiManager.showToast(messageKey);
    }
  }

  showError(messageKey) {
    const message = window.languageManager.getMessage(messageKey);
    if (message && message !== messageKey) {
      window.uiManager.showError(message);
    } else {
      window.uiManager.showError(messageKey);
    }
  }

  showUpgradeModal(type) {
    const existingModal = document.getElementById('upgradeModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'upgradeModal';
    modal.className = 'modal';

    const typeText =
      type === 'summary'
        ? window.languageManager.getMessage('summaryFeature') || '요약'
        : window.languageManager.getMessage('questionFeature') || '질문';

    const remaining = window.usageManager.getRemainingCount(
      type === 'summary'
        ? window.USAGE_TYPE.SUMMARY
        : window.USAGE_TYPE.QUESTION
    );

    const resetTime = window.usageManager.getResetTime();
    const resetDate = resetTime ? new Date(resetTime) : new Date();
    const resetTimeText = resetDate.toLocaleTimeString(
      window.languageManager.getCurrentLanguage(),
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    modal.innerHTML = `
      <div class="modal-content upgrade-modal">
        <div class="modal-header">
          <h2>${
            window.languageManager.getMessage('upgradeToPremium') ||
            '프리미엄 업그레이드'
          }</h2>
          <button class="icon-btn close-modal">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="upgrade-icon">
            <span class="material-icons">lock</span>
          </div>
          <h3>${
            window.languageManager.getMessage('dailyLimitReached') ||
            '오늘의 무료 사용량을 모두 소진했습니다'
          }</h3>
          <p class="upgrade-description">
            ${typeText} 기능을 계속 사용하려면 프리미엄으로 업그레이드하세요.
          </p>
          <div class="usage-info">
            <div class="info-row">
              <span class="info-label">${
                window.languageManager.getMessage('remainingToday') ||
                '오늘 남은 횟수'
              }:</span>
              <span class="info-value">${remaining}회</span>
            </div>
            <div class="info-row">
              <span class="info-label">${
                window.languageManager.getMessage('resetTime') || '초기화 시간'
              }:</span>
              <span class="info-value">${resetTimeText}</span>
            </div>
          </div>
          <div class="premium-benefits">
            <h4>✨ ${
              window.languageManager.getMessage('premiumBenefits') ||
              '프리미엄 혜택'
            }</h4>
            <ul>
              <li>
                <span class="material-icons">check_circle</span>
                ${
                  window.languageManager.getMessage('unlimitedSummaries') ||
                  '무제한 요약'
                }
              </li>
              <li>
                <span class="material-icons">check_circle</span>
                ${
                  window.languageManager.getMessage('unlimitedQuestions') ||
                  '무제한 질문'
                }
              </li>
              <li>
                <span class="material-icons">check_circle</span>
                ${
                  window.languageManager.getMessage('prioritySupport') ||
                  '우선 지원'
                }
              </li>
              <li>
                <span class="material-icons">check_circle</span>
                ${
                  window.languageManager.getMessage('advancedFeatures') ||
                  '고급 기능'
                }
              </li>
            </ul>
          </div>
          <div class="upgrade-price">
            <span class="price">$4.99</span>
            <span class="period">/ ${
              window.languageManager.getMessage('month') || '월'
            }</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="secondary-btn close-modal">
            ${window.languageManager.getMessage('maybeLater') || '나중에'}
          </button>
          <button class="primary-btn upgrade-btn">
            <span class="material-icons">workspace_premium</span>
            ${
              window.languageManager.getMessage('upgradeToPremium') ||
              '프리미엄 업그레이드'
            }
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.remove();
      });
    });

    const upgradeBtn = modal.querySelector('.upgrade-btn');
    upgradeBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://summarygenie.com/premium',
      });
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  setupEventListeners() {
    const elements = window.uiManager.elements;

    if (elements.copyBtn) {
      elements.copyBtn.addEventListener('click', () => this.copySummary());
    }

    if (elements.askBtn) {
      elements.askBtn.addEventListener('click', () => this.askQuestion());
    }

    if (elements.settingsBtn) {
      elements.settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

    const closePanelBtn = document.getElementById('closePanelBtn');
    if (closePanelBtn) {
      closePanelBtn.addEventListener('click', () => {
        window.close();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.close();
      }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    if (elements.questionInput) {
      elements.questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.askQuestion();
        }
      });
    }
  }

  async logout() {
    try {
      console.log('[Auth] 로그아웃 시작');

      await chrome.storage.local.remove('tokens');

      chrome.tabs.create({
        url: chrome.runtime.getURL('auth.html'),
      });

      window.close();
    } catch (error) {
      console.error('[Auth] 로그아웃 오류:', error);
      window.errorHandler.handle(error, 'logout');
      this.showToast('logoutFailed');
    }
  }

  cleanup() {
    if (this.settingsUnsubscribe) {
      this.settingsUnsubscribe();
      this.settingsUnsubscribe = null;
    }

    if (this.storageChangeListener) {
      chrome.storage.onChanged.removeListener(this.storageChangeListener);
      this.storageChangeListener = null;
      console.log('[Usage Update] Storage 리스너 제거');
    }

    if (this.visibilityChangeListener) {
      document.removeEventListener(
        'visibilitychange',
        this.visibilityChangeListener
      );
      this.visibilityChangeListener = null;
      console.log('[Usage Update] Visibility 리스너 제거');
    }

    if (this.focusListener) {
      window.removeEventListener('focus', this.focusListener);
      this.focusListener = null;
      console.log('[Usage Update] Focus 리스너 제거');
    }

    if (this.usagePollingInterval) {
      clearInterval(this.usagePollingInterval);
      this.usagePollingInterval = null;
      console.log('[Usage Update] 폴링 인터벌 제거');
    }

    // ✨ Keep-Alive 정리
    this.stopKeepAlive();

    // ✨ 진행 상황 리스너 제거
    if (this.progressListener) {
      chrome.runtime.onMessage.removeListener(this.progressListener);
      this.progressListener = null;
      console.log('[SidePanel] 진행 상황 리스너 제거');
    }

    this.initialized = false;
    console.log('[SidePanel] cleanup 완료');
  }
}

const sidePanelApp = new SidePanelController();

document.addEventListener('DOMContentLoaded', () => {
  sidePanelApp.initialize().catch((error) => {
    console.error('[SidePanel] 앱 초기화 실패:', error);
    window.errorHandler.handle(error, 'sidepanel-initialization');
  });
});

window.addEventListener('beforeunload', () => {
  sidePanelApp.cleanup();
});