/**
 * 인증 API 라우터 - Firebase Authentication 버전
 * 회원가입, 프로필 관리, 이메일 인증, 비밀번호 재설정, OAuth 로그인
 * 
 * @module routes/api/auth
 * @version 3.0.0 - Firebase Auth 전환
 * 
 * 📝 주요 변경사항:
 * - POST /login 제거 (클라이언트가 Firebase SDK로 직접 로그인)
 * - customToken 반환 (클라이언트에서 signInWithCustomToken 사용)
 * - Firebase 이메일 인증 링크 사용
 * - Firebase 비밀번호 재설정 링크 사용
 * - Google OAuth 로그인 추가
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Constants
const {
  HTTP_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES
} = require('../../constants');

// Middleware
const { authenticate } = require('../../middleware/auth');
const {
  validate,
  signupValidator,
  emailValidator
} = require('../../middleware/validator');
const {
  authLimiter,
  signupLimiter,
  passwordResetLimiter
} = require('../../middleware/rateLimiter');
const { asyncHandler } = require('../../middleware/errorHandler');

// Services
const authService = require('../../services/AuthService');
const emailService = require('../../services/EmailService');

// Error Classes
const {
  ValidationError,
  AuthenticationError,
  NotFoundError
} = require('../../middleware/errorHandler');

// ===== POST /signup - 회원가입 =====

/**
 * 회원가입 - Firebase Authentication 사용
 * 
 * @route POST /api/auth/signup
 * @middleware validate(signupValidator)
 * @middleware signupLimiter
 * 
 * @body {string} email - 사용자 이메일
 * @body {string} password - 비밀번호 (8자 이상)
 * @body {string} confirmPassword - 비밀번호 확인
 * @body {string} [name] - 사용자 이름 (선택)
 * 
 * @returns {Object} customToken - Firebase 커스텀 토큰 (클라이언트에서 signInWithCustomToken 사용)
 */
router.post('/signup',
  validate(signupValidator),
  signupLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    
    console.log(`[Auth Signup] 회원가입 시도: ${email}`);
    
    // AuthService를 통한 회원가입 (Firebase Auth)
    const result = await authService.signup(email, password, name);
    
    // 이메일 발송
    if (emailService.isAvailable()) {
      try {
        // 환영 이메일
        await emailService.sendWelcomeEmail(result.user.email, result.user.name);
        console.log(`✅ 환영 이메일 발송: ${result.user.email}`);
        
        // 이메일 인증 링크 발송
        await emailService.sendVerificationEmail(
          result.user.email,
          result.user.name,
          result.emailVerificationLink
        );
        console.log(`✅ 인증 이메일 발송: ${result.user.email}`);
      } catch (emailError) {
        console.error('⚠️ 이메일 발송 실패:', emailError.message);
      }
    }
    
    console.log(`✅ [Auth Signup] 회원가입 성공: ${email} (UID: ${result.uid})`);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요',
      user: result.user,
      customToken: result.customToken, // 클라이언트에서 signInWithCustomToken 사용
      uid: result.uid
    });
  })
);

// ===== POST /login - 로그인 (선택: 서버 검증용) =====

/**
 * 로그인 - Firebase ID Token 검증
 * 
 * 참고: 일반적으로 클라이언트가 Firebase SDK로 직접 로그인하므로 
 * 이 엔드포인트는 선택적입니다. 서버에서 추가 검증이 필요한 경우에만 사용
 * 
 * @route POST /api/auth/login
 * @middleware authLimiter
 * 
 * @body {string} idToken - Firebase ID Token (클라이언트에서 받은 토큰)
 */
router.post('/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
      throw new ValidationError('Firebase ID Token이 필요합니다');
    }
    
    console.log('[Auth Login] ID Token 검증');
    
    // Firebase ID Token 검증
    const decodedToken = await authService.verifyIdToken(idToken);
    
    // Firestore에서 사용자 정보 조회
    const user = await authService.getUserById(decodedToken.uid);
    
    // 로그인 정보 업데이트
    await authService.updateProfile(decodedToken.uid, {
      lastLoginAt: new Date(),
      'metadata.loginCount': (user.metadata?.loginCount || 0) + 1
    });
    
    console.log(`✅ [Auth Login] 로그인 성공: ${user.email}`);
    
    res.json({
      success: true,
      message: '로그인되었습니다',
      user: user
    });
  })
);

// ===== POST /logout - 로그아웃 =====

/**
 * 로그아웃
 * Firebase Admin SDK를 사용하여 토큰 취소 (선택)
 * 
 * @route POST /api/auth/logout
 * @middleware authenticate
 */
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, email } = req.user;
    
    console.log(`[Auth Logout] 로그아웃: ${email}`);
    
    // 선택: 모든 세션 무효화
    // await authService.auth.revokeRefreshTokens(userId);
    
    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });
  })
);

