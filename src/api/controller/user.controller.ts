import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MapService } from '../services/map.service';
import { ContactService } from '../services/contact.service';
import { AuthGuard, UserRole } from 'src/guards/auth.guard';
import { Roles } from 'src/guards/role.guard';

@Controller('user')
export class UserController {
  constructor(
    private readonly mapService: MapService,
    private readonly contactService: ContactService,
  ) {}

  @Get('coordinates')
  async getAllUsersWithCoordinates() {
    return await this.mapService.getAllUsersWithCoordinates();
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard)
  @Get('contacts')
  async getContacts(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    return await this.contactService.getContacts(pageNum, limitNum);
  }

  @Post('contact')
  async sendContactQuery(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('subject') subject: string,
    @Body('message') message: string,
  ) {
    return await this.contactService.sendContactQuery(
      name,
      email,
      subject,
      message,
    );
  }
  //   @Get('coordinates/test')
  //   async getCoordinates() {
  //     return this.mapService.getCoordinates('New panchwati colony ghaziabad uttar pradesh');
  //   }
}
