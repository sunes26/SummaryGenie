/**
 * extension\modules\history-manager.js
 * SummaryGenie History Manager (Cloud Sync 통합)
 * 로컬 + 클라우드 하이브리드 히스토리 관리
 * 
 * @module history-manager
 * @version 3.0.0
 * @requires storageManager - 스토리지 관리자 (전역)
 * @requires generateId - 유틸리티 함수 (전역)
 * @requires errorHandler - 에러 핸들러 (전역)
 * @requires syncManager - 동기화 관리자 (전역)
 */

/**
 * HistoryManager 클래스
 */
class HistoryManager {
  constructor() {
    this.history = [];
    this.maxHistoryItems = 100;
    this.initialized = false;
    this.cloudSyncEnabled = true;
    
    console.log('[HistoryManager] 초기화 (클라우드 동기화 지원)');
  }
  
  /**
   * 초기화
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      this.history = await window.storageManager.get('summaryHistory', []);
      this.initialized = true;
      console.log(`[HistoryManager] 로드 완료: ${this.history.length}개 항목`);
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.initialize');
      this.history = [];
    }
  }
  
  /**
   * 데이터 저장
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  async persist() {
    try {
      await window.storageManager.set('summaryHistory', this.history);
      return true;
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.persist');
      return false;
    }
  }
  
  /**
   * 히스토리 추가
   * @param {Object} item - 히스토리 항목
   * @returns {Promise<Object>} 추가된 항목
   */
  async addHistory(item) {
    try {
      await this.initialize();
      
      if (!item.title || typeof item.title !== 'string' || item.title.length > 500) {
        throw new Error('유효하지 않은 제목입니다');
      }
      
      if (!item.url || typeof item.url !== 'string') {
        throw new Error('유효하지 않은 URL입니다');
      }
      
      if (!item.summary || typeof item.summary !== 'string' || item.summary.length > 10000) {
        throw new Error('유효하지 않은 요약입니다');
      }
      
      const historyItem = {
        id: window.generateId(),
        title: item.title.trim(),
        url: item.url.trim(),
        summary: item.summary.trim(),
        summaryLength: item.summaryLength || 'medium',
        timestamp: Date.now(),
        qaHistory: item.qaHistory || [],
        pending_sync: false,
        metadata: {
          domain: this.extractDomain(item.url),
          wordCount: this.countWords(item.summary),
          language: item.metadata?.language || 'unknown',
          tags: Array.isArray(item.metadata?.tags) ? item.metadata.tags : [],
          userId: item.metadata?.userId,
          ...item.metadata
        }
      };
      
      this.history.push(historyItem);
      
      if (this.history.length > this.maxHistoryItems) {
        this.history.shift();
      }
      
      await this.persist();
      
      console.log(`[HistoryManager] 로컬 저장: ${historyItem.title}`);
      
      if (this.cloudSyncEnabled) {
        await this.syncToCloud(historyItem);
      }
      
      return historyItem;
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.addHistory');
      throw error;
    }
  }
  
