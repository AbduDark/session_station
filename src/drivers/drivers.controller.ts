import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current driver profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.driversService.findByUserId(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current driver profile' })
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.updateDriver(user.driverProfile.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all drivers (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllDrivers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.driversService.getAllDrivers(page, limit);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending drivers (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPendingDrivers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.driversService.getPendingDrivers(page, limit);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a driver (Admin only)' })
  async approveDriver(
    @Param('id') driverId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.driversService.approveDriver(driverId, adminId);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a driver (Admin only)' })
  async rejectDriver(
    @Param('id') driverId: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason?: string,
  ) {
    return this.driversService.rejectDriver(driverId, adminId, reason);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get driver by ID (Admin only)' })
  async getDriverById(@Param('id') id: string) {
    return this.driversService.findById(id);
  }
}
