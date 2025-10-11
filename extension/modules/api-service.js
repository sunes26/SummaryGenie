/**
 * SummaryGenie API Service
 * OpenAI API 및 히스토리 API 호출을 관리하는 모듈
 * 
 * ✨ v3.3.0 업데이트:
 * - 다국어 프롬프트 지원 (한국어, 영어, 일본어, 중국어)
 * - 인터페이스 언어에 따라 GPT 응답 언어 자동 변경
 * - 프록시 모드에서 JWT 토큰 전송 추가 (게스트 사용자 문제 해결)
 * - title, url을 서버로 전송하여 요약 상세 정보 저장
 * - 상세한 에러 로깅 추가 (디버깅 개선)
 * 
 * @module api-service
 * @version 3.3.0
 */

class APIService {
  constructor() {
    this.baseUrl = 'https://api.openai.com/v1';
    this.proxyUrl = 'http://localhost:3000/api/chat';
    this.apiBaseUrl = 'http://localhost:3000';
    this.timeout = 30000;
    this.maxRetries = 2;
    this.cache = new Map();
    this.cacheMaxSize = 20;
    
    console.log('[APIService] 초기화');
  }

  generateCacheKey(content, type, param = '') {
    const hash = content.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    
    return `${type}_${param}_${Math.abs(hash)}`;
  }

  cacheGet(key) {
    return this.cache.get(key);
  }

