import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process payment for a seat hold' })
  async processPayment(
    @CurrentUser('id') passengerId: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(passengerId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get passenger payment history' })
  async getMyPayments(@CurrentUser('id') passengerId: string) {
    return this.paymentsService.getPassengerPayments(passengerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  async getPaymentById(@Param('id') id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment (Admin only)' })
  async refundPayment(
    @Param('id') paymentId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.paymentsService.refundPayment(paymentId, adminId);
  }
}