// ===== GET /me - 현재 사용자 정보 조회 =====

/**
 * 현재 사용자 정보 조회
 * 
 * @route GET /api/auth/me
 * @middleware authenticate
 */
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId } = req.user;
    
    console.log(`[Auth Me] 사용자 정보 조회: ${userId}`);
    
    const user = await authService.getUserById(userId);
    
    res.json({
      success: true,
      user
    });
  })
);

// ===== PUT /profile - 프로필 업데이트 =====

/**
 * 프로필 업데이트
 * 
 * @route PUT /api/auth/profile
 * @middleware authenticate
 */
router.put('/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const updates = req.body;
    
    console.log(`[Auth Profile] 프로필 업데이트: ${userId}`);
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new ValidationError('업데이트할 정보를 제공해주세요');
    }
    
    const updatedUser = await authService.updateProfile(userId, updates);
    
    console.log(`✅ [Auth Profile] 프로필 업데이트 성공: ${userId}`);
    
    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다',
      user: updatedUser
    });
  })
);

// ===== POST /change-password - 비밀번호 변경 =====

/**
 * 비밀번호 변경
 * Firebase Authentication 사용
 * 
 * @route POST /api/auth/change-password
 * @middleware authenticate
 */
router.post('/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { newPassword, confirmPassword } = req.body;
    
    console.log(`[Auth Change Password] 비밀번호 변경 시도: ${userId}`);
    
    if (!newPassword || !confirmPassword) {
      throw new ValidationError('모든 필드를 입력해주세요');
    }
    
    if (newPassword !== confirmPassword) {
      throw new ValidationError('새 비밀번호가 일치하지 않습니다');
    }
    
    if (newPassword.length < 8) {
      throw new ValidationError('비밀번호는 최소 8자 이상이어야 합니다');
    }
    
    await authService.changePassword(userId, newPassword);
    
    // 비밀번호 변경 확인 이메일 발송
    if (emailService.isAvailable()) {
      try {
        const user = await authService.getUserById(userId);
        await emailService.sendPasswordChangedEmail(user.email, user.name);
      } catch (emailError) {
        console.error('⚠️ 이메일 발송 실패:', emailError.message);
      }
    }
    
    console.log(`✅ [Auth Change Password] 비밀번호 변경 성공: ${userId}`);
    
    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다'
    });
  })
);

// ===== POST /forgot-password - 비밀번호 재설정 요청 =====

/**
 * 비밀번호 재설정 요청 (이메일 발송)
 * Firebase 비밀번호 재설정 링크 사용
 * 
 * @route POST /api/auth/forgot-password
 * @middleware validate(emailValidator)
 * @middleware passwordResetLimiter
 */
router.post('/forgot-password',
  validate(emailValidator),
  passwordResetLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    console.log(`[Auth Forgot Password] 비밀번호 재설정 요청: ${email}`);
    
    try {
      // Firebase 비밀번호 재설정 링크 생성
      const resetLink = await authService.generatePasswordResetLink(email);
      
      if (resetLink && emailService.isAvailable()) {
        // 사용자 정보 조회
        const user = await authService.getUserByEmail(email);
        
        // 재설정 이메일 발송
        await emailService.sendPasswordResetEmail(
          user.email,
          user.name,
          resetLink
        );
        console.log(`✅ [Auth Forgot Password] 재설정 이메일 발송: ${email}`);
      }
      
    } catch (error) {
      // 보안: 사용자 존재 여부 노출 방지
      console.log(`[Auth Forgot Password] 에러 (무시): ${email} - ${error.message}`);
    }
    
    // 보안: 항상 동일한 응답
    res.json({
      success: true,
      message: '등록된 이메일인 경우 비밀번호 재설정 링크가 발송됩니다'
    });
  })
);

// ===== POST /verify-email - 이메일 인증 확인 =====

/**
 * 이메일 인증 확인
 * Firebase가 자동으로 처리하지만, 서버에서 Firestore 업데이트용
 * 
 * @route POST /api/auth/verify-email
 * @middleware authenticate
 */
router.post('/verify-email',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, emailVerified } = req.user;
    
    console.log(`[Auth Verify Email] 이메일 인증 확인: ${userId}`);
    
    if (emailVerified) {
      return res.json({
        success: true,
        message: '이미 인증된 이메일입니다'
      });
    }
    
    // Firebase Auth에서 이메일 인증 여부 다시 확인
    const decodedToken = await authService.verifyIdToken(req.headers.authorization.split(' ')[1]);
    
    if (decodedToken.email_verified) {
      // Firestore 업데이트
      await authService.updateEmailVerificationStatus(userId, true);
      
      console.log(`✅ [Auth Verify Email] 이메일 인증 완료: ${userId}`);
      
      return res.json({
        success: true,
        message: '이메일 인증이 완료되었습니다'
      });
    }
    
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: '이메일 인증이 아직 완료되지 않았습니다'
    });
  })
);

