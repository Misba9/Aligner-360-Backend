import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Res,
  HttpStatus,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../services/auth.service';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../dto/auth.dto';
import { CookieHelper } from '../../helpers/cookies.helper';
import { AuthGuard, UserRole } from '../../guards/auth.guard';
import { MapService } from '../services/map.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mapService: MapService,
  ) {}

  @Post('signup')
  async signup(
    @Body(ValidationPipe) signupDto: SignupDto,
    @Res() res: Response,
  ) {
    const result = await this.authService.signup(signupDto);
    if (result.user.role === UserRole.USER) {
      this.mapService.updateUserLocationOnMap(
        result.user.id,
        signupDto.location,
      );
    }
    return res.status(HttpStatus.CREATED).json(result);
  }

  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(loginDto);

    if (result.user.role.includes('admin')) {
      CookieHelper.setAccessTokenCookie(res, result.token, 24 * 60 * 60);
    } else {
      CookieHelper.setAccessTokenCookie(res, result.token, 30 * 24 * 60 * 60);
    }
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('logout')
  logout(@Res() res: Response) {
    // Clear the access token cookie
    CookieHelper.clearAccessTokenCookie(res);

    return res.status(HttpStatus.OK).json({
      message: 'Logged out successfully',
    });
  }

  @Get('get-logged-in-user')
  @UseGuards(AuthGuard)
  getProfile(@Req() req: Request) {
    return {
      success: true,
      message: 'User profile retrieved successfully',
      data: req.user,
    };
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto,
    @Res() res: Response,
  ) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('reset-password')
  async resetPassword(
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
    @Res() res: Response,
  ) {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('verify-email')
  async verifyEmail(@Body('token') token: string, @Res() res: Response) {
    const result = await this.authService.verifyEmail(token);
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('resend-verification')
  async resendVerification(@Body('email') email: string, @Res() res: Response) {
    const result = await this.authService.resendVerificationEmail(email);
    return res.status(HttpStatus.OK).json(result);
  }
}
