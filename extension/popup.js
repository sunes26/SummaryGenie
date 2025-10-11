/**
 * SummaryGenie Popup Main Script
 * Background Service Worker 없이 작동하는 버전 (전역 방식)
 * 
 * @version 3.5.0
 * 
 * 📝 v3.5.0 변경사항:
 * - 질문 섹션 프리미엄 오버레이 추가
 * - updateQuestionOverlayText() 메서드 추가
 * - checkPremiumAndToggleQuestion() 메서드 추가
 * - toggleQuestionSection() 메서드 추가
 * 
 * 📝 v3.4.0 변경사항:
 * - 실시간 사용량 업데이트 기능 추가
 *   1. Storage 변경 감지 (다른 탭에서 사용 시)
 *   2. Visibility 변경 감지 (popup 다시 열 때)
 *   3. Focus 이벤트 (popup에 포커스 시)
 *   4. 주기적 폴링 (30초마다)
 */

class AppController {
  constructor() {
    this.currentPageContent = '';
    this.currentPageInfo = {
      title: '',
      url: '',
      domain: ''
    };
    this.currentSummary = '';
    this.currentHistoryId = null;
    this.currentUser = null;
    this.usage = {
      daily: 0,
      limit: 5
    };
    this.settingsUnsubscribe = null;
    this.initialized = false;
    
    // 실시간 사용량 업데이트 리스너
    this.storageChangeListener = null;
    this.visibilityChangeListener = null;
    this.focusListener = null;
    this.usagePollingInterval = null;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      console.log('[Security] Popup 초기화 시작');
      
      // Background 없이 직접 토큰 체크
      const isAuthenticated = await this.checkAuthStatusDirect();
      
      if (!isAuthenticated) {
        console.log('[Auth] 로그인 필요 - 안내 화면 표시');
        this.showLoginRequiredScreen();
        return;
      }
      
      await window.languageManager.initialize();
      await window.settingsManager.initialize();
      await window.historyManager.initialize();
      
      this.updateUITexts();
      await this.loadCurrentTab();
      await window.qaManager.initialize();
      await this.checkUsage();
      
      // ✅ 질문 섹션 프리미엄 확인 (초기화 시)
      await this.checkPremiumAndToggleQuestion();
      
      this.setupEventListeners();
      this.setupSettingsChangeListener();
      this.setupRealtimeUsageUpdate(); // ✅ 실시간 사용량 업데이트 설정
      window.languageManager.applyLanguageFont();
      
      this.displayUserInfo();
      
      this.initialized = true;
      console.log('[Security] Popup 초기화 완료');
      
    } catch (error) {
      console.error('[Security] 초기화 오류:', error);
      window.errorHandler.handle(error, 'popup-initialization');
      this.showError('initializationError');
    }
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
      // 기존 오버레이가 있으면 텍스트만 업데이트
      const lockTitle = overlay.querySelector('.question-lock-title');
      const lockDescription = overlay.querySelector('.question-lock-description');
      const upgradeBtn = overlay.querySelector('#upgradeFromQuestion span:last-child');
      const overlayHint = overlay.querySelector('.question-overlay-hint');
      
      if (lockTitle) {
        lockTitle.textContent = window.languageManager.getMessage('questionFeatureTitle');
      }
      
      if (lockDescription) {
        lockDescription.innerHTML = window.languageManager.getMessage('questionFeatureDescription');
      }
      
      if (upgradeBtn) {
        upgradeBtn.textContent = window.languageManager.getMessage('upgradeToPremium');
      }
      
      if (overlayHint) {
        overlayHint.textContent = window.languageManager.getMessage('overlayHint');
      }
      