// ===== POST /resend-verification - 인증 이메일 재발송 =====

/**
 * 이메일 인증 링크 재발송
 * 
 * @route POST /api/auth/resend-verification
 * @middleware authenticate
 */
router.post('/resend-verification',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, email, emailVerified } = req.user;
    
    console.log(`[Auth Resend Verification] 인증 이메일 재발송: ${email}`);
    
    // 이미 인증된 경우
    if (emailVerified) {
      return res.json({
        success: true,
        message: '이미 인증된 이메일입니다'
      });
    }
    
    // 사용자 정보 조회
    const user = await authService.getUserById(userId);
    
    // 새 인증 링크 생성
    const verificationLink = await authService.generateEmailVerificationLink(email);
    
    // 이메일 발송
    if (emailService.isAvailable()) {
      await emailService.sendVerificationEmail(email, user.name, verificationLink);
      console.log(`✅ [Auth Resend Verification] 인증 이메일 재발송: ${email}`);
    }
    
    res.json({
      success: true,
      message: '인증 이메일이 재발송되었습니다'
    });
  })
);

// ===== POST /google-signin - Google OAuth 로그인 =====

/**
 * Google OAuth 로그인
 * 클라이언트에서 Google ID Token을 받아서 Firebase 사용자 생성/로그인
 * 
 * @route POST /api/auth/google-signin
 * @middleware authLimiter
 * 
 * @body {string} idToken - Google ID Token (클라이언트에서 받은 토큰)
 */
router.post('/google-signin',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
      throw new ValidationError('Google ID Token이 필요합니다');
    }
    
    console.log('[Auth Google SignIn] Google 로그인 시도');
    
    try {
      // Firebase ID Token 검증
      const decodedToken = await authService.verifyIdToken(idToken);
      
      // Firestore에서 사용자 확인
      let user;
      try {
        user = await authService.getUserById(decodedToken.uid);
        
        // 기존 사용자 - 로그인 정보 업데이트
        await authService.updateProfile(decodedToken.uid, {
          lastLoginAt: new Date(),
          'metadata.loginCount': (user.metadata?.loginCount || 0) + 1
        });
        
        console.log(`✅ [Auth Google SignIn] 기존 사용자 로그인: ${user.email}`);
        
      } catch (error) {
        // 신규 사용자 - Firestore에 프로필 생성
        if (error instanceof NotFoundError) {
          const now = new Date();
          const userData = {
            id: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || null,
            isPremium: false,
            role: 'user',
            subscriptionPlan: 'free',
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
            metadata: {
              emailVerified: decodedToken.email_verified,
              loginCount: 1,
              signupMethod: 'google'
            }
          };
          
          await authService.db.collection('users').doc(decodedToken.uid).set(userData);
          
          user = userData;
          
          // 환영 이메일 발송
          if (emailService.isAvailable()) {
            try {
              await emailService.sendWelcomeEmail(user.email, user.name);
            } catch (emailError) {
              console.error('⚠️ 이메일 발송 실패:', emailError.message);
            }
          }
          
          console.log(`✅ [Auth Google SignIn] 신규 사용자 생성: ${user.email}`);
        } else {
          throw error;
        }
      }
      
      res.json({
        success: true,
        message: 'Google 로그인 성공',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isPremium: user.isPremium,
          role: user.role,
          emailVerified: decodedToken.email_verified
        }
      });
      
    } catch (error) {
      console.error('[Auth Google SignIn] 실패:', error);
      throw new AuthenticationError('Google 로그인에 실패했습니다');
    }
  })
);

// ===== DELETE /account - 계정 삭제 =====

/**
 * 계정 삭제
 * Firebase Authentication과 Firestore 모두에서 삭제
 * 
 * @route DELETE /api/auth/account
 * @middleware authenticate
 */
router.delete('/account',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, email } = req.user;
    
    console.log(`[Auth Delete Account] 계정 삭제 요청: ${email}`);
    
    try {
      // 1. Firestore 사용자 문서 삭제 (소프트 삭제 권장)
      await authService.db.collection('users').doc(userId).update({
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.com`, // 이메일 익명화
        name: null
      });
      
      // 2. Firebase Authentication 사용자 삭제
      await authService.auth.deleteUser(userId);
      
      console.log(`✅ [Auth Delete Account] 계정 삭제 완료: ${userId}`);
      
      res.json({
        success: true,
        message: '계정이 성공적으로 삭제되었습니다'
      });
      
    } catch (error) {
      console.error('[Auth Delete Account] 실패:', error);
      throw new DatabaseError('계정 삭제 중 오류가 발생했습니다');
    }
  })
);

module.exports = router;