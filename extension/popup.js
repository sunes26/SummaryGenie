/**
 * extension\popup.js
 * SummaryGenie Popup Main Script
 * 요약 버튼 클릭 시 Side Panel로 리다이렉트
 *
 * ✨ v3.8.0 업데이트:
 * - PDF 페이지 감지 및 프리미엄 체크 추가
 * - handlePDFPage 메서드 구현
 *
 * @version 3.8.0
 */

class AppController {
  constructor() {
    this.currentPageContent = '';
    this.currentPageInfo = {
      title: '',
      url: '',
      domain: '',
      isPDF: false, // 🆕 PDF 여부 추가
    };
    this.currentUser = null;
    this.usage = {
      daily: 0,
      limit: 5,
    };
    this.isPremium = false; // 🆕 프리미엄 여부 추가
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[Popup] 초기화 시작');

      const isAuthenticated = await this.checkAuthStatusDirect();

      if (!isAuthenticated) {
        console.log('[Auth] 로그인 필요 - 안내 화면 표시');
        this.showLoginRequiredScreen();
        return;
      }

      await window.languageManager.initialize();
      await window.settingsManager.initialize();

      this.updateUITexts();
      await this.loadCurrentTab();
      await this.checkUsage();

      this.setupEventListeners();
      window.languageManager.applyLanguageFont();

      this.displayUserInfo();

      this.initialized = true;
      console.log('[Popup] 초기화 완료');
    } catch (error) {
      console.error('[Popup] 초기화 오류:', error);
      window.errorHandler.handle(error, 'popup-initialization');
      this.showError('initializationError');
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
      window.close();
    });

    document.getElementById('signupBtn').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('auth.html#signup'),
      });
      window.close();
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

        // ✅ 서버에서 실제 프리미엄 상태 조회 (Firestore)
        // 📝 프로덕션 배포 시 URL 변경: https://api.summarygenie.com/api/auth/me
        const API_BASE_URL = 'http://localhost:3000'; // 개발 환경

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
              isPremium: data.user.isPremium, // ✅ Firestore에서 가져온 정확한 값
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

        // 폴백: API 호출 실패 시 토큰에서 기본 정보만 사용
        console.log('[Auth] 폴백: 토큰에서 기본 정보 사용');
        this.currentUser = {
          id: payload.sub || payload.userId,
          email: payload.email,
          name: payload.name,
          isPremium: false, // 안전하게 false로 처리
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

  // 🚨 [수정됨] 248라인에 있던 불필요한 '}' 제거됨

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

      // 🆕 PDF 감지
      const isPDF = window.isPDFUrl ? window.isPDFUrl(tab.url) : false;

      this.currentPageInfo = {
        title: tab.title || window.languageManager.getMessage('noTitle'),
        url: tab.url,
        domain: new URL(tab.url).hostname,
        isPDF: isPDF,
      };

      window.uiManager.displayPageInfo(this.currentPageInfo);

      // 🆕 PDF 처리
      if (isPDF) {
        console.log('[Popup] PDF 페이지 감지:', tab.url);
        this.handlePDFPage();
        return;
      }

      if (window.isRestrictedPage(tab.url)) {
        window.uiManager.disablePage();
        this.showToast('errorRestrictedPage');
      }
    } catch (error) {
      console.error('[Popup] 탭 정보 로드 오류:', error);
      window.errorHandler.handle(error, 'load-current-tab');
      this.showError('errorExtractContent');
    }
  }

  /**
   * ✅ PDF 페이지 처리
   * 프리미엄 사용자: 정상 진행
   * 무료 사용자: 업그레이드 안내
   */
  handlePDFPage() {
    const summarizeBtn = document.getElementById('summarizeBtn');

    if (!this.isPremium) {
      console.log('[Popup] PDF 요약 차단 - 무료 사용자');

      // 버튼 비활성화 및 프리미엄 안내로 변경
      if (summarizeBtn) {
        summarizeBtn.disabled = false; // 클릭은 가능하게
        const buttonIcon = summarizeBtn.querySelector('.btn-icon');
        const buttonText = summarizeBtn.querySelector('span[data-i18n]');

        if (buttonIcon) {
          buttonIcon.innerHTML = `
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            <path d="M9 12l2 2 4-4"/>
          `;
        }

        if (buttonText) {
          buttonText.textContent = 'PDF 요약 (프리미엄)';
        }
      }

      // 안내 메시지 표시
      const infoMessage = document.querySelector('.info-message');
      if (infoMessage) {
        infoMessage.innerHTML = `
          <span class="material-icons">info</span>
          <span>PDF 요약은 프리미엄 전용 기능입니다</span>
        `;
        infoMessage.style.background =
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        infoMessage.style.color = 'white';
      }
    } else {
      console.log('[Popup] PDF 요약 허용 - 프리미엄 사용자');

      // 프리미엄 사용자는 일반 페이지와 동일하게 처리
      if (summarizeBtn) {
        summarizeBtn.disabled = false;
        const buttonText = summarizeBtn.querySelector('span[data-i18n]');
        if (buttonText) {
          buttonText.textContent = 'PDF 요약하기';
        }
      }
    }
  }

  /**
   * ✅ 요약하기 버튼 클릭 시 사이드 패널 열기
   */
  async summarizePage() {
    try {
      console.log('[Popup] 요약 버튼 클릭 - Side Panel 열기');

      // 🆕 PDF이고 무료 사용자면 업그레이드 모달 표시
      if (this.currentPageInfo.isPDF && !this.isPremium) {
        console.log('[Popup] PDF 요약 차단 - 업그레이드 모달 표시');
        this.showPDFUpgradeModal();
        return;
      }

      // 1. 자동 요약 플래그 설정
      await chrome.storage.local.set({
        autoSummarize: true,
        summaryLength: window.settingsManager.getSummaryLength(),
      });

      // 2. Side Panel 열기
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } else {
        // 폴백: 새 탭에서 열기
        chrome.tabs.create({
          url: chrome.runtime.getURL('sidepanel.html'),
        });
      }

      // 3. 팝업 닫기
      window.close();
    } catch (error) {
      console.error('[Popup] Side Panel 열기 오류:', error);
      window.errorHandler.handle(error, 'open-side-panel-for-summary');
      this.showError('errorSummarize');
    }
  }

  /**
   * ✅ PDF 업그레이드 모달 표시
   */
  showPDFUpgradeModal() {
    const existingModal = document.getElementById('pdfUpgradeModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'pdfUpgradeModal';
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content upgrade-modal" style="max-width: 420px;">
        <div class="modal-header">
          <h2>PDF 요약 기능</h2>
          <button class="icon-btn close-modal">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body" style="text-align: center; padding: 32px 24px;">
          <div class="upgrade-icon" style="margin-bottom: 24px;">
            <span class="material-icons" style="font-size: 64px; color: #667eea;">picture_as_pdf</span>
          </div>
          <h3 style="margin-bottom: 16px; font-size: 20px; color: #212121;">PDF 요약은 프리미엄 전용 기능입니다</h3>
          <p class="upgrade-description" style="margin-bottom: 24px; color: #757575; line-height: 1.6;">
            프리미엄으로 업그레이드하면<br>
            PDF 문서를 무제한으로 요약할 수 있습니다
          </p>
          <div class="premium-benefits" style="text-align: left; margin-bottom: 24px; padding: 20px; background: #f5f5f5; border-radius: 12px;">
            <h4 style="margin-bottom: 12px; font-size: 16px; color: #212121;">✨ 프리미엄 혜택</h4>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span class="material-icons" style="color: #4CAF50; font-size: 20px;">check_circle</span>
                <span style="color: #616161;">PDF 문서 무제한 요약</span>
              </li>
              <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span class="material-icons" style="color: #4CAF50; font-size: 20px;">check_circle</span>
                <span style="color: #616161;">웹페이지 무제한 요약</span>
              </li>
              <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span class="material-icons" style="color: #4CAF50; font-size: 20px;">check_circle</span>
                <span style="color: #616161;">무제한 질문 기능</span>
              </li>
              <li style="display: flex; align-items: center; gap: 8px;">
                <span class="material-icons" style="color: #4CAF50; font-size: 20px;">check_circle</span>
                <span style="color: #616161;">우선 지원</span>
              </li>
            </ul>
          </div>
          <div class="upgrade-price" style="margin-bottom: 24px;">
            <span class="price" style="font-size: 32px; font-weight: 700; color: #2196F3;">$4.99</span>
            <span class="period" style="color: #757575;">/ 월</span>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; padding: 16px 24px;">
          <button class="secondary-btn close-modal" style="flex: 1; padding: 12px; border: 1px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-weight: 500; color: #616161;">
            나중에
          </button>
          <button class="primary-btn upgrade-btn" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span class="material-icons" style="font-size: 20px;">workspace_premium</span>
            업그레이드
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

  async checkUsage() {
    try {
      // usageManager가 로드되지 않았을 경우 방어 코드
      if (!window.usageManager) {
        console.warn(
          '[Popup] usageManager가 아직 로드되지 않았습니다. 기본값 사용'
        );
        this.usage.daily = 0;
        this.usage.limit = 5;
        this.updateUsageDisplay();
        return;
      }

      console.log('[Popup] 사용량 조회 시작...');
      const usageStatus = await window.usageManager.getUsageStatus();

      console.log('[Popup] 사용량 조회 응답:', usageStatus);

      this.usage.daily = usageStatus.isPremium ? 0 : usageStatus.dailyUsed;
      this.usage.limit = usageStatus.isPremium ? Infinity : usageStatus.dailyLimit;

      this.updateUsageDisplay();

      console.log('[Popup] 사용량 조회 완료:', {
        isPremium: usageStatus.isPremium,
        used: this.usage.daily,
        limit: this.usage.limit,
      });
    } catch (error) {
      console.error('[Popup] 사용량 확인 오류:', error);
      window.errorHandler.handle(error, 'check-usage');

      this.usage.daily = 0;
      this.usage.limit = 5;
      this.updateUsageDisplay();
    }
  }

  updateUsageDisplay() {
    const usageText = document.getElementById('usageText');
    if (!usageText) {
      console.warn('[Popup] usageText 요소를 찾을 수 없습니다');
      return;
    }

    // usageManager가 아직 로드되지 않았을 경우 방어 코드
    if (!window.usageManager) {
      console.warn('[Popup] usageManager가 아직 로드되지 않았습니다');
      usageText.textContent = '로딩 중...';
      return;
    }

    const isPremium = window.usageManager.isPremium();
    console.log('[Popup] 프리미엄 상태:', isPremium);

    if (isPremium) {
      const unlimitedMsg =
        window.languageManager.getMessage('unlimited') || '무제한';
      usageText.textContent = `✨ ${unlimitedMsg}`;
      usageText.style.color = '#4CAF50';
      console.log('[Popup] 프리미엄 사용자 - 표시:', usageText.textContent);
    } else {
      const usedCount = this.usage.daily;
      const totalLimit = this.usage.limit;

      console.log('[Popup] 무료 사용자 - 사용량:', { usedCount, totalLimit });

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

      console.log('[Popup] 최종 메시지:', message);

      usageText.textContent = message;
      usageText.style.color = '';
    }

    const summarizeBtn = document.getElementById('summarizeBtn');
    if (!isPremium && this.usage.daily >= this.usage.limit) {
      if (summarizeBtn) {
        summarizeBtn.disabled = true;
        const buttonText = summarizeBtn.querySelector(
          'span[data-i18n="summarizeButton"]'
        );
        if (buttonText) {
          buttonText.textContent =
            window.languageManager.getMessage('dailyLimitExceeded');
        }
        console.log('[Popup] 버튼 비활성화 - 사용 한도 초과');
      }
    } else {
      if (summarizeBtn) {
        summarizeBtn.disabled = false;
        const buttonText = summarizeBtn.querySelector(
          'span[data-i18n="summarizeButton"]'
        );
        if (buttonText) {
          buttonText.textContent =
            window.languageManager.getMessage('summarizeButton');
        }
        console.log('[Popup] 버튼 활성화');
      }
    }
  }

  setupEventListeners() {
    const elements = window.uiManager.elements;

    // ✅ 요약 버튼: Side Panel 열기
    if (elements.summarizeBtn) {
      elements.summarizeBtn.addEventListener('click', () => this.summarizePage());
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
    this.initialized = false;
    console.log('[Popup] cleanup 완료');
  }
}

// 앱 컨트롤러 인스턴스 생성
const app = new AppController();

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  app.initialize().catch((error) => {
    console.error('[Popup] 앱 초기화 실패:', error);
    window.errorHandler.handle(error, 'app-initialization');
  });
});

// 창 닫기 전 정리
window.addEventListener('beforeunload', () => {
  app.cleanup();
});