/**
 * extension\modules\token-manager.js
 * JWT 토큰 관리 모듈
 * Access Token과 Refresh Token의 저장, 조회, 검증, 갱신을 담당
 * 
 * @version 2.0.0 - Firebase SDK 기반 토큰 갱신
 * 
 * ✨ v2.0.0 주요 변경사항:
 * - refreshAccessToken() 함수를 Firebase SDK 사용으로 변경
 * - 백엔드 API 호출 제거 (/api/auth/refresh 엔드포인트 불필요)
 * - Firebase 자동 토큰 갱신 활용
 * 
 * Universal Module: 브라우저 환경과 Service Worker 모두 지원
 */

class TokenManager {
  constructor() {
    this.API_BASE_URL = 'https://api.summarygenie.com'; // 환경변수로 관리
    this.TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5분 (밀리초)
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  /**
   * JWT 토큰 디코딩 (페이로드 추출)
   * @param {string} token - JWT 토큰
   * @returns {Object|null} - 디코딩된 페이로드 또는 null
   */
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

      // Base64 디코딩 (URL-safe)
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(payload));
      
      return decoded;
    } catch (error) {
      console.error('[TokenManager] Token decode error:', error);
      return null;
    }
  }

  /**
   * 토큰 만료 여부 확인
   * @param {string} token - JWT 토큰
   * @param {number} threshold - 만료 임박 기준 시간 (밀리초, 기본값: 5분)
   * @returns {boolean} - 만료되었거나 임박하면 true
   */
  isTokenExpired(token, threshold = this.TOKEN_REFRESH_THRESHOLD) {
    const decoded = this.decodeToken(token);
    
    if (!decoded || !decoded.exp) {
      return true;
    }

    const expirationTime = decoded.exp * 1000; // 초 → 밀리초 변환
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    // 만료되었거나 임박한 경우 true 반환
    return timeUntilExpiry <= threshold;
  }

  /**
   * 토큰 만료까지 남은 시간 계산 (밀리초)
   * @param {string} token - JWT 토큰
   * @returns {number} - 남은 시간 (밀리초), 만료된 경우 0
   */
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

  /**
   * Access Token과 Refresh Token 저장
   * @param {string} accessToken - 액세스 토큰
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise<void>}
   */
  async saveTokens(accessToken, refreshToken) {
    try {
      const tokenData = {
        accessToken,
        refreshToken,
        savedAt: Date.now()
      };

      // 토큰 만료 시간 저장 (알람 설정용)
      const decoded = this.decodeToken(accessToken);
      if (decoded && decoded.exp) {
        tokenData.expiresAt = decoded.exp * 1000;
      }

      await chrome.storage.local.set({ tokens: tokenData });
      
      console.log('[TokenManager] ✅ Tokens saved successfully');

      // 토큰 갱신 알람 설정
      this.scheduleTokenRefresh(accessToken);
      
    } catch (error) {
      console.error('[TokenManager] Save tokens error:', error);
      throw new Error('토큰 저장에 실패했습니다.');
    }
  }

  /**
   * Access Token 조회
   * @returns {Promise<string|null>} - 액세스 토큰 또는 null
   */
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

  /**
   * Refresh Token 조회
   * @returns {Promise<string|null>} - 리프레시 토큰 또는 null
   */
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

  /**
   * 현재 저장된 토큰이 유효한지 확인
   * @returns {Promise<boolean>} - 유효하면 true
   */
  async hasValidToken() {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      return false;
    }

    return !this.isTokenExpired(accessToken);
  }

  /**
   * ✨ Access Token 갱신 - Firebase SDK 사용
   * 
   * @returns {Promise<string>} - 새로운 액세스 토큰
   * @throws {Error} - 갱신 실패시
   * 
   * ✨ v2.0.0 주요 변경:
   * - 백엔드 API 호출 제거 (/api/auth/refresh 엔드포인트 불필요)
   * - Firebase SDK의 getIdToken(true) 사용
   * - Firebase가 자동으로 토큰 갱신 처리
   */
  async refreshAccessToken() {
    // 이미 갱신 중이면 기다림 (동시 갱신 방지)
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshSubscribers.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      // ✨ 1. Firebase Auth 객체 확인
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth()) {
        const error = new Error('Firebase Auth를 사용할 수 없습니다');
        error.code = 'FIREBASE_NOT_AVAILABLE';
        throw error;
      }

      // ✨ 2. 현재 로그인한 사용자 확인
      const currentUser = firebase.auth().currentUser;

      if (!currentUser) {
        // Firebase에 로그인 안 된 상태
        const error = new Error('로그인이 필요합니다');
        error.code = 'NO_CURRENT_USER';
        throw error;
      }

      console.log('[TokenManager] 🔄 Firebase 토큰 갱신 시작...');

      // ✨ 3. Firebase SDK로 토큰 강제 갱신 (force refresh)
      const newIdToken = await currentUser.getIdToken(true);

      // ✨ 4. 새 Refresh Token도 가져오기
      const newRefreshToken = currentUser.refreshToken;

      // ✨ 5. 새 토큰 저장
      await this.saveTokens(newIdToken, newRefreshToken);

      console.log('[TokenManager] ✅ 토큰 갱신 성공');

      // 대기 중인 요청들에게 새 토큰 전달
      this.refreshSubscribers.forEach(subscriber => {
        subscriber.resolve(newIdToken);
      });
      this.refreshSubscribers = [];

      return newIdToken;

    } catch (error) {
      console.error('[TokenManager] ❌ 토큰 갱신 실패:', error);

      // 대기 중인 요청들에게 에러 전달
      this.refreshSubscribers.forEach(subscriber => {
        subscriber.reject(error);
      });
      this.refreshSubscribers = [];

      // 에러 코드에 따라 적절한 메시지 설정
      if (error.code === 'FIREBASE_NOT_AVAILABLE') {
        throw new Error('Firebase를 초기화할 수 없습니다');
      }
      
      if (error.code === 'NO_CURRENT_USER') {
        throw new Error('로그인이 필요합니다');
      }

      // Firebase 특정 에러
      if (error.code === 'auth/user-token-expired') {
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요');
      }

      if (error.code === 'auth/network-request-failed') {
        throw new Error('네트워크 연결을 확인해주세요');
      }

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 토큰 갱신 알람 예약
   * @param {string} accessToken - 액세스 토큰
   */
  scheduleTokenRefresh(accessToken) {
    const timeUntilExpiry = this.getTimeUntilExpiry(accessToken);
    
    if (timeUntilExpiry <= 0) {
      console.warn('[TokenManager] Token already expired');
      return;
    }

    // 만료 5분 전에 알람 설정 (최소 1분 이상 남은 경우에만)
    const refreshTime = Math.max(
      1, // 최소 1분
      Math.floor((timeUntilExpiry - this.TOKEN_REFRESH_THRESHOLD) / 60000) // 분 단위
    );

    chrome.alarms.create('token-refresh', {
      delayInMinutes: refreshTime
    });

    console.log(`[TokenManager] Token refresh scheduled in ${refreshTime} minutes`);
  }

  /**
   * 모든 토큰 삭제 (로그아웃)
   * @returns {Promise<void>}
   */
  async clearTokens() {
    try {
      await chrome.storage.local.remove('tokens');
      
      // 토큰 갱신 알람 취소
      chrome.alarms.clear('token-refresh');
      
      console.log('[TokenManager] Tokens cleared');
    } catch (error) {
      console.error('[TokenManager] Clear tokens error:', error);
      throw new Error('토큰 삭제에 실패했습니다.');
    }
  }

  /**
   * 토큰 정보 조회 (디버깅용)
   * @returns {Promise<Object>} - 토큰 정보
   */
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
      timeUntilExpiryMinutes: Math.floor(timeUntilExpiry / 60000),
      expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
      hasRefreshToken: !!refreshToken,
      user: {
        id: decoded?.sub || decoded?.userId,
        email: decoded?.email
      }
    };
  }
}

// ===== Universal Export (브라우저 & Service Worker 지원) =====

// 전역 인스턴스 생성
const tokenManager = new TokenManager();

// 브라우저 환경 (window 객체)
if (typeof window !== 'undefined') {
  window.TokenManager = TokenManager;
  window.tokenManager = tokenManager;
}

// Service Worker 환경 (self 객체)
if (typeof self !== 'undefined' && typeof self.importScripts === 'function') {
  self.TokenManager = TokenManager;
  self.tokenManager = tokenManager;
}

// Global 환경
if (typeof globalThis !== 'undefined') {
  globalThis.TokenManager = TokenManager;
  globalThis.tokenManager = tokenManager;
}

console.log('[TokenManager] ✅ Module loaded (v2.0.0 - Firebase SDK)');