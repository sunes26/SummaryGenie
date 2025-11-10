/**
 * extension\modules\ui-manager.js
 * SummaryGenie UI Manager
 * UI 상태 관리 및 DOM 조작을 담당하는 모듈
 * 
 * ✨ v5.1.0 업데이트:
 * - UTF-8 인코딩 문제 해결 (â€¢ → • 자동 변환)
 * - 채팅 스타일 Q&A UI
 * - 질문: 파란색 말풍선 (오른쪽)
 * - 답변: 회색 말풍선 (왼쪽, 홈 아이콘)
 * 
 * @module ui-manager
 * @version 5.1.0
 * @requires utils.js
 * @requires language-manager.js
 * @requires security.js
 * @requires error-handler.js
 */

class UIManager {
  constructor() {
    this.elements = this.initializeElements();
  }

  /**
   * DOM 요소 초기화
   */
  initializeElements() {
    try {
      return {
        pageTitle: document.getElementById('pageTitle'),
        pageUrl: document.getElementById('pageUrl'),
        summarizeBtn: document.getElementById('summarizeBtn'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        summaryResult: document.getElementById('summaryResult'),
        summaryText: document.getElementById('summaryText'),
        copyBtn: document.getElementById('copyBtn'),
        questionSection: document.getElementById('questionSection'),
        questionInput: document.getElementById('questionInput'),
        askBtn: document.getElementById('askBtn'),
        answerResult: document.getElementById('answerResult'),
        qaHistory: document.getElementById('qaHistory'),
        qaHistoryList: document.getElementById('qaHistoryList'),
        clearQABtn: document.getElementById('clearQABtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        usageText: document.getElementById('usageText'),
        toast: document.getElementById('toast')
      };
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.initializeElements');
      return {};
    }
  }

  /**
   * ✨ v5.1 - UTF-8 텍스트 정규화 함수
   * 렌더링 전에 깨진 UTF-8 문자를 복구합니다
   * 
   * @param {string} text - 정규화할 텍스트
   * @returns {string} 정규화된 텍스트
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // UTF-8 이중 인코딩으로 깨진 문자 복구
    const replacements = {
      'â€¢': '•',  // 불렛 포인트 (가장 중요!)
      'â€"': '–',  // en dash
      'â€"': '—',  // em dash
      'â€˜': '\'',  // left single quote
      'â€™': '\'',  // right single quote
      'â€œ': '"',  // left double quote
      'â€': '"',   // right double quote
      'Â': '',     // non-breaking space
      'â€¦': '…',  // ellipsis
      'Ã©': 'é',
      'Ã¨': 'è',
      'Ã ': 'à',
      'Ã§': 'ç',
      'Ã¶': 'ö',
      'Ã¼': 'ü',
      'Ã±': 'ñ',
    };

    let normalized = text;
    for (const [broken, fixed] of Object.entries(replacements)) {
      normalized = normalized.replace(new RegExp(broken, 'g'), fixed);
    }

    return normalized;
  }

  /**
   * 페이지 정보 표시
   */
  displayPageInfo(pageInfo) {
    try {
      if (this.elements.pageTitle) {
        this.elements.pageTitle.textContent = pageInfo.title || '';
      }
      if (this.elements.pageUrl) {
        this.elements.pageUrl.textContent = pageInfo.domain || '';
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.displayPageInfo');
    }
  }

  /**
   * 로딩 상태 표시
   */
  showLoading(show) {
    try {
      if (show) {
        this.elements.loadingIndicator?.classList.remove('hidden');
        if (this.elements.summarizeBtn) {
          this.elements.summarizeBtn.disabled = true;
        }
      } else {
        this.elements.loadingIndicator?.classList.add('hidden');
        if (this.elements.summarizeBtn) {
          this.elements.summarizeBtn.disabled = false;
        }
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.showLoading');
    }
  }

  /**
   * ✨ v5.1 - 요약 결과 표시 (UTF-8 정규화 적용)
   */
  displaySummary(summary) {
    try {
      if (!this.elements.summaryText) return;
      
      // ✨ UTF-8 정규화 먼저 적용
      const normalizedSummary = this.normalizeText(summary);
      
      // 구조화된 요약 파싱 시도
      const parsedSummary = this.parseStructuredSummary(normalizedSummary);
      
      if (parsedSummary) {
        // 구조화된 HTML 렌더링
        this.elements.summaryText.innerHTML = this.renderStructuredSummary(parsedSummary);
      } else {
        // 파싱 실패 시 정규화된 텍스트 표시
        this.elements.summaryText.textContent = normalizedSummary || '';
      }
      
      this.elements.summaryResult?.classList.remove('hidden');
      this.elements.questionSection?.classList.remove('hidden');
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.displaySummary');
      // 에러 발생 시 안전하게 원본 텍스트 표시
      if (this.elements.summaryText) {
        this.elements.summaryText.textContent = summary || '';
      }
    }
  }

  /**
   * 구조화된 요약 파싱
   * @param {string} summary - GPT 응답 텍스트
   * @returns {Object|null} 파싱된 구조 또는 null
   */
  parseStructuredSummary(summary) {
    try {
      if (!summary || typeof summary !== 'string') return null;
      
      // 언어별 섹션 헤더 패턴
      const sectionPatterns = {
        core: /\[(핵심|CORE|核心)\]\s*\n([\s\S]*?)(?=\n\[|$)/i,
        main: /\[(주요내용|MAIN|主要内容)\]\s*\n([\s\S]*?)(?=\n\[|$)/i,
        details: /\[(세부사항|DETAILS|詳細|详细)\]\s*\n([\s\S]*?)(?=\n\[|$)/i
      };
      
      const result = {};
      
      // 각 섹션 추출
      for (const [key, pattern] of Object.entries(sectionPatterns)) {
        const match = summary.match(pattern);
        if (match && match[2]) {
          result[key] = match[2].trim();
        }
      }
      
      // 최소한 핵심 섹션이 있어야 유효한 구조로 간주
      return result.core ? result : null;
      
    } catch (error) {
      console.error('[UIManager] 요약 파싱 실패:', error);
      return null;
    }
  }

  /**
   * 구조화된 요약을 HTML로 렌더링
   * @param {Object} parsed - 파싱된 요약 객체
   * @returns {string} HTML 문자열
   */
  renderStructuredSummary(parsed) {
    try {
      let html = '';
      
      // 핵심 섹션 렌더링
      if (parsed.core) {
        html += `<div class="summary-section summary-core">
          <div class="summary-section-header">
            <span class="summary-icon">📌</span>
            <strong class="summary-section-title">${this.getSectionTitle('core')}</strong>
          </div>
          <div class="summary-section-content">${window.sanitizeHtml(parsed.core)}</div>
        </div>`;
      }
      
      // 주요 내용 섹션 렌더링
      if (parsed.main) {
        const mainContent = this.parseBulletPoints(parsed.main);
        html += `<div class="summary-section summary-main">
          <div class="summary-section-header">
            <span class="summary-icon">📋</span>
            <strong class="summary-section-title">${this.getSectionTitle('main')}</strong>
          </div>
          <div class="summary-section-content">${mainContent}</div>
        </div>`;
      }
      
      // 세부사항 섹션 렌더링
      if (parsed.details) {
        html += `<div class="summary-section summary-details">
          <div class="summary-section-header">
            <span class="summary-icon">📝</span>
            <strong class="summary-section-title">${this.getSectionTitle('details')}</strong>
          </div>
          <div class="summary-section-content">${window.sanitizeHtml(parsed.details)}</div>
        </div>`;
      }
      
      return html;
      
    } catch (error) {
      console.error('[UIManager] HTML 렌더링 실패:', error);
      return '';
    }
  }

  /**
   * ✨ v5.1 - 불렛 포인트 파싱 (UTF-8 깨진 문자 대응)
   * @param {string} text - 불렛 포인트가 포함된 텍스트
   * @returns {string} HTML 문자열
   */
  parseBulletPoints(text) {
    try {
      // 불렛 포인트(•, -, *, â€¢)로 시작하는 줄 찾기
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      // ✨ v5.1 - UTF-8 깨진 불렛 포인트(â€¢)도 인식
      const hasBullets = lines.some(line => /^[•\-\*]|^â€¢\s/.test(line));
      
      if (hasBullets) {
        // <ul> 리스트로 변환
        const listItems = lines
          .map(line => {
            // ✨ 불렛 포인트 제거 (정상 • 및 깨진 â€¢ 모두 처리)
            const cleaned = line.replace(/^[•\-\*]\s+|^â€¢\s+/, '');
            return cleaned ? `<li>${window.sanitizeHtml(cleaned)}</li>` : '';
          })
          .filter(item => item)
          .join('\n');
        
        return `<ul class="summary-bullet-list">${listItems}</ul>`;
      } else {
        // 불렛 포인트가 없으면 일반 텍스트로 표시
        return window.sanitizeHtml(text);
      }
      
    } catch (error) {
      console.error('[UIManager] 불렛 포인트 파싱 실패:', error);
      return window.sanitizeHtml(text);
    }
  }

  /**
   * 언어에 맞는 섹션 제목 반환
   * @param {string} sectionKey - 섹션 키 (core, main, details)
   * @returns {string} 번역된 섹션 제목
   */
  getSectionTitle(sectionKey) {
    const currentLanguage = window.languageManager?.getCurrentLanguage() || 'ko';
    
    const titles = {
      ko: { core: '핵심', main: '주요 내용', details: '세부사항' },
      en: { core: 'Core', main: 'Main Points', details: 'Details' },
      ja: { core: '核心', main: '主要内容', details: '詳細' },
      zh: { core: '核心', main: '主要内容', details: '详细' }
    };
    
    return titles[currentLanguage]?.[sectionKey] || titles.ko[sectionKey];
  }

  /**
   * ✨ v5.1 - 답변 표시 (UTF-8 정규화 적용)
   */
  displayAnswer(answer) {
    try {
      if (!this.elements.answerResult) return;
      
      // ✨ UTF-8 정규화 적용
      const normalizedAnswer = this.normalizeText(answer);
      
      // 기존 내용 초기화
      this.elements.answerResult.innerHTML = '';
      
      // 홈 아이콘 컨테이너
      const answerIcon = window.createSafeElement('div', { class: 'answer-result-icon' });
      const homeIcon = window.createSafeElement('span', { class: 'material-icons' }, 'home');
      answerIcon.appendChild(homeIcon);
      this.elements.answerResult.appendChild(answerIcon);
      
      // 답변 말풍선 (정규화된 텍스트 사용)
      const answerBubble = window.createSafeElement('div', { class: 'answer-result-bubble' }, normalizedAnswer || '');
      this.elements.answerResult.appendChild(answerBubble);
      
      this.elements.answerResult.classList.remove('hidden');
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.displayAnswer');
    }
  }

  /**
   * ✨ v5.1 - Q&A 히스토리 UI 업데이트 (UTF-8 정규화 적용)
   */
  updateQAHistory(qaHistory) {
    try {
      if (!this.elements.qaHistoryList) return;
      
      if (!qaHistory || qaHistory.length === 0) {
        this.elements.qaHistory?.classList.add('hidden');
        return;
      }
      
      this.elements.qaHistory?.classList.remove('hidden');
      
      // 기존 히스토리 초기화
      while (this.elements.qaHistoryList.firstChild) {
        this.elements.qaHistoryList.removeChild(this.elements.qaHistoryList.firstChild);
      }
      
      // 최신 메시지가 아래로 (역순 X)
      qaHistory.forEach(item => {
        // ✨ UTF-8 정규화 적용
        const normalizedQuestion = this.normalizeText(item.question);
        const normalizedAnswer = this.normalizeText(item.answer);
        
        // 채팅 아이템 컨테이너
        const qaItem = window.createSafeElement('div', { class: 'qa-item-modern' });
        
        // 질문 말풍선 (오른쪽)
        const qaQuestion = window.createSafeElement('div', { class: 'qa-question-modern' });
        const questionBubble = window.createSafeElement('div', { class: 'qa-question-bubble' }, normalizedQuestion);
        qaQuestion.appendChild(questionBubble);
        qaItem.appendChild(qaQuestion);
        
        // 답변 말풍선 (왼쪽 + 홈 아이콘)
        const qaAnswer = window.createSafeElement('div', { class: 'qa-answer-modern' });
        
        // 홈 아이콘
        const answerIcon = window.createSafeElement('div', { class: 'qa-answer-icon' });
        const homeIcon = window.createSafeElement('span', { class: 'material-icons' }, 'home');
        answerIcon.appendChild(homeIcon);
        qaAnswer.appendChild(answerIcon);
        
        // 답변 말풍선
        const answerBubble = window.createSafeElement('div', { class: 'qa-answer-bubble' }, normalizedAnswer);
        qaAnswer.appendChild(answerBubble);
        
        qaItem.appendChild(qaAnswer);
        
        this.elements.qaHistoryList.appendChild(qaItem);
      });
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.updateQAHistory');
    }
  }

  /**
   * 사용량 표시 업데이트
   */
  updateUsageDisplay(daily, limit) {
    try {
      if (!this.elements.usageText) return;
      
      const usageMessage = window.languageManager.getMessage('usageToday', {
        COUNT: daily,
        LIMIT: limit
      });
      
      this.elements.usageText.textContent = usageMessage;
      
      if (daily >= limit && this.elements.summarizeBtn) {
        this.elements.summarizeBtn.disabled = true;
        const buttonText = this.elements.summarizeBtn.querySelector('span:last-child');
        if (buttonText) {
          buttonText.textContent = window.languageManager.getMessage('dailyLimitExceeded');
        }
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.updateUsageDisplay');
    }
  }

  /**
   * 직접 토스트 표시 (fallback)
   * @private
   */
  _showToastDirect(message, type = 'info', duration = 3000) {
    try {
      const toast = this.elements.toast || document.getElementById('toast');
      if (!toast) {
        console.warn('[UIManager] 토스트 엘리먼트를 찾을 수 없습니다');
        return;
      }

      toast.textContent = message;
      toast.className = 'toast';
      toast.classList.add(type);
      toast.classList.remove('hidden');

      setTimeout(() => {
        toast.classList.add('hidden');
        toast.className = 'toast hidden';
      }, duration);
    } catch (error) {
      console.error('[UIManager] 토스트 표시 실패:', error);
    }
  }

  /**
   * 토스트 메시지 표시
   */
  showToast(message, type = 'info', duration = 3000) {
    try {
      if (typeof window.UIComponents !== 'undefined' && window.UIComponents.toast) {
        window.UIComponents.toast.show(message, type, duration);
      } else {
        this._showToastDirect(message, type, duration);
      }
    } catch (error) {
      console.error('[UIManager] showToast 실패:', error);
      this._showToastDirect(message, type, duration);
    }
  }

  /**
   * 에러 표시
   */
  showError(message) {
    try {
      this.showToast(message, 'error', 3000);
    } catch (error) {
      console.error('[UIManager] showError 실패:', error);
      this._showToastDirect(message, 'error', 3000);
    }
  }

  /**
   * 성공 메시지 표시
   */
  showSuccess(message) {
    try {
      this.showToast(message, 'success', 3000);
    } catch (error) {
      console.error('[UIManager] showSuccess 실패:', error);
      this._showToastDirect(message, 'success', 3000);
    }
  }

  /**
   * 경고 메시지 표시
   */
  showWarning(message) {
    try {
      this.showToast(message, 'warning', 3000);
    } catch (error) {
      console.error('[UIManager] showWarning 실패:', error);
      this._showToastDirect(message, 'warning', 3000);
    }
  }

  /**
   * 테마 적용
   */
  applyTheme(theme) {
    try {
      document.body.classList.remove('dark-theme', 'auto-theme');
      
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else if (theme === 'auto') {
        document.body.classList.add('auto-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        if (prefersDark.matches) {
          document.body.classList.add('dark-theme');
        }
        
        prefersDark.addEventListener('change', (e) => {
          if (e.matches) {
            document.body.classList.add('dark-theme');
          } else {
            document.body.classList.remove('dark-theme');
          }
        });
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.applyTheme');
    }
  }

  /**
   * API 모드 UI 업데이트
   */
  updateApiModeUI(mode) {
    try {
      const proxyUrlItem = document.getElementById('proxyUrlItem');
      const apiKeyItem = document.getElementById('apiKeyItem');
      
      if (proxyUrlItem && apiKeyItem) {
        if (mode === 'proxy') {
          proxyUrlItem.style.display = 'block';
          apiKeyItem.style.display = 'none';
        } else {
          proxyUrlItem.style.display = 'none';
          apiKeyItem.style.display = 'block';
        }
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.updateApiModeUI');
    }
  }

  /**
   * 설정 모달 표시
   */
  showSettingsModal(content) {
    try {
      if (typeof window.UIComponents !== 'undefined' && window.UIComponents.modal) {
        const title = window.languageManager.getMessage('settings');
        window.UIComponents.modal.open('settings', title, content, {
          width: '500px',
          closeOnBackdrop: true,
          closeOnEsc: true
        });
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.showSettingsModal');
    }
  }

  /**
   * 설정 모달 숨기기
   */
  hideSettingsModal() {
    try {
      if (typeof window.UIComponents !== 'undefined' && window.UIComponents.modal) {
        window.UIComponents.modal.close('settings');
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.hideSettingsModal');
    }
  }

  /**
   * 질문 입력 초기화
   */
  clearQuestionInput() {
    try {
      if (this.elements.questionInput) {
        this.elements.questionInput.value = '';
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.clearQuestionInput');
    }
  }

  /**
   * 요약/질문 섹션 초기화
   */
  resetSections() {
    try {
      this.elements.summaryResult?.classList.add('hidden');
      this.elements.questionSection?.classList.add('hidden');
      this.elements.answerResult?.classList.add('hidden');
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.resetSections');
    }
  }

  /**
   * 버튼 비활성화 상태
   */
  disablePage() {
    try {
      if (this.elements.summarizeBtn) {
        this.elements.summarizeBtn.disabled = true;
      }
      if (this.elements.pageTitle) {
        this.elements.pageTitle.textContent = window.languageManager.getMessage('errorRestrictedPage');
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.disablePage');
    }
  }

  /**
   * 복사 버튼 애니메이션
   */
  animateCopyButton() {
    try {
      if (!this.elements.copyBtn) return;
      
      const icon = this.elements.copyBtn.querySelector('.material-icons');
      if (icon) {
        icon.textContent = 'done';
        setTimeout(() => {
          icon.textContent = 'content_copy';
        }, 2000);
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.animateCopyButton');
    }
  }

  /**
   * 요청 중 상태 표시 (v5.0 - 채팅 스타일)
   */
  showProcessingAnswer() {
    try {
      if (this.elements.askBtn) {
        this.elements.askBtn.disabled = true;
      }
      if (this.elements.answerResult) {
        // 기존 내용 초기화
        this.elements.answerResult.innerHTML = '';
        
        // 홈 아이콘 컨테이너
        const answerIcon = window.createSafeElement('div', { class: 'answer-result-icon' });
        const homeIcon = window.createSafeElement('span', { class: 'material-icons' }, 'home');
        answerIcon.appendChild(homeIcon);
        this.elements.answerResult.appendChild(answerIcon);
        
        // 로딩 메시지 말풍선
        const message = window.languageManager.getMessage('generatingAnswer');
        const answerBubble = window.createSafeElement('div', { class: 'answer-result-bubble' }, message);
        this.elements.answerResult.appendChild(answerBubble);
        
        this.elements.answerResult.classList.remove('hidden');
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.showProcessingAnswer');
    }
  }

  /**
   * 요청 완료 상태
   */
  endProcessingAnswer() {
    try {
      if (this.elements.askBtn) {
        this.elements.askBtn.disabled = false;
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.endProcessingAnswer');
    }
  }

  /**
   * 로딩 스피너 표시
   */
  showSpinner(target, messageKey) {
    try {
      if (typeof window.UIComponents !== 'undefined' && window.UIComponents.spinner) {
        const message = messageKey ? window.languageManager.getMessage(messageKey) : '';
        window.UIComponents.spinner.show(target, message);
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.showSpinner');
    }
  }

  /**
   * 로딩 스피너 숨기기
   */
  hideSpinner(target) {
    try {
      if (typeof window.UIComponents !== 'undefined' && window.UIComponents.spinner) {
        window.UIComponents.spinner.hide(target);
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.hideSpinner');
    }
  }

  /**
   * 확인 다이얼로그 표시
   * @returns {Promise<boolean>}
   */
  async showConfirm(messageKey, options = {}) {
    try {
      if (typeof window.UIComponents !== 'undefined' && window.UIComponents.confirm) {
        const message = window.languageManager.getMessage(messageKey);
        
        const translatedOptions = {
          ...options,
          title: options.title ? window.languageManager.getMessage(options.title) : window.languageManager.getMessage('confirmReset'),
          confirmText: options.confirmText ? window.languageManager.getMessage(options.confirmText) : 'OK',
          cancelText: options.cancelText ? window.languageManager.getMessage(options.cancelText) : 'Cancel'
        };
        
        return await window.UIComponents.confirm.show(message, translatedOptions);
      }
      
      const message = window.languageManager.getMessage(messageKey);
      return confirm(message);
      
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.showConfirm');
      return false;
    }
  }

  /**
   * DOM 요소 가져오기
   */
  getElement(elementName) {
    return this.elements[elementName];
  }

  /**
   * 모든 UI 컴포넌트 정리
   */
  destroy() {
    try {
      if (typeof window.UIComponents !== 'undefined') {
        window.UIComponents.destroyAll();
      }
    } catch (error) {
      window.errorHandler.handle(error, 'UIManager.destroy');
    }
  }
}

window.uiManager = new UIManager();