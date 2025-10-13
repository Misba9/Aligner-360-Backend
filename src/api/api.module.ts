import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { BlogController } from './controller/blog.controller';
import { CourseController } from './controller/course.controller';
import { EbookController } from './controller/ebook.controller';
import { LiveSessionController } from './controller/livesession.controller';
import { ImageKitController } from './controller/imagekit.controller';
import { CaseStudyController } from './controller/casestudy.controller';
import { UsersController } from './controller/users.controller';
import { AuthService } from './services/auth.service';
import { BlogService } from './services/blog.service';
import { CourseService } from './services/course.service';
import { EbookService } from './services/ebook.service';
import { LiveSessionService } from './services/livesession.service';
import { EmailService } from './services/email.service';
import { CaseStudyService } from './services/casestudy.service';
import { UsersService } from './services/users.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ImageKitService } from './services/imagekit.service';
import { UserController } from './controller/user.controller';
import { MapService } from './services/map.service';
import { ContactService } from './services/contact.service';
import { ProcessController } from './controller/process.controller';
import { AlignerProcessService } from './services/alignerprocess.service';
import { TestimonialService } from './services/testimonial.service';
import { TestimonialController } from './controller/testimonial.controller';
import { AlignerCaseController } from './controller/alignercase.controller';
import { AlignerCaseService } from './services/alignercase.service';
import { MapUsersController } from './controller/mapusers.controller';
import { MapUsersService } from './services/mapusers.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AuthController,
    BlogController,
    CourseController,
    EbookController,
    LiveSessionController,
    ImageKitController,
    UserController,
    UsersController,
    CaseStudyController,
    ProcessController,
    TestimonialController,
    AlignerCaseController,
    MapUsersController,
  ],
  providers: [
    AuthService,
    BlogService,
    CourseService,
    EbookService,
    LiveSessionService,
    EmailService,
    ImageKitService,
    MapService,
    ContactService,
    CaseStudyService,
    UsersService,
    AlignerProcessService,
    TestimonialService,
    AlignerCaseService,
    MapUsersService,
  ],
  exports: [
    AuthService,
    BlogService,
    CourseService,
    EbookService,
    LiveSessionService,
    EmailService,
    ImageKitService,
    MapService,
    ContactService,
    CaseStudyService,
    UsersService,
    AlignerProcessService,
    AlignerCaseService,
    MapUsersService,
  ],
})
export class ApiModule {}
