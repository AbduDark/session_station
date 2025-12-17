import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Stations')
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active stations' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    return this.stationsService.findAll(includeInactive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get station by ID' })
  async findById(@Param('id') id: string) {
    return this.stationsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new station (Admin only)' })
  async create(@Body() dto: CreateStationDto) {
    return this.stationsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a station (Admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateStationDto) {
    return this.stationsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a station (Admin only)' })
  async delete(@Param('id') id: string) {
    return this.stationsService.delete(id);
  }
}
