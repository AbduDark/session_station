import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiQuery({ name: 'routeId', required: false })
  @ApiQuery({ name: 'stationId', required: false })
  async getActiveSessions(
    @Query('routeId') routeId?: string,
    @Query('stationId') stationId?: string,
  ) {
    return this.sessionsService.getActiveSessions(routeId, stationId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current driver sessions' })
  @ApiQuery({ name: 'status', required: false })
  async getDriverSessions(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.sessionsService.getDriverSessions(user.driverProfile.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  async getSessionById(@Param('id') id: string) {
    return this.sessionsService.getSessionById(id);
  }

  @Post('start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a new session (Driver only)' })
  async startSession(
    @CurrentUser() user: any,
    @Body() dto: StartSessionDto,
  ) {
    return this.sessionsService.startSession(user.driverProfile.id, dto);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close a session (Driver only)' })
  async closeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.sessionsService.closeSession(sessionId, user.driverProfile.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a session (Driver only)' })
  async cancelSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.sessionsService.cancelSession(sessionId, user.driverProfile.id);
  }
}
