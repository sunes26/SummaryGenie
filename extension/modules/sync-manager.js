/**
 * SummaryGenie Cloud Sync Manager
 * 로컬-클라우드 히스토리 동기화 관리
 * 
 * @module sync-manager
 * @version 1.0.0
 * @requires storage-manager.js (전역 - window.storageManager)
 * @requires error-handler.js (전역 - window.errorHandler)
 * @requires settings-manager.js (전역 - window.settingsManager)
 */

/**
 * 동기화 이벤트 타입
 * @enum {string}
 */
const SyncEvent = {
  STARTED: 'sync-started',
  PROGRESS: 'sync-progress',
  COMPLETED: 'sync-completed',
  FAILED: 'sync-failed',
  CONFLICT: 'sync-conflict'
};

/**
 * 동기화 상태
 * @enum {string}
 */
const SyncStatus = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error'
};

/**
 * SyncManager 클래스
 */
class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncStatus = SyncStatus.IDLE;
    this.pendingQueue = [];
    this.listeners = new Map();
    this.syncInterval = null;
    this.lastSyncTime = 0;
    this.SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5분
    this.API_BASE_URL = '';
    this.initialized = false;
    
    console.log('[SyncManager] 초기화');
  }
  
  /**
   * SyncManager 초기화
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      const settings = window.settingsManager.getSettings();
      this.API_BASE_URL = settings.useProxy 
        ? settings.proxyUrl.replace('/api/chat', '')
        : 'http://localhost:3000';
      
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      await this.loadPendingQueue();
      
      this.startAutoSync();
      
      if (this.isOnline) {
        await this.syncPendingItems();
      }
      
      this.initialized = true;
      console.log('[SyncManager] 초기화 완료');
      
    } catch (error) {
      console.error('[SyncManager] 초기화 오류:', error);
      window.errorHandler.handle(error, 'SyncManager.initialize');
    }
  }
  
  /**
   * 자동 동기화 시작
   */
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      if (this.isOnline && this.syncStatus === SyncStatus.IDLE) {
        console.log('[SyncManager] 자동 동기화 실행');
        await this.syncPendingItems();
      }
    }, this.SYNC_INTERVAL_MS);
  }
  
  /**
   * 자동 동기화 중지
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * 온라인 복귀 처리
   */
  async handleOnline() {
    console.log('[SyncManager] 온라인 복귀');
    this.isOnline = true;
    
    setTimeout(async () => {
      if (this.isOnline) {
        await this.syncPendingItems();
      }
    }, 2000);
  }
  
  /**
   * 오프라인 전환 처리
   */
  handleOffline() {
    console.log('[SyncManager] 오프라인 전환');
    this.isOnline = false;
  }
  
  /**
   * 대기 중인 항목 로드
   * @private
   */
  async loadPendingQueue() {
    try {
      const queue = await window.storageManager.get('sync_queue', []);
      this.pendingQueue = Array.isArray(queue) ? queue : [];
      console.log(`[SyncManager] 대기 항목: ${this.pendingQueue.length}개`);
    } catch (error) {
      console.error('[SyncManager] 큐 로드 오류:', error);
      this.pendingQueue = [];
    }
  }
  
  /**
   * 대기 큐에 항목 추가
   * @param {Object} item - 동기화 대기 항목
   */
  async addToPendingQueue(item) {
    try {
      this.pendingQueue.push({
        ...item,
        pending_sync: true,
        queued_at: Date.now()
      });
      
      await window.storageManager.set('sync_queue', this.pendingQueue);
      console.log(`[SyncManager] 큐 추가: ${item.id}`);
      
      if (this.isOnline && this.syncStatus === SyncStatus.IDLE) {
        await this.syncPendingItems();
      }
    } catch (error) {
      window.errorHandler.handle(error, 'SyncManager.addToPendingQueue');
    }
  }
  
  /**
   * 대기 중인 항목 동기화
   * @returns {Promise<Object>} 동기화 결과
   */
  async syncPendingItems() {
    if (!this.isOnline) {
      console.log('[SyncManager] 오프라인: 동기화 건너뜀');
      return { success: false, reason: 'offline' };
    }
    
    if (this.syncStatus === SyncStatus.SYNCING) {
      console.log('[SyncManager] 이미 동기화 중');
      return { success: false, reason: 'already_syncing' };
    }
    
    if (this.pendingQueue.length === 0) {
      console.log('[SyncManager] 동기화할 항목 없음');
      return { success: true, synced: 0 };
    }
    
    this.syncStatus = SyncStatus.SYNCING;
    this.emit(SyncEvent.STARTED, { total: this.pendingQueue.length });
    
    let synced = 0;
    let failed = 0;
    const errors = [];
    
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }
      
      for (let i = 0; i < this.pendingQueue.length; i++) {
        const item = this.pendingQueue[i];
        
        try {
          await this.syncSingleItem(item, token);
          synced++;
          
          this.emit(SyncEvent.PROGRESS, {
            current: i + 1,
            total: this.pendingQueue.length,
            item: item
          });
          
        } catch (error) {
          console.error(`[SyncManager] 항목 동기화 실패: ${item.id}`, error);
          failed++;
          errors.push({ id: item.id, error: error.message });
        }
      }
      
      this.pendingQueue = this.pendingQueue.filter((_, i) => i >= synced);
      await window.storageManager.set('sync_queue', this.pendingQueue);
      
      this.lastSyncTime = Date.now();
      this.syncStatus = SyncStatus.IDLE;
      
      const result = { success: true, synced, failed, errors };
      this.emit(SyncEvent.COMPLETED, result);
      
      console.log(`[SyncManager] 동기화 완료: ${synced}개 성공, ${failed}개 실패`);
      return result;
      
    } catch (error) {
      this.syncStatus = SyncStatus.ERROR;
      this.emit(SyncEvent.FAILED, { error: error.message });
      window.errorHandler.handle(error, 'SyncManager.syncPendingItems');
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 단일 항목 동기화
   * @private
   */
  async syncSingleItem(item, token) {
    const response = await fetch(`${this.API_BASE_URL}/api/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: item.id,
        url: item.url,
        title: item.title,
        summary: item.summary,
        summaryLength: item.summaryLength || 'medium',
        qaHistory: item.qaHistory || [],
        metadata: item.metadata,
        createdAt: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `서버 오류: ${response.status}`);
    }
    
    return await response.json();
  }
  
/**
 * 서버에서 히스토리 다운로드
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 서버 히스토리
 */
async downloadFromServer(options = {}) {
  if (!this.isOnline) {
    throw new Error('오프라인 상태입니다');
  }
  
  try {
    const token = await this.getAuthToken();
    if (!token) {
      console.warn('[SyncManager] 토큰 없음 - 로컬 히스토리만 사용');
      return { items: [], total: 0, hasMore: false };
    }
    
    // 🔧 limit을 100 이하로 제한 (서버 검증 규칙에 맞춤)
    const { limit = 100 } = options;
    const safeLimit = Math.min(limit, 100);
    
    // 타임아웃이 있는 fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      `${this.API_BASE_URL}/api/history?limit=${safeLimit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[SyncManager] 서버 응답 에러:', errorData);
      throw new Error(errorData.message || `서버 오류: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[SyncManager] 서버에서 ${data.items?.length || 0}개 다운로드`);
    
    return {
      items: data.items || [],
      total: data.total || 0,
      hasMore: data.hasMore || false
    };
    
  } catch (error) {
    // AbortError 처리
    if (error.name === 'AbortError') {
      throw new Error('서버 요청 타임아웃');
    }
    
    console.error('[SyncManager] 다운로드 실패:', error);
    window.errorHandler.handle(error, 'SyncManager.downloadFromServer');
    throw error;
  }
}
  
  /**
   * 충돌 해결
   * @param {Array} localItems - 로컬 항목
   * @param {Array} serverItems - 서버 항목
   * @returns {Object} 해결된 항목
   */
  async resolveConflicts(localItems, serverItems) {
    const resolved = {
      toKeep: [],
      toUpload: [],
      toDownload: []
    };
    
    const serverMap = new Map(serverItems.map(item => [item.id, item]));
    const localMap = new Map(localItems.map(item => [item.id, item]));
    
    for (const localItem of localItems) {
      const serverItem = serverMap.get(localItem.id);
      
      if (localItem.pending_sync) {
        resolved.toUpload.push(localItem);
        continue;
      }
      
      if (!serverItem) {
        resolved.toUpload.push(localItem);
        continue;
      }
      
      const localTime = localItem.timestamp || 0;
      const serverTime = new Date(serverItem.createdAt).getTime();
      
      if (serverTime > localTime) {
        resolved.toDownload.push(serverItem);
        this.emit(SyncEvent.CONFLICT, {
          id: localItem.id,
          resolution: 'server-wins',
          local: localItem,
          server: serverItem
        });
      } else {
        resolved.toKeep.push(localItem);
      }
    }
    
    for (const serverItem of serverItems) {
      if (!localMap.has(serverItem.id)) {
        resolved.toDownload.push(serverItem);
      }
    }
    
    console.log('[SyncManager] 충돌 해결:', {
      keep: resolved.toKeep.length,
      upload: resolved.toUpload.length,
      download: resolved.toDownload.length
    });
    
    return resolved;
  }
  
  /**
   * 서버 히스토리 삭제
   * @param {string} id - 히스토리 ID
   */
  async deleteFromServer(id) {
    if (!this.isOnline) {
      throw new Error('오프라인 상태입니다');
    }
    
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }
      
      const response = await fetch(`${this.API_BASE_URL}/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`삭제 실패: ${response.status}`);
      }
      
      console.log(`[SyncManager] 서버에서 삭제: ${id}`);
      
    } catch (error) {
      window.errorHandler.handle(error, 'SyncManager.deleteFromServer');
      throw error;
    }
  }
  
/**
 * 인증 토큰 가져오기 (Background 없이 직접 storage 접근)
 * @private
 */
async getAuthToken() {
  try {
    console.log('[SyncManager] storage에서 토큰 조회');
    
    const result = await chrome.storage.local.get('tokens');
    
    if (!result.tokens || !result.tokens.accessToken) {
      console.warn('[SyncManager] 토큰 없음');
      return null;
    }
    
    const token = result.tokens.accessToken;
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      console.warn('[SyncManager] 잘못된 토큰 형식');
      return null;
    }
    
    // 토큰 만료 확인
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const exp = payload.exp * 1000;
      const now = Date.now();
      
      if (exp <= now) {
        console.warn('[SyncManager] 토큰 만료됨');
        return null;
      }
      
      console.log('[SyncManager] 토큰 유효함');
      return token;
      
    } catch (decodeError) {
      console.error('[SyncManager] 토큰 디코딩 실패:', decodeError);
      return null;
    }
    
  } catch (error) {
    console.error('[SyncManager] 토큰 조회 실패:', error);
    return null;
  }
}
  
  /**
   * 네트워크 상태 조회
   * @returns {Promise<Object>} 네트워크 상태
   */
  async getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      syncStatus: this.syncStatus,
      pendingCount: this.pendingQueue.length,
      lastSyncTime: this.lastSyncTime,
      timeSinceLastSync: this.lastSyncTime ? Date.now() - this.lastSyncTime : null
    };
  }
  
  /**
   * 동기화 진행상황 리스너 등록
   * @param {Function} callback - 콜백 함수
   * @returns {Function} 리스너 제거 함수
   */
  onSyncProgress(callback) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, callback);
    
    return () => {
      this.listeners.delete(id);
    };
  }
  
  /**
   * 이벤트 발생
   * @private
   */
  emit(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[SyncManager] 리스너 오류:', error);
      }
    });
  }
  
  /**
   * 정리
   */
  cleanup() {
    this.stopAutoSync();
    this.listeners.clear();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    console.log('[SyncManager] 정리 완료');
  }
}

// 전역 인스턴스 생성
window.syncManager = new SyncManager();
window.SyncEvent = SyncEvent;
window.SyncStatus = SyncStatus;