  /**
   * 클라우드 동기화
   * @param {Object} item - 동기화할 항목
   * @returns {Promise<void>}
   */
  async syncToCloud(item) {
    try {
      const networkStatus = await window.syncManager.getNetworkStatus();
      
      if (!networkStatus.isOnline) {
        console.log(`[HistoryManager] 오프라인: 큐에 추가 ${item.id}`);
        item.pending_sync = true;
        await window.syncManager.addToPendingQueue(item);
        await this.updateHistory(item.id, { pending_sync: true });
      } else {
        console.log(`[HistoryManager] 클라우드 동기화 시도: ${item.id}`);
        await window.syncManager.addToPendingQueue(item);
      }
    } catch (error) {
      console.error('[HistoryManager] 클라우드 동기화 오류:', error);
      item.pending_sync = true;
      await this.updateHistory(item.id, { pending_sync: true });
    }
  }
  
/**
 * 클라우드에서 가져오기
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 서버 데이터
 */
async fetchFromCloud(options = {}) {
  try {
    const serverData = await window.syncManager.downloadFromServer(options);
    
    const items = serverData.items?.map(item => {
      // 🔧 createdAt을 timestamp로 변환
      let timestamp;
      if (item.createdAt) {
        // Firestore Timestamp 객체인 경우
        if (typeof item.createdAt === 'object' && item.createdAt._seconds) {
          timestamp = item.createdAt._seconds * 1000;
          console.log(`[HistoryManager] Firestore Timestamp 변환: ${item.id} -> ${timestamp}`);
        } 
        // ISO 문자열인 경우
        else if (typeof item.createdAt === 'string') {
          timestamp = new Date(item.createdAt).getTime(); // 🔧 수정: toISOString() 제거
          console.log(`[HistoryManager] ISO 문자열 변환: ${item.id} -> ${timestamp}`);
        }
        // 이미 숫자인 경우
        else if (typeof item.createdAt === 'number') {
          timestamp = item.createdAt;
          console.log(`[HistoryManager] 숫자 타입: ${item.id} -> ${timestamp}`);
        }
        // 그 외
        else {
          timestamp = Date.now();
          console.warn(`[HistoryManager] 알 수 없는 형식, 현재 시간 사용: ${item.id}`);
        }
      } else {
        timestamp = Date.now();
        console.warn(`[HistoryManager] createdAt 없음, 현재 시간 사용: ${item.id}`);
      }
      
      return {
        id: item.id,
        title: item.title,
        url: item.url,
        summary: item.summary,
        summaryLength: item.summaryLength || 'medium',
        timestamp: timestamp,  // 🔧 올바른 timestamp
        qaHistory: item.qaHistory || [],
        pending_sync: false,
        metadata: {
          domain: this.extractDomain(item.url),
          wordCount: this.countWords(item.summary),
          ...item.metadata
        }
      };
    }) || [];
    
    console.log(`[HistoryManager] 서버에서 ${items.length}개 가져옴`);
    console.log(`[HistoryManager] 첫 번째 아이템 샘플:`, items[0]); // 🔧 추가
    
    return {
      items,
      total: serverData.total || items.length,
      hasMore: serverData.hasMore || false
    };
    
  } catch (error) {
    window.errorHandler.handle(error, 'HistoryManager.fetchFromCloud');
    throw error;
  }
}

/**
 * 클라우드와 병합
 * @returns {Promise<Object>} 병합 결과
 */
async mergeWithCloud() {
  try {
    await this.initialize();
    
    console.log('[HistoryManager] 클라우드 병합 시작');
    
    const cloudData = await this.fetchFromCloud({ page: 1, limit: 500 });
    
    // 🔧 디버깅: 서버 데이터 확인
    console.log('[HistoryManager] 서버 데이터 샘플:', cloudData.items[0]);
    
    const resolved = await window.syncManager.resolveConflicts(
      this.history,
      cloudData.items
    );
    
    // 🔧 디버깅: 병합 전 데이터 확인
    console.log('[HistoryManager] toDownload 샘플:', resolved.toDownload[0]);
    console.log('[HistoryManager] toKeep 샘플:', resolved.toKeep[0]);
    
    const mergedHistory = [
      ...resolved.toKeep,
      ...resolved.toDownload
    ];
    
    // 🔧 중복 제거 및 timestamp 보장
    const uniqueMap = new Map();
    mergedHistory.forEach(item => {
      // 🆕 timestamp가 없으면 createdAt에서 변환 시도
      if (!item.timestamp && item.createdAt) {
        if (typeof item.createdAt === 'object' && item.createdAt._seconds) {
          item.timestamp = item.createdAt._seconds * 1000;
        } else if (typeof item.createdAt === 'string') {
          item.timestamp = new Date(item.createdAt).getTime();
        } else if (typeof item.createdAt === 'number') {
          item.timestamp = item.createdAt;
        }
        console.log(`[HistoryManager] timestamp 복구: ${item.id} -> ${item.timestamp}`);
      }
      
      // 🆕 여전히 timestamp가 없으면 현재 시간 사용
      if (!item.timestamp) {
        item.timestamp = Date.now();
        console.warn(`[HistoryManager] timestamp 없음, 현재 시간 사용: ${item.id}`);
      }
      
      if (!uniqueMap.has(item.id) || item.timestamp > uniqueMap.get(item.id).timestamp) {
        uniqueMap.set(item.id, item);
      }
    });
    
    this.history = Array.from(uniqueMap.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.maxHistoryItems);
    
    // 🔧 디버깅: 최종 저장된 데이터 확인
    console.log('[HistoryManager] 병합 후 this.history[0]:', this.history[0]);
    
    await this.persist();
    
    if (resolved.toUpload.length > 0) {
      console.log(`[HistoryManager] ${resolved.toUpload.length}개 항목 업로드 중...`);
      for (const item of resolved.toUpload) {
        await window.syncManager.addToPendingQueue(item);
      }
    }
    
    const result = {
      total: this.history.length,
      downloaded: resolved.toDownload.length,
      uploaded: resolved.toUpload.length,
      kept: resolved.toKeep.length
    };
    
    console.log('[HistoryManager] 병합 완료:', result);
    
    return result;
    
  } catch (error) {
    window.errorHandler.handle(error, 'HistoryManager.mergeWithCloud');
    throw error;
  }
}

  
  /**
   * 클라우드 동기화 활성화/비활성화
   * @param {boolean} enabled - 활성화 여부
   */
  setCloudSyncEnabled(enabled) {
    this.cloudSyncEnabled = enabled;
    console.log(`[HistoryManager] 클라우드 동기화: ${enabled ? '활성화' : '비활성화'}`);
  }
  
