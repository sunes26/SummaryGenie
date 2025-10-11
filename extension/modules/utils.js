/**
 * SummaryGenie Utility Functions (단순화 버전)
 * 공통 유틸리티 함수 모음
 * 
 * @module utils
 * @version 2.0.0
 */

// ============================================
// STRING UTILITIES
// ============================================

/**
 * HTML 이스케이프
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 텍스트 자르기
 * @param {string} text - 자를 텍스트
 * @param {number} maxLength - 최대 길이
 * @param {string} suffix - 접미사
 * @returns {string} 잘린 텍스트
 */
function truncateText(text, maxLength, suffix = '...') {
  if (typeof text !== 'string') return '';
  if (typeof maxLength !== 'number' || maxLength < 1) return text;
  
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncatedLength = maxLength - suffix.length;
  return text.substring(0, truncatedLength).trim() + suffix;
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * 상대적 시간 포맷팅 (다국어 지원)
 * @param {string|Date|number} timestamp - 타임스탬프
 * @param {string} language - 언어 코드 (ko, en, ja, zh)
 * @param {Object} messages - 언어별 메시지 객체 (선택)
 * @returns {string} 포맷된 상대 시간
 */
function formatRelativeTime(timestamp, language = 'ko', messages = null) {
  try {
    // 🔧 timestamp가 undefined인 경우 처리
    if (timestamp === undefined || timestamp === null) {
      console.warn('[Utils] formatRelativeTime: timestamp가 없습니다');
      return '';
    }
    
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      console.warn('[Utils] formatRelativeTime: 유효하지 않은 날짜:', timestamp);
      return String(timestamp);
    }
    
    const now = new Date();
    const diff = now - date;
    
    // 기본 메시지 정의
    const defaultMessages = {
      ko: {
        justNow: '방금 전',
        minutesAgo: (n) => `${n}분 전`,
        hoursAgo: (n) => `${n}시간 전`,
        daysAgo: (n) => `${n}일 전`
      },
      en: {
        justNow: 'Just now',
        minutesAgo: (n) => `${n} minute${n > 1 ? 's' : ''} ago`,
        hoursAgo: (n) => `${n} hour${n > 1 ? 's' : ''} ago`,
        daysAgo: (n) => `${n} day${n > 1 ? 's' : ''} ago`
      },
      ja: {
        justNow: 'たった今',
        minutesAgo: (n) => `${n}分前`,
        hoursAgo: (n) => `${n}時間前`,
        daysAgo: (n) => `${n}日前`
      },
      zh: {
        justNow: '刚刚',
        minutesAgo: (n) => `${n}分钟前`,
        hoursAgo: (n) => `${n}小时前`,
        daysAgo: (n) => `${n}天前`
      }
    };
    
    // 사용할 메시지 결정 (파라미터로 전달된 messages 우선)
    const msgs = messages || defaultMessages[language] || defaultMessages.ko;
    
    if (diff < 60000) {
      return typeof msgs.justNow === 'function' ? msgs.justNow() : msgs.justNow;
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return msgs.minutesAgo(minutes);
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return msgs.hoursAgo(hours);
    } else if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return msgs.daysAgo(days);
    } else {
      return formatDate(date, null, language);
    }
  } catch (error) {
    console.error('[Utils] formatRelativeTime 오류:', error, '| timestamp:', timestamp);
    return String(timestamp);
  }
}

/**
 * 날짜 포맷팅 (다국어 지원)
 * @param {string|Date|number} date - 날짜
 * @param {Object} options - Intl.DateTimeFormat 옵션 (선택)
 * @param {string} language - 언어 코드 (선택)
 * @returns {string} 포맷된 날짜
 */
function formatDate(date, options = null, language = 'ko') {
  try {
    // 🔧 date가 undefined인 경우 처리
    if (date === undefined || date === null) {
      console.warn('[Utils] formatDate: date가 없습니다');
      return '';
    }
    
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      console.warn('[Utils] formatDate: 유효하지 않은 날짜:', date);
      return String(date);
    }
    
    // 옵션이 제공된 경우 Intl.DateTimeFormat 사용
    if (options && typeof options === 'object') {
      try {
        const formatter = new Intl.DateTimeFormat(language, options);
        return formatter.format(dateObj);
      } catch (intlError) {
        console.warn('[Utils] Intl.DateTimeFormat 실패, 기본 포맷 사용:', intlError);
      }
    }
    
    // 기본 포맷: YYYY.MM.DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}.${month}.${day}`;
  } catch (error) {
    console.error('[Utils] formatDate 오류:', error, '| date:', date);
    return String(date);
  }
}
/**
 * 오늘 날짜 문자열 반환
 * @returns {string} 오늘 날짜 문자열
 */
