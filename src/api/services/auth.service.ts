import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../dto/auth.dto';
import { UserRole } from '../../guards/auth.guard';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService, // Inject EmailService
  ) {}

  async signup(signupDto: SignupDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      location,
      clinicName,
      dci_registration_number,
    } = signupDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
   

    // If user exists and is verified, reject
    if (existingUser && existingUser.isEmailVerified) {
      throw new ConflictException('Email already in use');
    }

    // Determine user role
    let role = UserRole.USER;
    const adminEmails = process.env.ADMIN_EMAILS.split(',') || [];
    if (adminEmails.includes(email)) {
      role = UserRole.ADMIN;
    } else {
      // Validate required fields for non-admin users
      if (!clinicName || !location) {
        throw new BadRequestException(
          'Please provide clinic name and location',
        );
      }
      if (!dci_registration_number) {
        throw new BadRequestException('Please provide DCI number.');
      }
    }

    const isAdmin = role === UserRole.ADMIN;

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token (only for non-admin users)
    const verificationToken = isAdmin
      ? null
      : crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = isAdmin
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const verificationUrl = verificationToken
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
      : null;

    let user;

    if (existingUser && !existingUser.isEmailVerified) {
      // Handle resend case - update existing user with new data and token

      // Check if previous verification token is still valid
      const tokenStillValid =
        existingUser.emailVerificationExpiry &&
        existingUser.emailVerificationExpiry > new Date();

      if (tokenStillValid) {
        // If token is still valid, inform user to check email or wait
        const timeLeft = Math.ceil(
          (existingUser.emailVerificationExpiry.getTime() -
            new Date().getTime()) /
            (1000 * 60),
        );
        throw new ConflictException(
          `Verification email already sent. Please check your email or wait ${timeLeft} minutes before requesting a new one.`,
        );
      }

      // Update existing user with new information and generate new token
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          clinicName,
          location,
          dci_registration_number,
          role,
          isEmailVerified: isAdmin,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationTokenExpiry,
        },
      });
    } else {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          phone,
          clinicName,
          location,
          dci_registration_number,
          isEmailVerified: isAdmin,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationTokenExpiry,
        },
      });
    }

    // Send verification email for non-admin users
    if (!isAdmin && verificationUrl) {
      try {
        await this.emailService.sendVerificationEmail({
          firstName: user.firstName,
          email: user.email,
          role: user.role,
          registrationDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          verificationUrl,
          baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        });
      } catch (emailError) {
        // Log email error but don't fail the signup
        console.error('Failed to send verification email:', emailError);
      }
    }

    const message = existingUser
      ? isAdmin
        ? 'Account updated successfully'
        : 'New verification email sent successfully. Please check your email.'
      : isAdmin
        ? 'Account created successfully'
        : 'Account created successfully. Please check your email to verify your account.';

    return {
      success: true,
      message,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        location: user.location,
        role: user.role,
      },
    };
  }
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is not active');
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(
      user.id,
      user.role as UserRole,
      user.firstName,
      user.lastName,
    );

    return {
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      token,
    };
  }
  generateToken(
    userId: string,
    role: UserRole,
    firstName: string,
    lastName: string,
  ): string {
    const payload = { id: userId, role, firstName, lastName };
    return this.jwtService.sign(payload);
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security, don't reveal if email exists or not
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset token to database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpires,
      },
    });

    // Send password reset email
    const passwordResetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password?token=${resetToken}`;

    await this.emailService.sendPasswordResetEmail({
      firstName: user.firstName,
      email: user.email,
      resetUrl: passwordResetUrl,
    });

    return {
      message: 'Reset password reset link sent successfully',
      resetToken,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Find user with valid reset token
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return {
      message: 'Password reset successfully',
    };
  }

  async verifyEmail(token: string) {
    // Find user with verification token
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: {
          gte: new Date(),
        },
      },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user as verified
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail({
      firstName: updatedUser.firstName,
      email: updatedUser.email,
      role: updatedUser.role,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
    });

    return {
      success: true,
      message: 'Email verified successfully. Welcome to DentistPortal!',
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationTokenExpiry,
      },
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await this.emailService.sendVerificationEmail({
      firstName: user.firstName,
      email: user.email,
      role: user.role,
      registrationDate: user.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      verificationUrl,
      baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    });

    return {
      success: true,
      message: 'Verification email sent successfully',
    };
  }
}
