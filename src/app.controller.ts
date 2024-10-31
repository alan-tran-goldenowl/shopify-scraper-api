import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Post('scrapper') // Define the endpoint for the POST request
  async createItem(@Body() item: { url: string }): Promise<any> {
    const response = await this.appService.getResponse(item.url);
    return response;
  }
}
