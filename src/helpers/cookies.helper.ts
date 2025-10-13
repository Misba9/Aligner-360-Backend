import { Response } from 'express';

export class CookieHelper {
  static readonly ACCESS_TOKEN_COOKIE = 'access_token';

  /**
   * Set HTTP-only cookie with access token
   */
  static setAccessTokenCookie(
    response: Response,
    token: string,
    expiresInSeconds: number = 86400, // 24 hours by default
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookie(this.ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isProduction, // HTTPS in production
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: expiresInSeconds * 1000, // Convert to milliseconds
      path: '/',
    });
  }

  /**
   * Clear access token cookie
   */
  static clearAccessTokenCookie(response: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    response.clearCookie(this.ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
  }
}
