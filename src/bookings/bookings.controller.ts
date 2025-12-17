import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('hold')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a seat hold (temporary reservation)' })
  async createHold(
    @CurrentUser('id') passengerId: string,
    @Body() dto: CreateHoldDto,
  ) {
    return this.bookingsService.createHold(passengerId, dto);
  }

  @Delete('hold/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release a seat hold' })
  async releaseHold(@Param('id') holdId: string) {
    await this.bookingsService.releaseHold(holdId);
    return { message: 'Hold released successfully' };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get passenger booking history' })
  @ApiQuery({ name: 'status', required: false })
  async getBookingHistory(
    @CurrentUser('id') passengerId: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.getPassengerBookings(passengerId, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking by ID' })
  async getBookingById(@Param('id') id: string) {
    return this.bookingsService.getBookingById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancelBooking(
    @Param('id') bookingId: string,
    @CurrentUser('id') passengerId: string,
  ) {
    return this.bookingsService.cancelBooking(bookingId, passengerId);
  }

  @Post('cleanup-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cleanup expired holds (Admin only)' })
  async cleanupExpiredHolds() {
    return this.bookingsService.cleanupExpiredHolds();
  }
}
