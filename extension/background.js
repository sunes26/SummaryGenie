/**
 * extension\background.js
 * SummaryGenie Enhanced Background Service Worker - All-in-One
 * TokenManager, ErrorHandler, 모든 기능 통합
 * 
 * ✨ v5.0.0 업데이트:
 * - Firebase Auth 자동 복구 추가 (onStartup)
 * - Keep-Alive ping 응답 강화 (Firebase Auth 상태 포함)
 * - 타임아웃 180초로 통일
 * - PDF 진행 상황 중계 기능 추가
 * 
 * @version 5.0.0
 */

console.log('[Background] 🔵 SummaryGenie 시작 (v5.0.0 - Firebase Auth 자동 복구)');

// =====================================================
// 1. ErrorHandler 모듈 (통합)
// =====================================================

const ErrorType = {
  NETWORK: 'network',
  API: 'api',
  VALIDATION: 'validation',
  STORAGE: 'storage',
  UNKNOWN: 'unknown'
};

const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    console.log('[ErrorHandler] 초기화 완료 (최대 로그: 50개)');
  }
  
  handle(error, context = '', severity = ErrorSeverity.ERROR) {
    const errorType = this.classifyError(error);
    this.logError(error, context, severity, errorType);
    return this.getUserMessage(error);
  }
  
  logError(error, context = '', severity = ErrorSeverity.ERROR, type = null) {
    const errorType = type || this.classifyError(error);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      context: context,
      message: error.message || String(error),
      name: error.name || 'Error',
      type: errorType,
      severity: severity,
      stack: error.stack ? error.stack.substring(0, 500) : null
    };
    
    this.errors.push(logEntry);
    
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    
    const logPrefix = `[${severity.toUpperCase()}] ${context}`;
    
    switch (severity) {
      case ErrorSeverity.INFO:
        console.info(logPrefix, error);
        break;
      case ErrorSeverity.WARNING:
        console.warn(logPrefix, error);
        break;
      case ErrorSeverity.CRITICAL:
        console.error(`🚨 ${logPrefix}`, error);
        break;
      case ErrorSeverity.ERROR:
      default:
        console.error(logPrefix, error);
    }
  }
  
  classifyError(error) {
    const message = (error.message || '').toLowerCase();
    const name = (error.name || '').toLowerCase();
    
    if (message.includes('failed to fetch') || 
        message.includes('network') || 
        message.includes('인터넷') ||
        name.includes('network')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('api') || 
        message.includes('unauthorized') || 
        message.includes('401') ||
        message.includes('429') ||
        message.includes('rate') ||
        message.includes('한도')) {
      return ErrorType.API;
    }
    
    if (message.includes('50자') || 
        message.includes('최소') || 
        message.includes('최대') ||
        message.includes('유효') ||
        message.includes('validation')) {
      return ErrorType.VALIDATION;
    }
    
    if (message.includes('storage') || 
        message.includes('quota') ||
        message.includes('저장') ||
        name.includes('quotaexceeded')) {
      return ErrorType.STORAGE;
    }
    
    return ErrorType.UNKNOWN;
  }
  
  getUserMessage(error) {
    const message = (error.message || '').toLowerCase();
    
    if (message.includes('failed to fetch') || 
        message.includes('network') || 
        message.includes('인터넷')) {
      return '인터넷 연결을 확인해주세요.';
    }
    
    if (message.includes('timeout') || message.includes('시간')) {
      return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
    }
    
    if (message.includes('api key') || 
        message.includes('unauthorized') || 
        message.includes('401')) {
      return 'API 키를 확인해주세요. 설정에서 올바른 키를 입력하세요.';
    }
    
    if (message.includes('429') || 
        message.includes('rate') || 
        message.includes('한도')) {
      return 'API 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503')) {
      return '서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
    }
    
    if (message.includes('50자') || 
        message.includes('최소') || 
        message.includes('최대')) {
      return error.message;
    }
    
    if (message.includes('quota') || message.includes('저장')) {
      return '저장 공간이 부족합니다. 일부 데이터를 삭제해주세요.';
    }
    
    return error.message || '오류가 발생했습니다. 다시 시도해주세요.';
  }
  
  async retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        if (this.isNonRetryableError(error)) {
          this.logError(error, 'retry-skipped', ErrorSeverity.WARNING);
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Retry] ${attempt + 1}/${maxRetries} - ${delay}ms 대기`);
        
        await this.sleep(delay);
      }
    }
    
    this.logError(lastError, 'retry-failed', ErrorSeverity.ERROR);
    throw lastError;
  }
  
  isNonRetryableError(error) {
    const message = (error.message || '').toLowerCase();
    
    if (message.includes('api key') || 
        message.includes('unauthorized') || 
        message.includes('401')) {
      return true;
    }
    
    if (message.includes('50자') || 
        message.includes('최소') || 
        message.includes('최대') ||
        message.includes('유효한')) {
      return true;
    }
    
    if (message.includes('400')) {
      return true;
    }
    
    return false;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getRecentErrors(limit = 10) {
    const validLimit = Math.min(Math.max(1, limit), this.maxErrors);
    return this.errors.slice(-validLimit);
  }
  
  getErrorsByType(type, limit = 10) {
    const filtered = this.errors.filter(err => err.type === type);
    return filtered.slice(-limit);
  }
  
  getErrorsBySeverity(minSeverity, limit = 10) {
    const severityOrder = {
      [ErrorSeverity.INFO]: 0,
      [ErrorSeverity.WARNING]: 1,
      [ErrorSeverity.ERROR]: 2,
      [ErrorSeverity.CRITICAL]: 3
    };
    
    const minLevel = severityOrder[minSeverity] || 0;
    const filtered = this.errors.filter(err => 
      severityOrder[err.severity] >= minLevel
    );
    
    return filtered.slice(-limit);
  }
  
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      bySeverity: {}
    };
    
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });
    
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });
    
    this.errors.forEach(err => {
      stats.byType[err.type] = (stats.byType[err.type] || 0) + 1;
      stats.bySeverity[err.severity] = (stats.bySeverity[err.severity] || 0) + 1;
    });
    
    return stats;
  }
  
  clearErrors() {
    const count = this.errors.length;
    this.errors = [];
    console.log(`[ErrorHandler] 에러 로그 초기화 (${count}개 삭제)`);
  }
}

const errorHandler = new ErrorHandler();

if (typeof self !== 'undefined') {
  self.ErrorHandler = ErrorHandler;
  self.ErrorType = ErrorType;
  self.ErrorSeverity = ErrorSeverity;
  self.errorHandler = errorHandler;
}

if (typeof globalThis !== 'undefined') {
  globalThis.ErrorHandler = ErrorHandler;
  globalThis.ErrorType = ErrorType;
  globalThis.ErrorSeverity = ErrorSeverity;
  globalThis.errorHandler = errorHandler;
}

console.log('[ErrorHandler] ✅ Module loaded');

// =====================================================
// 2. TokenManager 모듈 (통합)
// =====================================================

class TokenManager {
  constructor() {
    this.API_BASE_URL = 'https://api.summarygenie.com';
    this.TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  decodeToken(token) {
    if (!token || typeof token !== 'string') {
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('[TokenManager] Invalid JWT format');
        return null;
      }

      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(payload));
      
      return decoded;
    } catch (error) {
      console.error('[TokenManager] Token decode error:', error);
      return null;
    }
  }

  isTokenExpired(token, threshold = this.TOKEN_REFRESH_THRESHOLD) {
    const decoded = this.decodeToken(token);
    
    if (!decoded || !decoded.exp) {
      return true;
    }

    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    return timeUntilExpiry <= threshold;
  }

  getTimeUntilExpiry(token) {
    const decoded = this.decodeToken(token);
    
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeRemaining = expirationTime - currentTime;

    return Math.max(0, timeRemaining);
  }

  async saveTokens(accessToken, refreshToken) {
    try {
      const tokenData = {
        accessToken,
        refreshToken,
        savedAt: Date.now()
      };

      const decoded = this.decodeToken(accessToken);
      if (decoded && decoded.exp) {
        tokenData.expiresAt = decoded.exp * 1000;
      }

      await chrome.storage.local.set({ tokens: tokenData });
      
      console.log('[TokenManager] ✅ Tokens saved successfully');

      this.scheduleTokenRefresh(accessToken);
      
    } catch (error) {
      console.error('[TokenManager] Save tokens error:', error);
      throw new Error('토큰 저장에 실패했습니다.');
    }
  }

  async getAccessToken() {
    try {
      const result = await chrome.storage.local.get('tokens');
      
      if (!result.tokens || !result.tokens.accessToken) {
        return null;
      }

      return result.tokens.accessToken;
    } catch (error) {
      console.error('[TokenManager] Get access token error:', error);
      return null;
    }
  }

  async getRefreshToken() {
    try {
      const result = await chrome.storage.local.get('tokens');
      
      if (!result.tokens || !result.tokens.refreshToken) {
        return null;
      }

      return result.tokens.refreshToken;
    } catch (error) {
      console.error('[TokenManager] Get refresh token error:', error);
      return null;
    }
  }

  async hasValidToken() {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      return false;
    }

    return !this.isTokenExpired(accessToken);
  }

  async refreshAccessToken() {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshSubscribers.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth()) {
        const error = new Error('Firebase Auth를 사용할 수 없습니다');
        error.code = 'FIREBASE_NOT_AVAILABLE';
        throw error;
      }

      const currentUser = firebase.auth().currentUser;

      if (!currentUser) {
        const error = new Error('로그인이 필요합니다');
        error.code = 'NO_CURRENT_USER';
        throw error;
      }

      console.log('[TokenManager] 🔄 Firebase 토큰 갱신 시작...');

      const newIdToken = await currentUser.getIdToken(true);
      const newRefreshToken = currentUser.refreshToken;

      await this.saveTokens(newIdToken, newRefreshToken);

      console.log('[TokenManager] ✅ 토큰 갱신 성공');

      this.refreshSubscribers.forEach(subscriber => {
        subscriber.resolve(newIdToken);
      });
      this.refreshSubscribers = [];

      return newIdToken;

    } catch (error) {
      console.error('[TokenManager] ❌ 토큰 갱신 실패:', error);

      this.refreshSubscribers.forEach(subscriber => {
        subscriber.reject(error);
      });
      this.refreshSubscribers = [];

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  scheduleTokenRefresh(accessToken) {
    const timeUntilExpiry = this.getTimeUntilExpiry(accessToken);
    
    if (timeUntilExpiry <= 0) {
      console.warn('[TokenManager] Token already expired');
      return;
    }

    const refreshTime = Math.max(
      1,
      Math.floor((timeUntilExpiry - this.TOKEN_REFRESH_THRESHOLD) / 60000)
    );

    chrome.alarms.create('token-refresh', {
      delayInMinutes: refreshTime
    });

    console.log(`[TokenManager] Token refresh scheduled in ${refreshTime} minutes`);
  }

  async clearTokens() {
    try {
      await chrome.storage.local.remove('tokens');
      
      chrome.alarms.clear('token-refresh');
      
      console.log('[TokenManager] Tokens cleared');
    } catch (error) {
      console.error('[TokenManager] Clear tokens error:', error);
      throw new Error('토큰 삭제에 실패했습니다.');
    }
  }

  async getTokenInfo() {
    const accessToken = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();

    if (!accessToken) {
      return { 
        isAuthenticated: false,
        message: '토큰이 없습니다.'
      };
    }

    const decoded = this.decodeToken(accessToken);
    const isExpired = this.isTokenExpired(accessToken);
    const timeUntilExpiry = this.getTimeUntilExpiry(accessToken);

    return {
      isAuthenticated: true,
      isExpired,
      timeUntilExpiry,
      expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
      user: {
        id: decoded?.sub || decoded?.userId,
        email: decoded?.email
      }
    };
  }
}

const tokenManager = new TokenManager();

if (typeof self !== 'undefined') {
  self.TokenManager = TokenManager;
  self.tokenManager = tokenManager;
}

if (typeof globalThis !== 'undefined') {
  globalThis.TokenManager = TokenManager;
  globalThis.tokenManager = tokenManager;
}

console.log('[TokenManager] ✅ Module loaded');

// =====================================================
// 3. Background Service Worker 메인 로직
// =====================================================

console.log('[Background] ✅ Modules loaded successfully');

// ===== 사이트 관리자 =====
class SiteManager {
  constructor() {
    this.specialSites = {
      'twitter.com': { spa: true, waitTime: 3000 },
      'x.com': { spa: true, waitTime: 3000 },
      'facebook.com': { spa: true, waitTime: 3000 },
      'instagram.com': { spa: true, waitTime: 3000 },
      'linkedin.com': { spa: true, waitTime: 2000 },
      'youtube.com': { spa: true, waitTime: 2000 },
      'notion.so': { spa: true, waitTime: 3000, requiresAuth: true },
      'docs.google.com': { requiresAuth: true, limited: true },
      'drive.google.com': { requiresAuth: true },
      'medium.com': { cookieWall: true, waitTime: 2000 },
      'tistory.com': { waitTime: 1500 },
      'blog.naver.com': { iframe: true, waitTime: 2000 },
      'velog.io': { spa: true, waitTime: 1500 },
      'nytimes.com': { paywall: true, waitTime: 2000 },
      'wsj.com': { paywall: true },
      'economist.com': { paywall: true },
      'arxiv.org': { pdf: true },
      'scholar.google.com': { waitTime: 1500 },
      'jstor.org': { requiresAuth: true },
      'ieee.org': { requiresAuth: true },
      'github.com': { spa: true, waitTime: 1500 },
      'gitlab.com': { spa: true, waitTime: 1500 },
      'stackoverflow.com': { waitTime: 1000 }
    };
    
    this.restrictedPatterns = [
      /^chrome:\/\//,
      /^chrome-extension:\/\//,
      /^edge:\/\//,
      /^about:/,
      /^file:\/\//,
      /^moz-extension:\/\//,
      /^safari-extension:\/\//,
      /^javascript:/i,
      /^data:/i,
      /^vbscript:/i
    ];
  }
  
  getSiteInfo(url) {
    try {
      if (!url) {
        return { type: 'unknown' };
      }
      
      if (typeof url !== 'string') {
        console.warn('[Security] Invalid URL type:', typeof url);
        return { type: 'unknown' };
      }
      
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      for (const [site, info] of Object.entries(this.specialSites)) {
        if (hostname.includes(site)) {
          return { ...info, site, hostname };
        }
      }
      
      return { hostname, type: 'generic' };
    } catch (error) {
      console.error('[Security] URL 파싱 오류:', error.message);
      errorHandler.handle(error, 'get-site-info');
      return { type: 'unknown' };
    }
  }
  
  isRestricted(url) {
    if (!url || typeof url !== 'string') {
      return true;
    }
    return this.restrictedPatterns.some(pattern => pattern.test(url));
  }
  
  getWaitTime(url) {
    const siteInfo = this.getSiteInfo(url);
    const waitTime = siteInfo.waitTime || 1000;
    return Math.min(waitTime, 10000);
  }
}

// ===== 콘텐츠 스크립트 관리자 =====
class ContentScriptManager {
  constructor() {
    this.injectedTabs = new Set();
    this.pendingInjections = new Map();
  }
  
  async inject(tabId, files = ['content.js'], css = ['content-styles.css']) {
    if (!Number.isInteger(tabId) || tabId < 0) {
      console.error('[Security] Invalid tabId:', tabId);
      const error = new Error('Invalid tab ID');
      errorHandler.handle(error, 'inject-content-script');
      throw error;
    }
    
    if (this.injectedTabs.has(tabId)) {
      console.log(`탭 ${tabId}: 이미 주입됨`);
      return true;
    }
    
    if (this.pendingInjections.has(tabId)) {
      console.log(`탭 ${tabId}: 주입 대기 중`);
      return this.pendingInjections.get(tabId);
    }
    
    const injectionPromise = this.performInjection(tabId, files, css);
    this.pendingInjections.set(tabId, injectionPromise);
    
    try {
      await injectionPromise;
      this.injectedTabs.add(tabId);
      this.pendingInjections.delete(tabId);
      return true;
    } catch (error) {
      this.pendingInjections.delete(tabId);
      errorHandler.handle(error, 'content-script-injection');
      throw error;
    }
  }
  
  async performInjection(tabId, jsFiles, cssFiles) {
    try {
      const tab = await chrome.tabs.get(tabId);
      
      if (!tab.url || siteManager.isRestricted(tab.url)) {
        throw new Error('제한된 URL');
      }
      
      if (tab.status !== 'complete') {
        await this.waitForTabComplete(tabId);
      }
      
      if (cssFiles && cssFiles.length > 0) {
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: cssFiles
        });
      }
      
      await chrome.scripting.executeScript({
        target: { tabId },
        files: jsFiles
      });
      
      console.log(`탭 ${tabId}: 스크립트 주입 완료`);
      
      const waitTime = siteManager.getWaitTime(tab.url);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      return true;
    } catch (error) {
      console.error(`탭 ${tabId} 주입 실패:`, error.message);
      throw error;
    }
  }
  
  async waitForTabComplete(tabId, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkTab = async () => {
        try {
          const tab = await chrome.tabs.get(tabId);
          
          if (tab.status === 'complete') {
            resolve();
            return;
          }
          
          if (Date.now() - startTime > timeout) {
            reject(new Error('탭 로드 타임아웃'));
            return;
          }
          
          setTimeout(checkTab, 500);
        } catch (error) {
          reject(error);
        }
      };
      
      checkTab();
    });
  }
  
  async check(tabId) {
    if (!this.injectedTabs.has(tabId)) {
      return false;
    }
    
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return response && response.success;
    } catch (error) {
      this.injectedTabs.delete(tabId);
      return false;
    }
  }
  
  cleanup(tabId) {
    this.injectedTabs.delete(tabId);
    this.pendingInjections.delete(tabId);
  }
  
  reset() {
    this.injectedTabs.clear();
    this.pendingInjections.clear();
  }
}

// ===== 추출 작업 관리자 =====
class ExtractionManager {
  constructor() {
    this.activeExtractions = new Map();
    this.extractionHistory = [];
    this.maxHistorySize = 100;
  }
  
  async startExtraction(tabId, options = {}) {
    const validatedOptions = this.validateExtractionOptions(options);
    
    if (this.activeExtractions.has(tabId)) {
      console.log(`탭 ${tabId}: 이미 추출 중`);
      return this.activeExtractions.get(tabId);
    }
    
    const extraction = this.performExtraction(tabId, validatedOptions);
    this.activeExtractions.set(tabId, extraction);
    
    try {
      const result = await extraction;
      this.addToHistory(tabId, result);
      this.activeExtractions.delete(tabId);
      return result;
    } catch (error) {
      this.activeExtractions.delete(tabId);
      errorHandler.handle(error, 'extraction');
      throw error;
    }
  }
  
  validateExtractionOptions(options) {
    const defaults = {
      includeImages: true,
      includeTables: true,
      includeCode: true,
      maxScrolls: 3
    };
    
    const validated = { ...defaults };
    
    if (typeof options.includeImages === 'boolean') {
      validated.includeImages = options.includeImages;
    }
    if (typeof options.includeTables === 'boolean') {
      validated.includeTables = options.includeTables;
    }
    if (typeof options.includeCode === 'boolean') {
      validated.includeCode = options.includeCode;
    }
    if (typeof options.maxScrolls === 'number' && options.maxScrolls >= 0 && options.maxScrolls <= 10) {
      validated.maxScrolls = options.maxScrolls;
    }
    
    return validated;
  }
  
  async performExtraction(tabId, options) {
    try {
      const tab = await chrome.tabs.get(tabId);
      console.log('추출 시작:', tab.url.substring(0, 50) + '...');
      
      const isInjected = await contentScriptManager.check(tabId);
      if (!isInjected) {
        await contentScriptManager.inject(tabId);
      }
      
      const siteInfo = siteManager.getSiteInfo(tab.url);
      
      if (siteInfo.requiresAuth) {
        console.warn('인증이 필요한 사이트:', siteInfo.site);
      }
      
      if (siteInfo.paywall) {
        console.warn('페이월 사이트:', siteInfo.site);
      }
      
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'extractContent',
        options: options
      });
      
      if (!response || !response.success) {
        throw new Error(response?.error || '콘텐츠 추출 실패');
      }
      
      if (!response.content || response.content.length < 50) {
        throw new Error('추출된 콘텐츠가 너무 짧습니다');
      }
      
      return {
        ...response,
        tabId,
        url: tab.url,
        title: tab.title,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('추출 오류:', error.message);
      
      try {
        const fallbackResult = await this.fallbackExtraction(tabId);
        return fallbackResult;
      } catch (fallbackError) {
        errorHandler.handle(error, 'perform-extraction');
        throw error;
      }
    }
  }
  
  async fallbackExtraction(tabId) {
    console.log('폴백 추출 시도');
    
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const content = document.body.innerText || document.body.textContent || '';
        const title = document.title;
        const url = window.location.href;
        
        return {
          content: content.substring(0, 10000),
          metadata: { title, url },
          stats: {
            wordCount: content.split(/\s+/).length,
            charCount: content.length,
            extractionMethod: { type: 'fallback' }
          }
        };
      }
    });
    
    if (result && result[0] && result[0].result) {
      return {
        success: true,
        ...result[0].result,
        tabId,
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error('폴백 추출도 실패');
  }
  
  addToHistory(tabId, result) {
    this.extractionHistory.unshift({
      tabId,
      url: result.url,
      title: result.title,
      timestamp: result.timestamp,
      stats: result.stats
    });
    
    if (this.extractionHistory.length > this.maxHistorySize) {
      this.extractionHistory = this.extractionHistory.slice(0, this.maxHistorySize);
    }
    
    this.saveHistory();
  }
  
  async saveHistory() {
    try {
      await chrome.storage.local.set({
        extractionHistory: this.extractionHistory.slice(0, 20)
      });
    } catch (error) {
      console.error('히스토리 저장 실패:', error.message);
      errorHandler.handle(error, 'save-extraction-history');
    }
  }
  
  async loadHistory() {
    try {
      const result = await chrome.storage.local.get('extractionHistory');
      if (result.extractionHistory) {
        this.extractionHistory = result.extractionHistory;
      }
    } catch (error) {
      console.error('히스토리 로드 실패:', error.message);
      errorHandler.handle(error, 'load-extraction-history');
    }
  }
}

// ===== PDF Offscreen Document 관리자 =====
class PDFOffscreenManager {
  constructor() {
    this.offscreenDocumentPath = 'pdf-offscreen.html';
    this.isCreating = false;
    this.creationPromise = null;
  }

  async hasOffscreenDocument() {
    try {
      if (!chrome.offscreen) {
        console.warn('[PDF Offscreen] Offscreen API 사용 불가 (Chrome 114+ 필요)');
        return false;
      }

      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(this.offscreenDocumentPath)]
      });

      return existingContexts.length > 0;
    } catch (error) {
      console.error('[PDF Offscreen] 문서 확인 오류:', error);
      return false;
    }
  }

  async waitForOffscreenReady(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('timeout')), 1000);
          
          chrome.runtime.sendMessage(
            { action: 'offscreenReady' },
            (response) => {
              clearTimeout(timer);
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              resolve(response);
            }
          );
        });
        
        if (response && response.ready) {
          console.log('[PDF Offscreen] ✅ Document 준비 완료');
          return true;
        }
      } catch (error) {
        console.log('[PDF Offscreen] 준비 대기 중...', Date.now() - startTime, 'ms');
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    throw new Error('Offscreen Document 준비 타임아웃');
  }

  async createOffscreenDocument() {
    if (this.isCreating && this.creationPromise) {
      console.log('[PDF Offscreen] 이미 생성 중...');
      return this.creationPromise;
    }

    if (await this.hasOffscreenDocument()) {
      console.log('[PDF Offscreen] 이미 존재함 - Ready 확인 중...');
      await this.waitForOffscreenReady();
      return true;
    }

    if (!chrome.offscreen) {
      throw new Error('Offscreen API를 사용할 수 없습니다. Chrome 114+ 버전을 사용해주세요.');
    }

    this.isCreating = true;
    this.creationPromise = (async () => {
      try {
        console.log('[PDF Offscreen] 문서 생성 시작...');

        await chrome.offscreen.createDocument({
          url: this.offscreenDocumentPath,
          reasons: ['DOM_SCRAPING'],
          justification: 'PDF 파일에서 텍스트를 추출하기 위해 PDF.js 라이브러리를 로드합니다.'
        });

        console.log('[PDF Offscreen] 문서 생성 완료 - Ready 대기 중...');

        await this.waitForOffscreenReady();

        return true;

      } catch (error) {
        console.error('[PDF Offscreen] 문서 생성/준비 실패:', error);
        throw error;
      } finally {
        this.isCreating = false;
        this.creationPromise = null;
      }
    })();

    return this.creationPromise;
  }

  async closeOffscreenDocument() {
    try {
      if (!chrome.offscreen) {
        return;
      }

      if (await this.hasOffscreenDocument()) {
        await chrome.offscreen.closeDocument();
        console.log('[PDF Offscreen] 문서 닫힘');
      }
    } catch (error) {
      console.error('[PDF Offscreen] 문서 닫기 오류:', error);
    }
  }
}

// ===== 토큰 자동 갱신 관리자 =====
class TokenRefreshManager {
  constructor(tokenMgr) {
    this.tokenManager = tokenMgr;
    this.isOnline = true;
    this.lastRefreshAttempt = 0;
    this.MIN_REFRESH_INTERVAL = 60000;
  }

  async setupTokenRefreshAlarm() {
    try {
      await chrome.alarms.clear('token-refresh');
      
      chrome.alarms.create('token-refresh', {
        delayInMinutes: 5,
        periodInMinutes: 5
      });
      
      console.log('[TokenRefresh] Alarm set to check every 5 minutes');
    } catch (error) {
      console.error('[TokenRefresh] Setup alarm error:', error);
      errorHandler.handle(error, 'setup-token-refresh-alarm');
    }
  }

  async checkAndRefreshToken() {
    try {
      if (!tokenManager) {
        console.warn('[TokenRefresh] TokenManager not initialized yet');
        return;
      }

      const now = Date.now();
      
      if (now - this.lastRefreshAttempt < this.MIN_REFRESH_INTERVAL) {
        console.log('[TokenRefresh] Too soon to refresh again');
        return;
      }

      const refreshToken = await tokenManager.getRefreshToken();
      
      if (!refreshToken) {
        return;
      }

      const hasValidToken = await tokenManager.hasValidToken();
      
      if (!hasValidToken) {
        console.log('[TokenRefresh] Token expired, attempting refresh...');
        
        this.lastRefreshAttempt = now;
        
        try {
          await tokenManager.refreshAccessToken();
          console.log('[TokenRefresh] Token refreshed successfully');
          this.notifyTokenRefreshSuccess();
          
        } catch (refreshError) {
          console.error('[TokenRefresh] Refresh failed:', refreshError);
          this.notifyTokenRefreshFailure();
          errorHandler.handle(refreshError, 'auto-refresh-token');
        }
      } else {
        console.log('[TokenRefresh] Token is still valid');
      }
    } catch (error) {
      console.error('[TokenRefresh] Check and refresh error:', error);
      errorHandler.handle(error, 'check-and-refresh-token');
    }
  }

  notifyTokenRefreshSuccess() {
    console.log('[TokenRefresh] Token auto-refreshed successfully');
  }

  notifyTokenRefreshFailure() {
    chrome.notifications.create('token-refresh-failed', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SummaryGenie 인증 만료',
      message: '로그인이 필요합니다. 다시 로그인해주세요.',
      priority: 2
    });
  }

  openLoginPage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('auth.html')
    });
  }
}

// ===== 전역 인스턴스 생성 =====
const siteManager = new SiteManager();
const contentScriptManager = new ContentScriptManager();
const extractionManager = new ExtractionManager();
const pdfOffscreenManager = new PDFOffscreenManager();
const tokenRefreshManager = new TokenRefreshManager(tokenManager);

console.log('[Background] ✅ All managers initialized');

// =====================================================
// ✨ 4. Firebase Auth 자동 복구 (v5.0.0 추가)
// =====================================================

/**
 * Firebase 초기화 대기 헬퍼 함수
 * Service Worker 재시작 시 Firebase가 아직 로드되지 않았을 수 있음
 * @param {number} timeout - 최대 대기 시간 (밀리초)
 * @returns {Promise<boolean>}
 */
async function waitForFirebase(timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      if (typeof firebase !== 'undefined' && 
          firebase.auth && 
          firebase.auth()) {
        console.log('[Background] ✅ Firebase 준비 완료');
        return true;
      }
    } catch (error) {
      // Firebase 아직 로드 안 됨
    }
    
    // 100ms 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn('[Background] ⚠️ Firebase 초기화 타임아웃');
  return false;
}

// ===== Service Worker 이벤트 핸들러 =====

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('SummaryGenie Enhanced 설치:', details.reason);
  
  try {
    if (details.reason === 'install') {
      await chrome.storage.local.set({
        settings: {
          language: 'ko',
          includeImages: true,
          includeTables: true,
          includeCode: true,
          maxScrolls: 3,
          autoExtract: false,
          useProxy: true,
          proxyUrl: 'http://localhost:3000/api/chat'
        }
      });
      
      createContextMenus();
      
      await tokenRefreshManager.setupTokenRefreshAlarm();
    } else if (details.reason === 'update') {
      contentScriptManager.reset();
      
      await tokenRefreshManager.setupTokenRefreshAlarm();
    }
    
    await extractionManager.loadHistory();
  } catch (error) {
    console.error('설치/업데이트 처리 오류:', error);
    errorHandler.handle(error, 'on-installed');
  }
});

// ✨ Service Worker 재시작 시 Firebase Auth 복구
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] 🔵 Service Worker 재시작 - Firebase Auth 복구 시작');
  
  try {
    // 1. Firebase 초기화 대기
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
      console.warn('[Background] ⚠️ Firebase 초기화 실패');
      return;
    }
    
    // 2. Firebase 로그인 상태 확인
    const currentUser = firebase.auth().currentUser;
    
    if (currentUser) {
      console.log('[Background] ✅ Firebase 로그인 상태 복구:', currentUser.email);
      
      try {
        // 3. 토큰 갱신 (force refresh)
        const newIdToken = await currentUser.getIdToken(true);
        const refreshToken = currentUser.refreshToken;
        
        // 4. TokenManager에 저장
        await tokenManager.saveTokens(newIdToken, refreshToken);
        
        console.log('[Background] ✅ 세션 복구 완료');
        
        // 토큰 정보 로깅
        const tokenInfo = await tokenManager.getTokenInfo();
        console.log('[Background] 토큰 만료:', tokenInfo.expiresAt);
        console.log('[Background] 남은 시간:', Math.floor(tokenInfo.timeUntilExpiry / 60000), '분');
        
      } catch (tokenError) {
        console.error('[Background] ⚠️ 토큰 갱신 실패:', tokenError.message);
      }
      
    } else {
      console.log('[Background] ℹ️ 로그인 상태 없음 (정상)');
      
      // Chrome Storage에서 토큰 확인
      const result = await chrome.storage.local.get('tokens');
      if (result.tokens) {
        console.log('[Background] ⚠️ Chrome Storage에 토큰 있으나 Firebase 세션 없음');
        console.log('[Background] 토큰 정보:', {
          hasAccessToken: !!result.tokens.accessToken,
          hasRefreshToken: !!result.tokens.refreshToken,
          savedAt: new Date(result.tokens.savedAt).toISOString()
        });
      }
    }
    
  } catch (error) {
    console.error('[Background] ❌ 세션 복구 실패:', error);
    errorHandler.handle(error, 'firebase-auth-recovery');
  }
  
  // 5. Token Refresh Alarm 재설정
  try {
    await tokenRefreshManager.setupTokenRefreshAlarm();
    console.log('[Background] ✅ Token Refresh Alarm 재설정 완료');
  } catch (alarmError) {
    console.error('[Background] ⚠️ Alarm 설정 실패:', alarmError);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'token-refresh') {
    console.log('[Alarm] Token refresh alarm triggered');
    await tokenRefreshManager.checkAndRefreshToken();
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    console.log('[Background] 액션 클릭 감지, Side Panel 열기');
    
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } else {
      console.warn('[Background] Side Panel API 사용 불가, Chrome 114+ 필요');
      chrome.tabs.create({
        url: chrome.runtime.getURL('sidepanel.html')
      });
    }
    
  } catch (error) {
    console.error('[Background] Side Panel 열기 오류:', error);
    errorHandler.handle(error, 'open-side-panel');
  }
});

function createContextMenus() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'extract-content',
        title: '페이지 콘텐츠 추출',
        contexts: ['page']
      });
      
      chrome.contextMenus.create({
        id: 'extract-selection',
        title: '선택 영역 추출',
        contexts: ['selection']
      });
      
      chrome.contextMenus.create({
        type: 'separator',
        contexts: ['page', 'selection']
      });
      
      chrome.contextMenus.create({
        id: 'extract-with-images',
        title: '이미지 포함 추출',
        contexts: ['page']
      });
      
      chrome.contextMenus.create({
        id: 'extract-simplified',
        title: '간단 추출 (텍스트만)',
        contexts: ['page']
      });
      
      chrome.contextMenus.create({
        type: 'separator',
        contexts: ['page']
      });
      
      chrome.contextMenus.create({
        id: 'open-side-panel',
        title: 'SummaryGenie Side Panel 열기',
        contexts: ['page']
      });
    });
  } catch (error) {
    console.error('컨텍스트 메뉴 생성 오류:', error);
    errorHandler.handle(error, 'create-context-menus');
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;
  
  try {
    if (info.menuItemId === 'open-side-panel') {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } else {
        console.warn('[Background] Side Panel API 사용 불가');
        chrome.tabs.create({
          url: chrome.runtime.getURL('sidepanel.html')
        });
      }
      return;
    }
    
    let options = {};
    
    switch (info.menuItemId) {
      case 'extract-content':
        options = { includeImages: true, includeTables: true };
        break;
        
      case 'extract-selection':
        const selectionText = info.selectionText ? 
          info.selectionText.substring(0, 5000) : '';
        options = { selection: selectionText };
        break;
        
      case 'extract-with-images':
        options = { includeImages: true, enrichImages: true };
        break;
        
      case 'extract-simplified':
        options = { includeImages: false, includeTables: false, includeCode: false };
        break;
    }
    
    const result = await extractionManager.startExtraction(tab.id, options);
    
    chrome.runtime.sendMessage({
      action: 'extractionComplete',
      data: result
    });
    
  } catch (error) {
    console.error('추출 오류:', error.message);
    errorHandler.handle(error, 'context-menu-click');
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '콘텐츠 추출 실패',
      message: '콘텐츠 추출 중 오류가 발생했습니다.'
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] 메시지 수신:', request.action);
  
  try {
    switch (request.action) {
      case 'ping':
        // ✨ Keep-Alive 응답 강화 + Firebase Auth 상태 확인
        console.log('[Background] 🔵 Ping 받음 - Service Worker 활성 상태 유지');
        
        // Firebase Auth 상태 확인
        let authStatus = 'unknown';
        let userEmail = null;
        
        try {
          if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth()) {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
              authStatus = 'authenticated';
              userEmail = currentUser.email;
            } else {
              authStatus = 'not_authenticated';
            }
          } else {
            authStatus = 'firebase_not_loaded';
          }
        } catch (error) {
          authStatus = 'error';
          console.error('[Background] Firebase Auth 상태 확인 오류:', error);
        }
        
        sendResponse({ 
          success: true, 
          message: 'pong', 
          timestamp: Date.now(),
          authStatus: authStatus,
          userEmail: userEmail
        });
        break;
        
      case 'extractContent':
        handleExtractContent(request, sender, sendResponse);
        return true;
        
      case 'checkContentScript':
        handleCheckContentScript(request, sender, sendResponse);
        return true;
        
      case 'getExtractionHistory':
        sendResponse({
          success: true,
          history: extractionManager.extractionHistory
        });
        break;
        
      case 'getSiteInfo':
        handleGetSiteInfo(request, sender, sendResponse);
        break;
        
      case 'injectContentScript':
        handleInjectContentScript(request, sender, sendResponse);
        return true;

      case 'openLoginPage':
        tokenRefreshManager.openLoginPage();
        sendResponse({ success: true });
        break;

      case 'checkTokenStatus':
        handleCheckTokenStatus(request, sender, sendResponse);
        return true;

      case 'refreshToken':
        handleRefreshToken(request, sender, sendResponse);
        return true;

      case 'logout':
        handleLogout(request, sender, sendResponse);
        return true;
        
      case 'openSidePanel':
        handleOpenSidePanel(request, sender, sendResponse);
        return true;

      case 'extractPDF':
        handleExtractPDF(request, sender, sendResponse);
        return true;
    }
  } catch (error) {
    console.error('[Background] 메시지 핸들러 오류:', error);
    errorHandler.handle(error, 'message-handler');
    sendResponse({ success: false, error: error.message });
  }
  
  return false; 
});

async function handleExtractContent(request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id;
    
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      if (!activeTab) {
        throw new Error('활성 탭을 찾을 수 없습니다');
      }
      
      const result = await extractionManager.startExtraction(
        activeTab.id, 
        request.options
      );
      sendResponse({ success: true, ...result });
    } else {
      const result = await extractionManager.startExtraction(
        tabId, 
        request.options
      );
      sendResponse({ success: true, ...result });
    }
  } catch (error) {
    errorHandler.handle(error, 'handle-extract-content');
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

async function handleCheckContentScript(request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id;
    const isInjected = await contentScriptManager.check(tabId);
    
    sendResponse({ 
      success: true, 
      injected: isInjected 
    });
  } catch (error) {
    errorHandler.handle(error, 'check-content-script');
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

function handleGetSiteInfo(request, sender, sendResponse) {
  try {
    const url = request.url || sender.tab?.url;
    const siteInfo = siteManager.getSiteInfo(url);
    const isRestricted = siteManager.isRestricted(url);
    
    sendResponse({
      success: true,
      siteInfo,
      isRestricted
    });
  } catch (error) {
    errorHandler.handle(error, 'get-site-info');
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

async function handleInjectContentScript(request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id;
    await contentScriptManager.inject(tabId);
    
    sendResponse({ success: true });
  } catch (error) {
    errorHandler.handle(error, 'inject-content-script-handler');
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

async function handleCheckTokenStatus(request, sender, sendResponse) {
  try {
    const tokenInfo = await tokenManager.getTokenInfo();
    sendResponse({ 
      success: true, 
      tokenInfo 
    });
  } catch (error) {
    errorHandler.handle(error, 'check-token-status');
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

async function handleRefreshToken(request, sender, sendResponse) {
  try {
    const newToken = await tokenManager.refreshAccessToken();
    sendResponse({ 
      success: true, 
      accessToken: newToken 
    });
  } catch (error) {
    errorHandler.handle(error, 'handle-refresh-token');
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

async function handleLogout(request, sender, sendResponse) {
  try {
    console.log('[Background] 로그아웃 처리 시작');
    
    await tokenManager.clearTokens();
    
    await chrome.alarms.clear('token-refresh');
    
    console.log('[Background] 로그아웃 완료');
    
    sendResponse({ 
      success: true,
      message: '로그아웃되었습니다.'
    });
  } catch (error) {
    console.error('[Background] 로그아웃 오류:', error);
    errorHandler.handle(error, 'handle-logout');
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

async function handleOpenSidePanel(request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id;
    
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      if (!activeTab) {
        throw new Error('활성 탭을 찾을 수 없습니다');
      }
      
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ windowId: activeTab.windowId });
      } else {
        chrome.tabs.create({
          url: chrome.runtime.getURL('sidepanel.html')
        });
      }
    } else {
      const tab = await chrome.tabs.get(tabId);
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } else {
        chrome.tabs.create({
          url: chrome.runtime.getURL('sidepanel.html')
        });
      }
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Background] Side Panel 열기 오류:', error);
    errorHandler.handle(error, 'open-side-panel-handler');
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * ✨ PDF 추출 핸들러 (타임아웃 180초 + 진행 상황 중계)
 */
async function handleExtractPDF(request, sender, sendResponse) {
  console.log('[Background] PDF 추출 요청 받음:', request.url);
  
  sendResponse({
    success: true,
    status: 'processing',
    message: 'PDF 추출을 시작합니다...'
  });
  
  processPDFExtraction(request, sender).catch(error => {
    console.error('[Background] PDF 처리 중 오류:', error);
  });
}

/**
 * ✨ 실제 PDF 처리 로직
 */
async function processPDFExtraction(request, sender) {
  try {
    console.log('[Background] PDF 처리 시작:', request.url);

    if (!request.url) {
      sendProgressUpdate(sender, {
        stage: 'error',
        progress: 0,
        message: 'PDF URL이 제공되지 않았습니다.'
      });
      return;
    }

    sendProgressUpdate(sender, {
      stage: 'download',
      progress: 10,
      message: 'PDF 파일 다운로드 중...'
    });

    console.log('[Background] PDF 다운로드 중...');
    
    let pdfData;
    try {
      const response = await fetch(request.url);
      
      if (!response.ok) {
        throw new Error(`PDF 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      pdfData = Array.from(new Uint8Array(arrayBuffer));
      
      console.log(`[Background] PDF 다운로드 완료: ${pdfData.length} bytes`);
      
      sendProgressUpdate(sender, {
        stage: 'download',
        progress: 30,
        message: 'PDF 다운로드 완료!'
      });
      
    } catch (fetchError) {
      console.error('[Background] PDF 다운로드 실패:', fetchError);
      
      sendProgressUpdate(sender, {
        stage: 'error',
        progress: 0,
        message: 'PDF 다운로드 실패'
      });
      
      throw new Error(`PDF 파일을 가져올 수 없습니다: ${fetchError.message}`);
    }

    sendProgressUpdate(sender, {
      stage: 'offscreen',
      progress: 40,
      message: 'PDF 처리 도구 준비 중...'
    });

    await pdfOffscreenManager.createOffscreenDocument();

    sendProgressUpdate(sender, {
      stage: 'extract',
      progress: 50,
      message: 'PDF 텍스트 추출 시작...'
    });

    console.log('[Background] Offscreen에 데이터 전송 중...');

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PDF 추출 시간 초과 (180초)'));
      }, 180000);

      chrome.runtime.sendMessage(
        {
          action: 'extractPDFFromOffscreen',
          pdfData: pdfData,
          url: request.url
        },
        (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(`메시지 전송 실패: ${chrome.runtime.lastError.message}`));
            return;
          }
          
          if (!response) {
            reject(new Error('Offscreen Document로부터 응답이 없습니다.'));
            return;
          }
          
          resolve(response);
        }
      );
    });

    sendProgressUpdate(sender, {
      stage: 'complete',
      progress: 100,
      message: 'PDF 추출 완료!'
    });

    console.log('[Background] PDF 추출 성공');

    console.log('[Background] 최종 결과 전송 중...');
    chrome.runtime.sendMessage({
      action: 'pdfExtractionComplete',
      result: result
    }).then(() => {
      console.log('[Background] ✅ 최종 결과 전송 완료');
    }).catch(err => {
      console.warn('[Background] ⚠️ 최종 결과 전송 실패:', err.message);
    });

  } catch (error) {
    console.error('[Background] PDF 추출 실패:', error);
    errorHandler.handle(error, 'extract-pdf');

    sendProgressUpdate(sender, {
      stage: 'error',
      progress: 0,
      message: error.message
    });
    
    console.log('[Background] 에러 결과 전송 중...');
    chrome.runtime.sendMessage({
      action: 'pdfExtractionComplete',
      result: {
        success: false,
        error: error.message
      }
    }).catch(err => {
      console.warn('[Background] ⚠️ 에러 전송 실패:', err.message);
    });
  }
}

