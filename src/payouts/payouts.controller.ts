import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Payouts')
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request payout for a session (Driver only)' })
  async requestPayout(
    @CurrentUser() user: any,
    @Body() dto: RequestPayoutDto,
  ) {
    return this.payoutsService.requestPayout(user.driverProfile.id, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get driver payout history' })
  @ApiQuery({ name: 'status', required: false })
  async getMyPayouts(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.payoutsService.getDriverPayouts(user.driverProfile.id, status);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payouts (Admin only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllPayouts(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.payoutsService.getAllPayouts(status, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payout by ID' })
  async getPayoutById(@Param('id') id: string) {
    return this.payoutsService.getPayoutById(id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a payout (Admin only)' })
  async approvePayout(
    @Param('id') payoutId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.payoutsService.approvePayout(payoutId, adminId);
  }

  @Post(':id/paid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark payout as paid (Admin only)' })
  async markAsPaid(
    @Param('id') payoutId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.payoutsService.markPayoutAsPaid(payoutId, adminId);
  }
}
