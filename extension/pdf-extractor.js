/**
 * extension\pdf-extractor.js
 * SummaryGenie PDF Extractor (ES Module 버전)
 * PDF.js .mjs 파일을 동적 import로 사용
 * 
 * ✨ v2.0.0 업데이트:
 * - ES Module(.mjs) 지원
 * - 동적 import 사용
 * - Chrome 확장 프로그램 호환성 유지
 * 
 * @version 2.0.0
 */

class PDFExtractor {
  constructor() {
    this.config = {
      maxPages: 100,          // 최대 페이지 수
      maxTextLength: 100000,  // 최대 텍스트 길이
      workerSrc: chrome.runtime.getURL('lib/pdf.worker.mjs'),  // ✅ .mjs로 변경
      maxRetries: 3,          // 최대 재시도 횟수
      retryDelay: 1000        // 재시도 간격 (밀리초)
    };
    
    this.initialized = false;
    this.initializationAttempts = 0;
    this.pdfjsLib = null;  // ✅ 동적으로 로드될 라이브러리 저장
  }

  /**
   * ✅ PDF.js 동적 import 및 초기화
   */
  async initialize() {
    if (this.initialized && this.pdfjsLib) {
      return true;
    }

    try {
      this.initializationAttempts++;
      
      console.log('[PDFExtractor] PDF.js 동적 import 시작...');
      
      // ✅ 핵심: ES Module 동적 import
      if (!this.pdfjsLib) {
        try {
          // Chrome 확장 프로그램 URL로 import
          const pdfJsUrl = chrome.runtime.getURL('lib/pdf.mjs');
          console.log('[PDFExtractor] Import URL:', pdfJsUrl);
          
          // 동적 import
          this.pdfjsLib = await import(pdfJsUrl);
          
          console.log('[PDFExtractor] PDF.js 모듈 로드 완료');
        } catch (importError) {
          console.error('[PDFExtractor] PDF.js import 실패:', importError);
          throw new Error(`PDF.js 모듈 로드 실패: ${importError.message}`);
        }
      }

      // Worker 설정
      if (this.pdfjsLib.GlobalWorkerOptions) {
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = this.config.workerSrc;
        console.log('[PDFExtractor] Worker 설정 완료:', this.config.workerSrc);
      }
      
      console.log('[PDFExtractor] 초기화 완료:', {
        workerSrc: this.config.workerSrc,
        version: this.pdfjsLib.version || 'unknown'
      });
      
      this.initialized = true;
      this.initializationAttempts = 0;
      return true;

    } catch (error) {
      console.error('[PDFExtractor] 초기화 실패:', error);
      
      // 재시도 로직
      if (this.initializationAttempts < this.config.maxRetries) {
        console.log(`[PDFExtractor] ${this.config.retryDelay}ms 후 재시도... (${this.initializationAttempts}/${this.config.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.initialize();
      }
      
      return false;
    }
  }

  /**
   * 현재 페이지가 PDF인지 확인
   */
  isPDFPage() {
    const url = window.location.href;
    
    // 1. URL이 .pdf로 끝나는 경우
    if (url.toLowerCase().endsWith('.pdf')) {
      return true;
    }
    
    // 2. Chrome PDF Viewer
    if (url.includes('chrome-extension://') && url.includes('.pdf')) {
      return true;
    }
    
    // 3. file:// 프로토콜의 PDF
    if (url.startsWith('file://') && url.toLowerCase().includes('.pdf')) {
      return true;
    }
    
    // 4. embed 태그로 PDF가 삽입된 경우
    const embedPDF = document.querySelector('embed[type="application/pdf"]');
    if (embedPDF) {
      return true;
    }
    
    return false;
  }

  /**
   * PDF URL 가져오기
   */
  getPDFUrl() {
    const url = window.location.href;
    
    // 1. 직접 PDF URL인 경우
    if (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?') || url.includes('.pdf#')) {
      return url;
    }
    
    // 2. Chrome PDF Viewer
    if (url.startsWith('chrome-extension://')) {
      const params = new URLSearchParams(window.location.search);
      const src = params.get('src');
      if (src) {
        return src;
      }
      return url;
    }
    
    // 3. file:// 프로토콜
    if (url.startsWith('file://')) {
      return url;
    }
    
    // 4. embed 태그
    const embedPDF = document.querySelector('embed[type="application/pdf"]');
    if (embedPDF) {
      return embedPDF.src;
    }
    
    return null;
  }

  /**
   * PDF 문서 로드 (재시도 로직 포함)
   */
  async loadPDF(url) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`[PDFExtractor] PDF 로드 시도 ${attempt}/${this.config.maxRetries}:`, url);

        // ✅ pdfjsLib 사용 (동적으로 로드된 모듈)
        const loadingTask = this.pdfjsLib.getDocument({
          url: url,
          cMapUrl: chrome.runtime.getURL('lib/cmaps/'),
          cMapPacked: true,
          useSystemFonts: true
        });

        const pdf = await loadingTask.promise;
        
        console.log('[PDFExtractor] PDF 로드 완료:', {
          pages: pdf.numPages,
          fingerprint: pdf.fingerprint
        });

        return pdf;

      } catch (error) {
        lastError = error;
        console.error(`[PDFExtractor] PDF 로드 실패 (시도 ${attempt}/${this.config.maxRetries}):`, error);
        
        if (attempt < this.config.maxRetries) {
          console.log(`[PDFExtractor] ${this.config.retryDelay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    
    throw new Error(`PDF 로드 실패 (${this.config.maxRetries}회 시도): ${lastError.message}`);
  }

  /**
   * 단일 페이지에서 텍스트 추출
   */
  async extractPageText(page) {
    try {
      const textContent = await page.getTextContent();
      
      const text = textContent.items
        .map(item => item.str)
        .join(' ');

      return text;

    } catch (error) {
      console.error('[PDFExtractor] 페이지 텍스트 추출 실패:', error);
      return '';
    }
  }

  /**
   * 전체 PDF에서 텍스트 추출
   */
  async extractText(url = null) {
    try {
      console.log('[PDFExtractor] 텍스트 추출 시작');
      
      // ✅ 초기화 (동적 import 포함)
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('PDF.js 초기화 실패');
      }

      // URL 가져오기
      const pdfUrl = url || this.getPDFUrl();
      if (!pdfUrl) {
        throw new Error('PDF URL을 찾을 수 없습니다');
      }

      // PDF 로드
      const pdf = await this.loadPDF(pdfUrl);
      
      // 페이지 수 제한
      const numPages = Math.min(pdf.numPages, this.config.maxPages);
      console.log(`[PDFExtractor] ${numPages}/${pdf.numPages} 페이지 추출 시작`);

      // 모든 페이지에서 텍스트 추출
      const textPromises = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const pagePromise = pdf.getPage(pageNum)
          .then(page => this.extractPageText(page))
          .then(text => {
            console.log(`[PDFExtractor] 페이지 ${pageNum}/${numPages} 추출 완료 (${text.length}자)`);
            return text;
          });
        
        textPromises.push(pagePromise);
      }

      // 모든 페이지 텍스트 수집
      const pageTexts = await Promise.all(textPromises);
      
      // 텍스트 결합
      let fullText = pageTexts.join('\n\n');

      // 길이 제한
      if (fullText.length > this.config.maxTextLength) {
        console.warn(`[PDFExtractor] 텍스트 길이 제한 (${fullText.length} → ${this.config.maxTextLength})`);
        fullText = fullText.substring(0, this.config.maxTextLength) + '\n\n... (이하 생략)';
      }

      // 텍스트 정제
      fullText = this.cleanText(fullText);

      const result = {
        success: true,
        text: fullText,
        metadata: {
          url: pdfUrl,
          totalPages: pdf.numPages,
          extractedPages: numPages,
          charCount: fullText.length,
          wordCount: this.countWords(fullText)
        }
      };

      console.log('[PDFExtractor] 추출 완료:', result.metadata);
      return result;

    } catch (error) {
      console.error('[PDFExtractor] 추출 실패:', error);
      
      return {
        success: false,
        error: error.message,
        text: '',
        metadata: null
      };
    }
  }

  /**
   * 텍스트 정제
   */
  cleanText(text) {
    if (!text) return '';

    // 과도한 공백 제거
    text = text.replace(/\s{3,}/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');

    // 줄바꿈 정리
    text = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return text.trim();
  }

  /**
   * 단어 수 계산
   */
  countWords(text) {
    if (!text) return 0;
    const words = text.match(/[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]+/g);
    return words ? words.length : 0;
  }
}

// 전역 인스턴스 생성
const pdfExtractor = new PDFExtractor();

// 전역 export
if (typeof window !== 'undefined') {
  window.PDFExtractor = PDFExtractor;
  window.pdfExtractor = pdfExtractor;
  console.log('[PDFExtractor] 모듈 로드 완료 (ES Module 버전)');
} else {
  console.warn('[PDFExtractor] window 객체를 찾을 수 없습니다');
}