/**
 * ✨ 진행 상황 업데이트 전송
 */
function sendProgressUpdate(sender, data) {
  try {
    if (sender && sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'pdfProgress',
        data: data
      }).catch(err => {
        console.warn('[Background] 진행 상황 전송 실패:', err.message);
      });
    }
  } catch (error) {
    console.warn('[Background] 진행 상황 전송 오류:', error.message);
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.url) {
      console.log('URL 변경 감지');
      contentScriptManager.cleanup(tabId);
    }
    
    if (changeInfo.status === 'complete') {
      const settings = await chrome.storage.local.get('settings');
      
      if (settings.settings?.autoExtract && !siteManager.isRestricted(tab.url)) {
        try {
          const result = await extractionManager.startExtraction(tabId, {
            auto: true
          });
          console.log('자동 추출 완료');
        } catch (error) {
          console.error('자동 추출 실패:', error.message);
          errorHandler.handle(error, 'auto-extraction');
        }
      }
    }
  } catch (error) {
    console.error('탭 업데이트 처리 오류:', error);
    errorHandler.handle(error, 'tab-updated');
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  contentScriptManager.cleanup(tabId);
  extractionManager.activeExtractions.delete(tabId);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    const siteInfo = siteManager.getSiteInfo(tab.url);
    if (siteInfo.spa) {
      const isInjected = await contentScriptManager.check(activeInfo.tabId);
      if (!isInjected && !siteManager.isRestricted(tab.url)) {
        await contentScriptManager.inject(activeInfo.tabId);
      }
    }
  } catch (error) {
    console.error('탭 활성화 처리 오류:', error.message);
    errorHandler.handle(error, 'tab-activated');
  }
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('[Background] Service Worker 종료 중...');
  pdfOffscreenManager.closeOffscreenDocument();
});

console.log('🚀 SummaryGenie Enhanced Background Service 시작 완료 (v5.0.0 - Firebase Auth 자동 복구)');