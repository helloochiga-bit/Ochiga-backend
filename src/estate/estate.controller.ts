import { Controller, Post, Body } from '@nestjs/common';
import { EstateService } from './estate.service';
import { CreateHomeDto } from './dto/create-home.dto';

@Controller('estate')
export class EstateController {
  constructor(private readonly estateService: EstateService) {}

  @Post('create-home')
  async createHome(@Body() dto: CreateHomeDto) {
    return this.estateService.createHome(dto);
  }
}