function getTodayString() {
  return new Date().toDateString();
}

// ============================================
// NETWORK UTILITIES
// ============================================

/**
 * URL 유효성 검사
 * @param {string} url - 검사할 URL
 * @returns {boolean} URL 유효성 여부
 */
function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * 타임아웃이 있는 fetch 요청
 * @param {string} url - 요청 URL
 * @param {Object} options - fetch 옵션
 * @param {number} timeout - 타임아웃 (밀리초)
 * @returns {Promise<Response>} fetch 응답
 */
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다.');
    }
    throw error;
  }
}

// ============================================
// FUNCTION UTILITIES
// ============================================

/**
 * 디바운스 함수
 * @param {Function} func - 디바운스할 함수
 * @param {number} wait - 대기 시간 (밀리초)
 * @returns {Function} 디바운스된 함수
 */
function debounce(func, wait = 300) {
  if (typeof func !== 'function') {
    throw new Error('첫 번째 인자는 함수여야 합니다');
  }
  
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 쓰로틀 함수
 * @param {Function} func - 쓰로틀할 함수
 * @param {number} wait - 대기 시간 (밀리초)
 * @returns {Function} 쓰로틀된 함수
 */
function throttle(func, wait = 300) {
  if (typeof func !== 'function') {
    throw new Error('첫 번째 인자는 함수여야 합니다');
  }
  
  let isThrottled = false;
  let lastArgs = null;
  
  return function executedFunction(...args) {
    if (isThrottled) {
      lastArgs = args;
      return;
    }
    
    func(...args);
    isThrottled = true;
    
    setTimeout(() => {
      isThrottled = false;
      if (lastArgs) {
        executedFunction(...lastArgs);
        lastArgs = null;
      }
    }, wait);
  };
}

// ============================================
// DATA UTILITIES
// ============================================

/**
 * 딥 클론 (객체 복사)
 * @param {*} obj - 복사할 객체
 * @returns {*} 복사된 객체
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * UTF-8 문자열을 Base64로 인코딩
 * @param {string} str - 인코딩할 문자열
 * @returns {string} Base64 인코딩된 문자열
 */
function utf8ToBase64(str) {
  if (typeof str !== 'string') return '';
  
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (error) {
    console.error('[Utils] Base64 인코딩 실패:', error);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fallback_${Math.abs(hash)}`;
  }
}

// ============================================
// MISCELLANEOUS
// ============================================

/**
 * 제한된 페이지 확인
 * @param {string} url - 확인할 URL
 * @returns {boolean} 제한된 페이지 여부
 */
function isRestrictedPage(url) {
  if (typeof url !== 'string') return true;
  
  const restrictedPatterns = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'file://',
    'chrome.google.com'
  ];
  
  return restrictedPatterns.some(pattern => url.startsWith(pattern));
}

/**
 * 고유 ID 생성
 * @returns {string} 생성된 ID
 */
function generateId() {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 9);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    const cryptoRandom = Array.from(buffer)
      .map(b => b.toString(36))
      .join('');
    return `${timestamp}_${randomPart}_${cryptoRandom}`;
  }
  
  return `${timestamp}_${randomPart}`;
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// 전역 객체에 모든 함수 할당
window.escapeHtml = escapeHtml;
window.truncateText = truncateText;
window.formatRelativeTime = formatRelativeTime;
window.formatDate = formatDate;
window.getTodayString = getTodayString;
window.isValidUrl = isValidUrl;
window.fetchWithTimeout = fetchWithTimeout;
window.debounce = debounce;
window.throttle = throttle;
window.deepClone = deepClone;
window.utf8ToBase64 = utf8ToBase64;
window.isRestrictedPage = isRestrictedPage;
window.generateId = generateId;