      console.log('[Popup] 질문 섹션 오버레이 텍스트 업데이트 완료');
    }
  }

  /**
   * ✅ 프리미엄 상태 확인 및 질문 섹션 제어
   */
  async checkPremiumAndToggleQuestion() {
    try {
      console.log('[Popup] 질문 섹션 - 프리미엄 상태 확인 중...');
      
      let isPremium = false;
      
      // 방법 1: usageManager 사용 (서버 기반, 가장 정확)
      if (window.usageManager) {
        try {
          const usageStatus = await window.usageManager.getUsageStatus();
          isPremium = usageStatus.isPremium === true;
          console.log('[Popup] usageManager 기반 프리미엄 상태:', isPremium);
        } catch (usageError) {
          console.warn('[Popup] usageManager 조회 실패, tokenManager로 대체');
        }
      }
      
      // 방법 2: tokenManager 사용 (백업)
      if (!isPremium && window.tokenManager) {
        try {
          const token = await window.tokenManager.getAccessToken();
          
          if (token) {
            const decoded = window.tokenManager.decodeToken(token);
            isPremium = decoded?.isPremium === true;
            console.log('[Popup] tokenManager 기반 프리미엄 상태:', isPremium);
          }
        } catch (tokenError) {
          console.warn('[Popup] tokenManager 조회 실패');
        }
      }
      
      // 질문 섹션 제어
      this.toggleQuestionSection(isPremium);
      
    } catch (error) {
      console.error('[Popup] 질문 섹션 프리미엄 확인 오류:', error);
      window.errorHandler.handle(error, 'check-premium-status-question');
      
      // 에러 시 안전하게 잠금 표시
      this.toggleQuestionSection(false);
    }
  }

  /**
   * ✅ 질문 섹션 잠금/해제 (항상 오버레이)
   * @param {boolean} isPremium - 프리미엄 사용자 여부
   */
  toggleQuestionSection(isPremium) {
    const questionSection = document.getElementById('questionSection');
    
    if (!questionSection) {
      console.warn('[Popup] 질문 섹션을 찾을 수 없습니다');
      return;
    }
    
    if (isPremium) {
      // ✅ 프리미엄: 정상 표시
      questionSection.style.position = '';
      questionSection.style.minHeight = '';
      questionSection.classList.remove('locked');
      
      // 기존 오버레이 제거
      const existingOverlay = questionSection.querySelector('.question-lock-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      
      // 입력창 및 버튼 활성화
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
      
      console.log('[Popup] ✅ 질문 섹션 활성화 (프리미엄 사용자)');
      
    } else {
      // ❌ 무료: 잠금 오버레이 표시
      questionSection.style.position = 'relative';
      questionSection.style.minHeight = '180px';
      questionSection.classList.add('locked');
      
      // 입력창 및 버튼 비활성화
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
      
      // 오버레이가 이미 있으면 추가하지 않음
      if (!questionSection.querySelector('.question-lock-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'question-lock-overlay';
        overlay.innerHTML = `
          <div class="question-lock-content">
            <div class="question-lock-header">
              <span class="material-icons question-lock-icon">help_outline</span>
              <p class="question-lock-title">${window.languageManager.getMessage('questionFeatureTitle')}</p>
            </div>
            <p class="question-lock-description">
              ${window.languageManager.getMessage('questionFeatureDescription')}
            </p>
            <button class="question-upgrade-btn" id="upgradeFromQuestion">
              <span class="material-icons">workspace_premium</span>
              <span>${window.languageManager.getMessage('upgradeToPremium')}</span>
            </button>
            <p class="question-overlay-hint">${window.languageManager.getMessage('overlayHint')}</p>
          </div>
        `;
        
        questionSection.appendChild(overlay);
        
        // 업그레이드 버튼 이벤트
        const upgradeBtn = overlay.querySelector('#upgradeFromQuestion');
        if (upgradeBtn) {
          upgradeBtn.addEventListener('click', () => {
            chrome.tabs.create({ 
              url: 'https://summarygenie.com/premium' 
            });
          });
        }
      }
      
      console.log('[Popup] 🔒 질문 섹션 잠금 (무료 사용자)');
    }
  }

  /**
   * 로그인 필요 안내 화면 표시
   */
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
        url: chrome.runtime.getURL('auth.html')
      });
      window.close();
    });

    document.getElementById('signupBtn').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('auth.html#signup')
      });
      window.close();
    });
  }

  /**
   * Background 없이 직접 토큰 체크
   */
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
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const exp = payload.exp * 1000;
        const now = Date.now();
        
        if (exp <= now) {
          console.warn('[Auth] 토큰 만료됨');
          return false;
        }
        
        console.log('[Auth] 토큰 유효함');
        this.currentUser = {
          id: payload.sub || payload.userId,
          email: payload.email,
          name: payload.name
        };
        
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
    this.settingsUnsubscribe = window.settingsManager.onSettingsChange((newSettings, oldSettings) => {
      console.log('[Security] 설정 변경 감지');
      
      if (newSettings.language !== oldSettings.language) {
        window.languageManager.changeLanguage(newSettings.language).then(() => {
          this.updateUITexts();
          this.updateUsageDisplay();
          window.languageManager.applyLanguageFont();
          
          // ✅ 질문 섹션 오버레이 텍스트 즉시 업데이트
          this.updateQuestionOverlayText();
        });
      }
      
      if (newSettings.theme !== oldSettings.theme) {
        window.settingsManager.applyTheme(newSettings.theme);
      }
      
      if (newSettings.useProxy !== oldSettings.useProxy ||
          newSettings.apiKey !== oldSettings.apiKey) {
        this.updateUsageDisplay();
      }
    });
  }

  /**
   * 실시간 사용량 업데이트 설정
   * 
   * 1. Storage 변경 감지 - usageData가 변경되면 즉시 UI 업데이트
   * 2. Visibility 변경 감지 - popup이 다시 보일 때 서버에서 최신 사용량 조회
   * 3. Focus 이벤트 - popup에 포커스가 올 때 최신 사용량 조회
   * 4. 주기적 폴링 - 30초마다 사용량 조회
   */
  setupRealtimeUsageUpdate() {
    console.log('[Usage Update] 실시간 사용량 업데이트 설정');
    
    // 1️⃣ Storage 변경 감지 (다른 탭에서 사용량 변경 시)
    this.storageChangeListener = (changes, areaName) => {
      if (areaName === 'local' && changes.usageData) {
        console.log('[Usage Update] Storage에서 사용량 변경 감지:', changes.usageData.newValue);
        
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
    
    // 2️⃣ Visibility 변경 감지 (popup이 숨겨졌다가 다시 보일 때)
    this.visibilityChangeListener = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Usage Update] Popup이 다시 보임 - 사용량 조회');
        await this.checkUsage();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeListener);
    
    // 3️⃣ Focus 이벤트 (popup에 포커스가 올 때)
    this.focusListener = async () => {
      console.log('[Usage Update] Popup에 포커스 - 사용량 조회');
      await this.checkUsage();
    };
    window.addEventListener('focus', this.focusListener);
    
    // 4️⃣ 주기적 폴링 (30초마다 - 선택적)
    this.usagePollingInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Usage Update] 주기적 폴링 - 사용량 조회');
        await this.checkUsage();
      }
    }, 30000); // 30초
    
    console.log('[Usage Update] 실시간 업데이트 리스너 등록 완료');
  }

  updateUITexts() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (summarizeBtn) {
      const buttonText = summarizeBtn.querySelector('span[data-i18n="summarizeButton"]');
      if (buttonText) {
        buttonText.textContent = window.languageManager.getMessage('summarizeButton');
      }
    }
    
    this.updateUsageDisplay();
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
      const analyzingMessages = [
        '현재 페이지를 분석 중...',
        'Analyzing current page...',
        '現在のページを分析中...',
        '正在分析当前页面...'
      ];
      
      if (analyzingMessages.includes(pageTitle.textContent)) {
        pageTitle.textContent = window.languageManager.getMessage('analyzingPage');
      }
    }
    
    const lengthLabels = document.querySelectorAll('.radio-label span');
    if (lengthLabels.length >= 3) {
      lengthLabels[0].textContent = window.languageManager.getMessage('lengthShort');
      lengthLabels[1].textContent = window.languageManager.getMessage('lengthMedium');
      lengthLabels[2].textContent = window.languageManager.getMessage('lengthDetailed');
    }
    
    document.querySelectorAll('[data-i18n]').forEach(element => {
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
    
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const message = window.languageManager.getMessage(key);
      
      if (message && message !== key) {
        element.title = message;
      }
    });
    
    // ✅ 질문 섹션 오버레이 텍스트 즉시 업데이트
    this.updateQuestionOverlayText();
  }

  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        throw new Error(window.languageManager.getMessage('errorExtractContent'));
      }
      
      this.currentPageInfo = {
        title: tab.title || window.languageManager.getMessage('noTitle'),
        url: tab.url,
        domain: new URL(tab.url).hostname
      };
      
      window.uiManager.displayPageInfo(this.currentPageInfo);
      
      if (window.isRestrictedPage(tab.url)) {
        window.uiManager.disablePage();
        this.showToast('errorRestrictedPage');
      }
      
    } catch (error) {
      console.error('[Security] 탭 정보 로드 오류:', error);
      window.errorHandler.handle(error, 'load-current-tab');
      this.showError('errorExtractContent');
    }
  }

  async extractPageContent() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (window.isRestrictedPage(tab.url)) {
        throw new Error(window.languageManager.getMessage('errorRestrictedPage'));
      }
      
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content-styles.css']
        });
        
        console.log('[Security] Content script 주입 완료');
      } catch (injectError) {
        console.log('[Security] Content script 주입 실패:', injectError.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'extractContent'
        });
        
        if (response && response.content) {
          const contentValidation = window.validateInput(response.content, {
            type: 'string',
            required: true,
            minLength: 50,
            maxLength: 50000
          });
          
          if (!contentValidation.valid) {
            throw new Error(`콘텐츠 검증 실패: ${contentValidation.error}`);
          }
          
          this.currentPageContent = contentValidation.sanitized;
          console.log('[Security] 콘텐츠 추출 및 검증 완료:', this.currentPageContent.length, '문자');
          return this.currentPageContent;
        }
      } catch (messageError) {
        console.log('[Security] Content script 통신 오류:', messageError.message);
      }
      
      console.log('[Security] 백업 방법으로 콘텐츠 추출 시도');
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const unwantedElements = document.querySelectorAll('script, style, noscript, iframe');
          unwantedElements.forEach(el => el.remove());
          
          const contentSelectors = [
            'article',
            'main',
            '[role="main"]',
            '.content',
            '#content',
            '.post-content',
            '.entry-content'
          ];
          
          for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.trim().length > 100) {
              return element.innerText.trim().substring(0, 10000);
            }
          }
          
          return document.body.innerText.trim().substring(0, 10000);
        }
      });
      
      if (result && result.result) {
        const contentValidation = window.validateInput(result.result, {
          type: 'string',
          required: true,
          minLength: 50,
          maxLength: 50000
        });
        
        if (!contentValidation.valid) {
          throw new Error(`콘텐츠 검증 실패: ${contentValidation.error}`);
        }
        
        this.currentPageContent = contentValidation.sanitized;
        console.log('[Security] 백업 방법으로 콘텐츠 추출 및 검증 완료:', this.currentPageContent.length, '문자');
        return this.currentPageContent;
      }
      
      throw new Error(window.languageManager.getMessage('errorExtractContent'));
      
    } catch (error) {
      console.error('[Security] 콘텐츠 추출 오류:', error);
      window.errorHandler.handle(error, 'extract-page-content');
      throw error;
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
      
      console.log('[Security] 요약 시작 - 콘텐츠 길이:', content.length);
      
      const lengthOption = window.settingsManager.getSummaryLength();
      console.log('[Security] 요약 길이 옵션:', lengthOption);
      
      this.currentSummary = await window.apiService.summarizeText(
        content, 
        lengthOption,
        this.currentPageInfo
      );
      console.log('[Security] 요약 완료 (길이:', this.currentSummary.length, '문자)');
      
      window.uiManager.displaySummary(this.currentSummary);
      
      const historyId = await this.saveSummaryHistory();
      this.currentHistoryId = historyId;
      
      await window.qaManager.initialize(historyId, content);
      
      // ✅ 질문 섹션 프리미엄 확인 (요약 완료 후 질문 섹션 표시 시)
      await this.checkPremiumAndToggleQuestion();
      
      // ✅ /api/chat에서 이미 사용량을 증가시키므로 여기서는 조회만 수행
      await this.updateUsage();
      
      this.showToast('toastSaved');
      
    } catch (error) {
      console.error('[Security] 요약 오류:', error);
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
      pattern: /^[^<>]*$/
    });
    
    if (!validation.valid) {
      console.warn('[Security] 질문 검증 실패:', validation.error);
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
      console.log('[Security] 질문 처리 중 - 길이:', question.length);
      
      await window.qaManager.processQuestion(question);
      
      // ✅ /api/chat에서 이미 사용량을 증가시키므로 여기서는 조회만 수행
      await this.updateUsage();
      
      questionInput.value = '';
      
      console.log('[Security] 질문 처리 완료');
      
    } catch (error) {
      console.error('[Security] 질문 처리 오류:', error);
      window.errorHandler.handle(error, 'ask-question');
      this.showError(error.message || 'errorAnswer');
    }
  }

  copySummary() {
    if (!this.currentSummary) {
      this.showToast('nothingToCopy');
      return;
    }
    
    navigator.clipboard.writeText(this.currentSummary)
      .then(() => {
        console.log('[Security] 요약 복사 완료');
        this.showToast('toastCopied');
        window.uiManager.animateCopyButton();
      })
      .catch(err => {
        console.error('[Security] 복사 실패:', err);
        window.errorHandler.handle(err, 'copy-summary');
        this.showToast('copyFailed');
      });
  }

  async saveSummaryHistory() {
    const settings = window.settingsManager.getSettings();
    
    if (!settings.saveHistory) {
      console.log('[Security] 히스토리 저장 비활성화됨');
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
          userId: this.currentUser?.id
        }
      });
      
      await window.storageManager.updateUsageStatistics();
      
      console.log('[Security] 히스토리 저장 완료:', historyItem.id.substring(0, 10) + '...');
      
      return historyItem.id;
      
    } catch (error) {
      console.error('[Security] 히스토리 저장 오류:', error);
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
      this.usage.limit = usageStatus.isPremium ? Infinity : usageStatus.dailyLimit;
      
      this.updateUsageDisplay();
      
      console.log('[Security] 사용량 조회 완료:', {
        isPremium: usageStatus.isPremium,
        used: this.usage.daily,
        limit: this.usage.limit
      });
      
    } catch (error) {
      console.error('[Security] 사용량 확인 오류:', error);
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
      console.error('[Security] 사용량 업데이트 오류:', error);
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
      const unlimitedMsg = window.languageManager.getMessage('unlimited') || '무제한';
      usageText.textContent = `✨ ${unlimitedMsg}`;
      usageText.style.color = '#4CAF50';
      console.log('[Usage Display] 프리미엄 사용자 - 표시:', usageText.textContent);
    } else {
      const usedCount = this.usage.daily;
      const totalLimit = this.usage.limit;
      
      console.log('[Usage Display] 무료 사용자 - 사용량:', { usedCount, totalLimit });
      
      // 언어별로 직접 문자열 구성 (플레이스홀더 치환 문제 해결)
      const currentLang = window.languageManager.getCurrentLanguage();
      let message;
      
      switch(currentLang) {
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
          buttonText.textContent = window.languageManager.getMessage('dailyLimitExceeded');
        }
        console.log('[Usage Display] 버튼 비활성화 - 사용 한도 초과');
      }
    } else {
      if (summarizeBtn) {
        summarizeBtn.disabled = false;
        const buttonText = summarizeBtn.querySelector('span:last-child');
        if (buttonText) {
          buttonText.textContent = window.languageManager.getMessage('summarizeButton');
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
    
    const typeText = type === 'summary' 
      ? window.languageManager.getMessage('summaryFeature') || '요약' 
      : window.languageManager.getMessage('questionFeature') || '질문';
    
    const remaining = window.usageManager.getRemainingCount(
      type === 'summary' ? window.USAGE_TYPE.SUMMARY : window.USAGE_TYPE.QUESTION
    );
    
    const resetTime = window.usageManager.getResetTime();
    const resetDate = resetTime ? new Date(resetTime) : new Date();
    const resetTimeText = resetDate.toLocaleTimeString(window.languageManager.getCurrentLanguage(), {
      hour: '2-digit',
      minute: '2-digit'
    });

    modal.innerHTML = `
      <div class="modal-content upgrade-modal">
        <div class="modal-header">
          <h2>${window.languageManager.getMessage('upgradeToPremium') || '프리미엄 업그레이드'}</h2>
          <button class="icon-btn close-modal">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="upgrade-icon">
            <span class="material-icons">lock</span>
          </div>
          <h3>${window.languageManager.getMessage('dailyLimitReached') || '오늘의 무료 사용량을 모두 소진했습니다'}</h3>
          <p class="upgrade-description">
            ${typeText} 기능을 계속 사용하려면 프리미엄으로 업그레이드하세요.
          </p>
          <div class="usage-info">
            <div class="info-row">
              <span class="info-label">${window.languageManager.getMessage('remainingToday') || '오늘 남은 횟수'}:</span>
              <span class="info-value">${remaining}회</span>
            </div>
            <div class="info-row">
              <span class="info-label">${window.languageManager.getMessage('resetTime') || '초기화 시간'}:</span>
              <span class="info-value">${resetTimeText}</span>
            </div>
          </div>
          <div class="premium-benefits">
            <h4>✨ ${window.languageManager.getMessage('premiumBenefits') || '프리미엄 혜택'}</h4>
            <ul>
              <li>
                <span class="material-icons">check_circle</span>
                ${window.languageManager.getMessage('unlimitedSummaries') || '무제한 요약'}
              </li>
              <li>
                <span class="material-icons">check_circle</span>
                ${window.languageManager.getMessage('unlimitedQuestions') || '무제한 질문'}
              </li>
              <li>
                <span class="material-icons">check_circle</span>
                ${window.languageManager.getMessage('prioritySupport') || '우선 지원'}
              </li>
              <li>
                <span class="material-icons">check_circle</span>
                ${window.languageManager.getMessage('advancedFeatures') || '고급 기능'}
              </li>
            </ul>
          </div>
          <div class="upgrade-price">
            <span class="price">$4.99</span>
            <span class="period">/ ${window.languageManager.getMessage('month') || '월'}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="secondary-btn close-modal">
            ${window.languageManager.getMessage('maybeLater') || '나중에'}
          </button>
          <button class="primary-btn upgrade-btn">
            <span class="material-icons">workspace_premium</span>
            ${window.languageManager.getMessage('upgradeToPremium') || '프리미엄 업그레이드'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.remove();
      });
    });

    const upgradeBtn = modal.querySelector('.upgrade-btn');
    upgradeBtn.addEventListener('click', () => {
      chrome.tabs.create({ 
        url: 'https://summarygenie.com/premium' 
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
    
    if (elements.summarizeBtn) {
      elements.summarizeBtn.addEventListener('click', () => this.summarizePage());
    }
    
    if (elements.copyBtn) {
      elements.copyBtn.addEventListener('click', () => this.copySummary());
    }
    
    if (elements.askBtn) {
      elements.askBtn.addEventListener('click', () => this.askQuestion());
    }
    
    if (elements.clearQABtn) {
      elements.clearQABtn.addEventListener('click', () => {
        window.qaManager.clearCurrentSession(true);
      });
    }
    
    if (elements.settingsBtn) {
      elements.settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
    
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
    
    // 요약 길이 버튼 이벤트 리스너 (새로운 스타일)
    const lengthButtons = document.querySelectorAll('.length-btn-modern');
    lengthButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        // 모든 버튼에서 active 클래스 제거
        lengthButtons.forEach(btn => btn.classList.remove('active'));
        // 클릭된 버튼에 active 클래스 추가
        button.classList.add('active');
        
        // 해당 라디오 버튼 체크
        const lengthValue = button.getAttribute('data-length');
        const radioInput = button.querySelector('input[type="radio"]');
        if (radioInput) {
          radioInput.checked = true;
        }
        
        console.log('[Security] 요약 길이 선택:', lengthValue);
      });
    });
    
    // 초기 활성 버튼 설정
    const mediumBtn = document.querySelector('.length-btn-modern[data-length="medium"]');
    if (mediumBtn) {
      mediumBtn.classList.add('active');
    }
  }

  async logout() {
    try {
      console.log('[Auth] 로그아웃 시작');
      
      await chrome.storage.local.remove('tokens');
      
      chrome.tabs.create({
        url: chrome.runtime.getURL('auth.html')
      });
      
      window.close();
      
    } catch (error) {
      console.error('[Auth] 로그아웃 오류:', error);
      window.errorHandler.handle(error, 'logout');
      this.showToast('logoutFailed');
    }
  }

  cleanup() {
    // 설정 변경 리스너 제거
    if (this.settingsUnsubscribe) {
      this.settingsUnsubscribe();
      this.settingsUnsubscribe = null;
    }
    
    // 실시간 사용량 업데이트 리스너 제거
    if (this.storageChangeListener) {
      chrome.storage.onChanged.removeListener(this.storageChangeListener);
      this.storageChangeListener = null;
      console.log('[Usage Update] Storage 리스너 제거');
    }
    
    if (this.visibilityChangeListener) {
      document.removeEventListener('visibilitychange', this.visibilityChangeListener);
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
    
    this.initialized = false;
    console.log('[Security] Popup cleanup 완료');
  }
}

// 앱 컨트롤러 인스턴스 생성
const app = new AppController();

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  app.initialize().catch(error => {
    console.error('[Security] 앱 초기화 실패:', error);
    window.errorHandler.handle(error, 'app-initialization');
  });
});

// 창 닫기 전 정리
window.addEventListener('beforeunload', () => {
  app.cleanup();
});