  cacheSet(key, value) {
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  async getApiConfig() {
    try {
      const settings = await window.settingsManager.getSettings();
      
      return {
        useProxy: settings.useProxy,
        proxyUrl: settings.proxyUrl || this.proxyUrl,
        apiKey: settings.apiKey || '',
        model: settings.model || 'gpt-4o-mini'
      };
    } catch (error) {
      window.errorHandler.handle(error, 'APIService.getApiConfig');
      throw error;
    }
  }

/**
 * 인증 토큰 조회 (Background 없이 직접 storage 접근)
 * @returns {Promise<string|null>} 액세스 토큰
 */
async getAuthToken() {
  try {
    console.log('[APIService] storage에서 토큰 조회');
    
    const result = await chrome.storage.local.get('tokens');
    
    if (!result.tokens || !result.tokens.accessToken) {
      console.warn('[APIService] 토큰 없음');
      return null;
    }
    
    const token = result.tokens.accessToken;
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      console.warn('[APIService] 잘못된 토큰 형식');
      return null;
    }
    
    // 토큰 만료 확인
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const exp = payload.exp * 1000;
      const now = Date.now();
      
      if (exp <= now) {
        console.warn('[APIService] 토큰 만료됨');
        return null;
      }
      
      console.log('[APIService] 토큰 유효함');
      return token;
      
    } catch (decodeError) {
      console.error('[APIService] 토큰 디코딩 실패:', decodeError);
      return null;
    }
    
  } catch (error) {
    console.error('[APIService] 토큰 조회 실패:', error);
    return null;
  }
}

  /**
   * 텍스트 요약
   * ✨ 수정: pageInfo 파라미터 추가
   * 
   * @param {string} content - 요약할 콘텐츠
   * @param {string} length - 요약 길이 (short/medium/detailed)
   * @param {Object} pageInfo - 🆕 페이지 정보
   * @param {string} pageInfo.title - 페이지 제목
   * @param {string} pageInfo.url - 페이지 URL
   * @param {string} [pageInfo.domain] - 페이지 도메인
   * @returns {Promise<string>} 요약 결과
   */
  async summarizeText(content, length = 'medium', pageInfo = null) {
    try {
      const contentValidation = window.validateInput(content, {
        type: 'string',
        required: true,
        minLength: 10,
        maxLength: 100000
      });

      if (!contentValidation.valid) {
        throw new Error(contentValidation.error);
      }

      const lengthValidation = window.validateInput(length, {
        type: 'string',
        allowedValues: ['short', 'medium', 'detailed']
      });

      if (!lengthValidation.valid) {
        length = 'medium';
      }

      const cacheKey = this.generateCacheKey(contentValidation.sanitized, 'summarizeText', length);
      const cachedResult = this.cacheGet(cacheKey);
      
      if (cachedResult) {
        console.log('[APIService] 캐시에서 요약 결과 반환');
        return cachedResult;
      }

      const config = await this.getApiConfig();
      const prompt = this.buildSummaryPrompt(contentValidation.sanitized, length);
      
      // 🆕 pageInfo를 callOpenAI에 전달
      const response = await this.callOpenAI(prompt, config, 0, pageInfo);
      
      this.cacheSet(cacheKey, response);
      return response;

    } catch (error) {
      window.errorHandler.handle(error, 'APIService.summarizeText');
      throw error;
    }
  }

  async askQuestion(context, question, qaHistory = []) {
    try {
      const contextValidation = window.validateInput(context, {
        type: 'string',
        required: true,
        minLength: 10,
        maxLength: 100000
      });

      if (!contextValidation.valid) {
        throw new Error('유효하지 않은 컨텍스트입니다');
      }

      const questionValidation = window.validateInput(question, {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 2000
      });

      if (!questionValidation.valid) {
        throw new Error(questionValidation.error);
      }

      const historyKey = qaHistory.map(qa => qa.question).join('|');
      const cacheKey = this.generateCacheKey(
        contextValidation.sanitized + questionValidation.sanitized + historyKey,
        'question'
      );
      const cachedResult = this.cacheGet(cacheKey);
      
      if (cachedResult) {
        console.log('[APIService] 캐시에서 답변 반환');
        return cachedResult;
      }

      const config = await this.getApiConfig();
      const prompt = this.buildQuestionPrompt(
        contextValidation.sanitized,
        questionValidation.sanitized,
        qaHistory
      );
      
      const response = await this.callOpenAI(prompt, config);
      this.cacheSet(cacheKey, response);
      
      return response;

    } catch (error) {
      window.errorHandler.handle(error, 'APIService.askQuestion');
      throw error;
    }
  }

  /**
   * OpenAI API 호출
   * ✨ v3.3.0 수정: 상세한 에러 로깅 추가
   * 
   * @param {string} prompt - 프롬프트
   * @param {Object} config - API 설정
   * @param {number} retryCount - 재시도 횟수
   * @param {Object} pageInfo - 🆕 페이지 정보 (title, url)
   * @returns {Promise<string>} API 응답
   */
  async callOpenAI(prompt, config, retryCount = 0, pageInfo = null) {
    try {
      const url = config.useProxy ? config.proxyUrl : `${this.baseUrl}/chat/completions`;
      
      if (!config.useProxy) {
        const keyValidation = window.validateApiKey(config.apiKey);
        if (!keyValidation.valid) {
          throw new Error(keyValidation.error);
        }
      }

      const headers = {
        'Content-Type': 'application/json'
      };

      // ✅ 수정: 프록시 모드와 직접 모드 구분
      if (config.useProxy) {
        // 프록시 모드: JWT 토큰 가져오기
        const token = await this.getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('[APIService] JWT 토큰을 프록시 요청에 포함');
        } else {
          console.warn('[APIService] JWT 토큰 없음 - 게스트로 처리될 수 있음');
        }
      } else if (config.apiKey) {
        // 직접 OpenAI 호출 모드: API 키 사용
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      // 🆕 body 구성 시 pageInfo 포함
      const body = {
        model: config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      };

      // 🆕 pageInfo가 있으면 추가
      if (pageInfo && pageInfo.title && pageInfo.url) {
        body.title = pageInfo.title;
        body.url = pageInfo.url;
        body.language = window.languageManager?.getCurrentLanguage() || 'ko';
        
        console.log('[APIService] 페이지 정보 포함:', {
          title: pageInfo.title,
          url: pageInfo.url,
          language: body.language
        });
      }

      // 🔍 전송할 body 로그 출력 (디버깅용)
      console.log('[APIService] 요청 URL:', url);
      console.log('[APIService] 전송할 body:', JSON.stringify({
        model: body.model,
        messages: body.messages.map(m => ({ role: m.role, contentLength: m.content.length })),
        max_tokens: body.max_tokens,
        temperature: body.temperature,
        title: body.title ? body.title.substring(0, 50) + '...' : undefined,
        url: body.url ? body.url.substring(0, 50) + '...' : undefined,
        language: body.language
      }, null, 2));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 🔍 상세한 에러 로그 출력
        console.error('[APIService] 서버 응답 에러:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          errorData: errorData
        });
        
        if (response.status === 404) {
          throw new Error(
            '프록시 서버에 연결할 수 없습니다.\n\n' +
            '해결 방법:\n' +
            '1. 프록시 서버가 실행 중인지 확인하세요\n' +
            '2. 브라우저에서 http://localhost:3000/health 접속\n' +
            '3. 설정에서 프록시 URL 확인'
          );
        }
        
        // 서버에서 보낸 상세 에러 메시지 우선 사용
        throw new Error(
          errorData.message ||
          errorData.error?.message || 
          (errorData.details ? JSON.stringify(errorData.details) : null) ||
          `API 요청 실패: ${response.status}`
        );
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('[APIService] 유효하지 않은 응답:', data);
        throw new Error('유효하지 않은 API 응답 형식입니다');
      }

      console.log('[APIService] API 호출 성공');
      return data.choices[0].message.content.trim();

    } catch (error) {
      if (error.name === 'AbortError') {
        if (retryCount < this.maxRetries) {
          console.log(`[APIService] Timeout - 재시도 ${retryCount + 1}/${this.maxRetries}`);
          await this.delay(1000 * (retryCount + 1));
          return await this.callOpenAI(prompt, config, retryCount + 1, pageInfo);
        }
        throw new Error('요청 시간이 초과되었습니다.');
      }

      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        throw new Error(
          '네트워크 연결에 실패했습니다.\n' +
          '프록시 서버 실행 여부를 확인하세요.'
        );
      }

      throw error;
    }
  }

  async saveHistory(historyItem) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(historyItem)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `히스토리 저장 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      window.errorHandler.handle(error, 'APIService.saveHistory');
      throw error;
    }
  }

  async getHistory(params = {}) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      const { page = 1, limit = 50 } = params;
      const queryString = new URLSearchParams({ page, limit }).toString();

      const response = await fetch(`${this.apiBaseUrl}/api/history?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`히스토리 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      window.errorHandler.handle(error, 'APIService.getHistory');
      throw error;
    }
  }

  async deleteHistory(id) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`히스토리 삭제 실패: ${response.status}`);
      }
    } catch (error) {
      window.errorHandler.handle(error, 'APIService.deleteHistory');
      throw error;
    }
  }

  async syncHistoryBatch(items) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/history/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `일괄 동기화 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      window.errorHandler.handle(error, 'APIService.syncHistoryBatch');
      throw error;
    }
  }

  /**
   * 언어별 요약 프롬프트 템플릿
   * @param {string} content - 요약할 콘텐츠
   * @param {string} length - 요약 길이
   * @param {string} language - 언어 코드 (ko, en, ja, zh)
   * @returns {string} 언어에 맞는 프롬프트
   */
  buildSummaryPrompt(content, length) {
    const currentLanguage = window.languageManager?.getCurrentLanguage() || 'ko';
    
    // 언어별 길이 가이드
    const lengthGuides = {
      ko: {
        short: '2-3문장으로 핵심만 간단히',
        medium: '4-5문장으로 주요 내용을',
        detailed: '7-10문장으로 자세히'
      },
      en: {
        short: 'briefly in 2-3 sentences focusing on key points',
        medium: 'in 4-5 sentences covering main content',
        detailed: 'in detail using 7-10 sentences'
      },
      ja: {
        short: '2-3文で簡潔に要点のみ',
        medium: '4-5文で主な内容を',
        detailed: '7-10文で詳しく'
      },
      zh: {
        short: '用2-3句话简要概括要点',
        medium: '用4-5句话概括主要内容',
        detailed: '用7-10句话详细概括'
      }
    };

    // 언어별 프롬프트 템플릿
    const prompts = {
      ko: `다음 웹페이지 내용을 ${lengthGuides.ko[length]} 요약해주세요.

웹페이지 내용:
${content}

요약 시 주의사항:
- 핵심 내용을 명확하게 전달
- 원문의 의도를 정확히 반영
- 불필요한 수식어 제거
- 객관적이고 중립적인 표현 사용

요약:`,

      en: `Please summarize the following webpage content ${lengthGuides.en[length]}.

Webpage content:
${content}

Important notes:
- Clearly convey the key points
- Accurately reflect the original intent
- Remove unnecessary embellishments
- Use objective and neutral expressions

Summary:`,

      ja: `以下のウェブページの内容を${lengthGuides.ja[length]}要約してください。

ウェブページの内容:
${content}

要約の注意事項:
- 核心内容を明確に伝える
- 原文の意図を正確に反映
- 不要な修飾語を削除
- 客観的で中立的な表現を使用

要約:`,

      zh: `请${lengthGuides.zh[length]}以下网页内容。

网页内容:
${content}

注意事项:
- 清楚地传达核心内容
- 准确反映原文意图
- 删除不必要的修饰语
- 使用客观中立的表达

摘要:`
    };

    return prompts[currentLanguage] || prompts.ko;
  }

  /**
   * 언어별 질문 프롬프트 템플릿
   * @param {string} context - 웹페이지 컨텍스트
   * @param {string} question - 사용자 질문
   * @param {Array} qaHistory - 이전 질문/답변 기록
   * @returns {string} 언어에 맞는 프롬프트
   */
  buildQuestionPrompt(context, question, qaHistory) {
    const currentLanguage = window.languageManager?.getCurrentLanguage() || 'ko';
    
    // 언어별 템플릿
    const templates = {
      ko: {
        contextLabel: '다음은 웹페이지의 내용입니다:',
        historyLabel: '이전 질문/답변:',
        currentQuestionLabel: '현재 질문:',
        instruction: '위 웹페이지 내용을 바탕으로 질문에 정확하고 자세하게 답변해주세요.',
        answerLabel: '답변:'
      },
      en: {
        contextLabel: 'Here is the webpage content:',
        historyLabel: 'Previous Q&A:',
        currentQuestionLabel: 'Current question:',
        instruction: 'Please answer the question accurately and in detail based on the webpage content above.',
        answerLabel: 'Answer:'
      },
      ja: {
        contextLabel: '以下はウェブページの内容です:',
        historyLabel: '以前の質問/回答:',
        currentQuestionLabel: '現在の質問:',
        instruction: '上記のウェブページ内容に基づいて、質問に正確かつ詳しく答えてください。',
        answerLabel: '回答:'
      },
      zh: {
        contextLabel: '以下是网页内容:',
        historyLabel: '之前的问答:',
        currentQuestionLabel: '当前问题:',
        instruction: '请根据上述网页内容准确详细地回答问题。',
        answerLabel: '回答:'
      }
    };

    const t = templates[currentLanguage] || templates.ko;
    
    let prompt = `${t.contextLabel}

${context}

`;

    if (qaHistory && qaHistory.length > 0) {
      prompt += `${t.historyLabel}\n`;
      qaHistory.slice(-3).forEach((qa, index) => {
        prompt += `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}\n\n`;
      });
    }

    prompt += `${t.currentQuestionLabel} ${question}

${t.instruction}

${t.answerLabel}`;

    return prompt;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkApiStatus() {
    try {
      const config = await this.getApiConfig();
      
      if (config.useProxy) {
        try {
          const healthCheckUrl = config.proxyUrl.replace('/api/chat', '/health');
          const response = await fetch(healthCheckUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          
          return response.ok;
        } catch (error) {
          return false;
        }
      } else {
        const keyValidation = window.validateApiKey(config.apiKey);
        return keyValidation.valid;
      }
    } catch (error) {
      window.errorHandler.handle(error, 'APIService.checkApiStatus');
      return false;
    }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cacheMaxSize
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('[APIService] 캐시 전체 삭제');
  }

  cleanup() {
    this.cache.clear();
    console.log('[APIService] 정리 완료');
  }
}

// 전역 인스턴스 생성
window.apiService = new APIService();