  /**
   * 히스토리 조회
   * @param {Object} options - 조회 옵션
   * @returns {Promise<Object>} 조회 결과
   */
  async getHistory(options = {}) {
    try {
      await this.initialize();
      
      const {
        query = '',
        filter = 'all',
        sort = 'date',
        limit = 50,
        offset = 0
      } = options;
      
      let filtered = [...this.history];
      
      if (filter !== 'all') {
        filtered = this.filterByPeriod(filtered, filter);
      }
      
      if (query && query.trim() !== '') {
        filtered = this.searchHistory(filtered, query.trim());
      }
      
      filtered = this.sortHistory(filtered, sort);
      
      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);
      
      return {
        items: paginated,
        total,
        offset,
        limit
      };
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.getHistory');
      return { items: [], total: 0, offset: 0, limit };
    }
  }
  
  /**
   * ID로 히스토리 조회
   * @param {string} id - 히스토리 ID
   * @returns {Promise<Object|null>} 히스토리 항목
   */
  async getHistoryById(id) {
    try {
      await this.initialize();
      
      if (!id || typeof id !== 'string') {
        return null;
      }
      
      return this.history.find(h => h.id === id) || null;
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.getHistoryById');
      return null;
    }
  }
  
  /**
   * 히스토리 업데이트
   * @param {string} id - 히스토리 ID
   * @param {Object} updates - 업데이트 내용
   * @returns {Promise<Object|null>} 업데이트된 항목
   */
  async updateHistory(id, updates) {
    try {
      await this.initialize();
      
      const index = this.history.findIndex(h => h.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const item = this.history[index];
      
      if (updates.title !== undefined && typeof updates.title === 'string') {
        item.title = updates.title.trim();
      }
      
      if (updates.url !== undefined && typeof updates.url === 'string') {
        item.url = updates.url.trim();
      }
      
      if (updates.summary !== undefined && typeof updates.summary === 'string') {
        item.summary = updates.summary.trim();
        item.metadata.wordCount = this.countWords(item.summary);
      }
      
      if (updates.qaHistory !== undefined && Array.isArray(updates.qaHistory)) {
        item.qaHistory = updates.qaHistory;
      }
      
      if (updates.metadata !== undefined) {
        item.metadata = { ...item.metadata, ...updates.metadata };
      }
      
      if (updates.pending_sync !== undefined) {
        item.pending_sync = updates.pending_sync;
      }
      
      await this.persist();
      
      console.log(`[HistoryManager] 업데이트: ${item.title}`);
      
      return item;
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.updateHistory');
      return null;
    }
  }
  
  /**
   * 히스토리 삭제
   * @param {string} id - 히스토리 ID
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  async deleteHistory(id) {
    try {
      await this.initialize();
      
      const index = this.history.findIndex(h => h.id === id);
      
      if (index === -1) {
        return false;
      }
      
      this.history.splice(index, 1);
      await this.persist();
      
      console.log(`[HistoryManager] 로컬 삭제: ${id}`);
      
      if (this.cloudSyncEnabled) {
        try {
          await window.syncManager.deleteFromServer(id);
          console.log(`[HistoryManager] 클라우드 삭제: ${id}`);
        } catch (error) {
          console.warn('[HistoryManager] 클라우드 삭제 실패:', error);
        }
      }
      
      return true;
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.deleteHistory');
      return false;
    }
  }
  
  /**
   * 전체 히스토리 삭제
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  async clearHistory() {
    try {
      await this.initialize();
      
      this.history = [];
      await this.persist();
      
      console.log('[HistoryManager] 전체 삭제');
      
      return true;
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.clearHistory');
      return false;
    }
  }
  
  /**
   * Q&A 추가
   * @param {string} historyId - 히스토리 ID
   * @param {string} question - 질문
   * @param {string} answer - 답변
   * @returns {Promise<Object|null>} 추가된 Q&A 항목
   */
  async addQA(historyId, question, answer) {
    try {
      await this.initialize();
      
      if (!question || typeof question !== 'string' || question.length > 2000) {
        throw new Error('유효하지 않은 질문입니다');
      }
      
      if (!answer || typeof answer !== 'string' || answer.length > 10000) {
        throw new Error('유효하지 않은 답변입니다');
      }
      
      const item = await this.getHistoryById(historyId);
      
      if (!item) {
        return null;
      }
      
      const qaItem = {
        question: question.trim(),
        answer: answer.trim(),
        timestamp: Date.now()
      };
      
      if (!item.qaHistory) {
        item.qaHistory = [];
      }
      
      item.qaHistory.push(qaItem);
      
      await this.updateHistory(historyId, { qaHistory: item.qaHistory });
      
      return qaItem;
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.addQA');
      return null;
    }
  }
  
  /**
   * Q&A 히스토리 조회
   * @param {string} historyId - 히스토리 ID
   * @returns {Promise<Array>} Q&A 히스토리
   */
  async getQAHistory(historyId) {
    try {
      const item = await this.getHistoryById(historyId);
      return item ? (item.qaHistory || []) : [];
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.getQAHistory');
      return [];
    }
  }
  
  /**
   * Q&A 히스토리 삭제
   * @param {string} historyId - 히스토리 ID
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  async clearQAHistory(historyId) {
    try {
      await this.updateHistory(historyId, { qaHistory: [] });
      return true;
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.clearQAHistory');
      return false;
    }
  }
  
  /**
   * 히스토리 검색
   * @param {Array} items - 검색할 항목들
   * @param {string} query - 검색어
   * @returns {Array} 검색 결과
   */
  searchHistory(items, query) {
    const lowerQuery = query.toLowerCase();
    
    return items.filter(item => {
      const title = item.title.toLowerCase();
      const summary = item.summary.toLowerCase();
      const url = item.url.toLowerCase();
      
      if (title.includes(lowerQuery) || 
          summary.includes(lowerQuery) || 
          url.includes(lowerQuery)) {
        return true;
      }
      
      if (item.qaHistory && item.qaHistory.length > 0) {
        return item.qaHistory.some(qa => {
          const question = qa.question.toLowerCase();
          const answer = qa.answer.toLowerCase();
          return question.includes(lowerQuery) || answer.includes(lowerQuery);
        });
      }
      
      return false;
    });
  }
  
  /**
   * 기간별 필터링
   * @param {Array} items - 필터링할 항목들
   * @param {string} period - 기간 (today/week/month)
   * @returns {Array} 필터링 결과
   */
  filterByPeriod(items, period) {
    const now = Date.now();
    const today = new Date(new Date().toDateString()).getTime();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    switch (period) {
      case 'today':
        return items.filter(item => item.timestamp >= today);
      case 'week':
        return items.filter(item => item.timestamp >= weekAgo);
      case 'month':
        return items.filter(item => item.timestamp >= monthAgo);
      default:
        return items;
    }
  }
  
  /**
   * 히스토리 정렬
   * @param {Array} items - 정렬할 항목들
   * @param {string} sortBy - 정렬 기준 (date/title)
   * @returns {Array} 정렬 결과
   */
  sortHistory(items, sortBy) {
    const sorted = [...items];
    
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'date':
      default:
        sorted.sort((a, b) => b.timestamp - a.timestamp);
        break;
    }
    
    return sorted;
  }
  
  /**
   * 히스토리 내보내기
   * @param {string} format - 내보내기 형식 (json/csv)
   * @returns {Promise<string>} 내보내기 데이터
   */
  async exportHistory(format = 'json') {
    try {
      await this.initialize();
      
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        count: this.history.length,
        history: this.history
      };
      
      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(exportData.history);
      }
      
      throw new Error(`지원하지 않는 포맷: ${format}`);
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.exportHistory');
      throw error;
    }
  }
  
  /**
   * CSV 변환
   * @param {Array} items - 변환할 항목들
   * @returns {string} CSV 문자열
   */
  convertToCSV(items) {
    const headers = ['ID', 'Title', 'URL', 'Summary', 'Timestamp', 'Domain'];
    
    const rows = items.map(item => {
      return [
        item.id,
        `"${item.title.replace(/"/g, '""')}"`,
        item.url,
        `"${item.summary.replace(/"/g, '""')}"`,
        new Date(item.timestamp).toISOString(),
        item.metadata?.domain || ''
      ].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  /**
   * 히스토리 가져오기
   * @param {*} data - 가져올 데이터
   * @param {Object} options - 가져오기 옵션
   * @returns {Promise<Object>} 가져오기 결과
   */
  async importHistory(data, options = {}) {
    try {
      await this.initialize();
      
      const { merge = true, replace = false } = options;
      
      let importData;
      if (typeof data === 'string') {
        try {
          importData = JSON.parse(data);
        } catch (error) {
          throw new Error('유효하지 않은 JSON 형식입니다');
        }
      } else {
        importData = data;
      }
      
      if (!importData.history || !Array.isArray(importData.history)) {
        throw new Error('유효하지 않은 히스토리 데이터 형식입니다');
      }
      
      let imported = 0;
      let skipped = 0;
      
      if (replace) {
        this.history = [];
      }
      
      const existingIds = new Set(this.history.map(h => h.id));
      
      for (const item of importData.history) {
        if (!item.title || !item.url || !item.summary) {
          skipped++;
          continue;
        }
        
        if (merge && existingIds.has(item.id)) {
          skipped++;
          continue;
        }
        
        const normalizedItem = {
          id: item.id || window.generateId(),
          title: item.title,
          url: item.url,
          summary: item.summary,
          summaryLength: item.summaryLength || 'medium',
          timestamp: item.timestamp || Date.now(),
          qaHistory: Array.isArray(item.qaHistory) ? item.qaHistory : [],
          pending_sync: false,
          metadata: {
            domain: item.metadata?.domain || this.extractDomain(item.url),
            wordCount: item.metadata?.wordCount || this.countWords(item.summary),
            language: item.metadata?.language || 'unknown',
            tags: Array.isArray(item.metadata?.tags) ? item.metadata.tags : [],
            ...item.metadata
          }
        };
        
        this.history.push(normalizedItem);
        existingIds.add(normalizedItem.id);
        imported++;
      }
      
      if (this.history.length > this.maxHistoryItems) {
        const removeCount = this.history.length - this.maxHistoryItems;
        this.history.splice(0, removeCount);
      }
      
      await this.persist();
      
      console.log(`[HistoryManager] 가져오기 완료: ${imported}개 추가, ${skipped}개 건너뜀`);
      
      return {
        imported,
        skipped,
        total: this.history.length
      };
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.importHistory');
      throw error;
    }
  }
  
  /**
   * 통계 조회
   * @returns {Promise<Object>} 통계 데이터
   */
  async getStatistics() {
    try {
      await this.initialize();
      
      const now = Date.now();
      const today = new Date(new Date().toDateString()).getTime();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      
      const todayCount = this.history.filter(h => h.timestamp >= today).length;
      const weekCount = this.history.filter(h => h.timestamp >= weekAgo).length;
      const monthCount = this.history.filter(h => h.timestamp >= monthAgo).length;
      
      const domainMap = new Map();
      this.history.forEach(item => {
        const domain = item.metadata?.domain || 'unknown';
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      });
      
      const topDomains = Array.from(domainMap.entries())
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      let totalQuestions = 0;
      let itemsWithQA = 0;
      
      this.history.forEach(item => {
        if (item.qaHistory && item.qaHistory.length > 0) {
          totalQuestions += item.qaHistory.length;
          itemsWithQA++;
        }
      });
      
      const dailyStats = this.getDailyStats();
      
      return {
        total: this.history.length,
        today: todayCount,
        week: weekCount,
        month: monthCount,
        topDomains,
        qaStats: {
          totalQuestions,
          itemsWithQA,
          avgQuestionsPerItem: itemsWithQA > 0 ? 
            (totalQuestions / itemsWithQA).toFixed(1) : 0
        },
        dailyStats
      };
      
    } catch (error) {
      window.errorHandler.handle(error, 'HistoryManager.getStatistics');
      return {
        total: 0,
        today: 0,
        week: 0,
        month: 0,
        topDomains: [],
        qaStats: { totalQuestions: 0, itemsWithQA: 0, avgQuestionsPerItem: 0 },
        dailyStats: []
      };
    }
  }
  
  /**
   * 일별 통계 조회
   * @returns {Array} 일별 통계
   */
  getDailyStats() {
    const stats = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.toDateString()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const count = this.history.filter(h => 
        h.timestamp >= dayStart && h.timestamp < dayEnd
      ).length;
      
      stats.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count
      });
    }
    
    return stats;
  }
  
  /**
   * URL에서 도메인 추출
   * @param {string} url - URL
   * @returns {string} 도메인
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'unknown';
    }
  }
  
  /**
   * 단어 수 계산
   * @param {string} text - 텍스트
   * @returns {number} 단어 수
   */
  countWords(text) {
    if (!text) return 0;
    
    const korean = text.match(/[가-힣]+/g) || [];
    const english = text.match(/[a-zA-Z]+/g) || [];
    
    return korean.length + english.length;
  }
}

// 전역 인스턴스 생성
window.historyManager = new HistoryManager();