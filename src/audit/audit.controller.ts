import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getLogs(page, limit, {
      actorId,
      action,
      entity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  async getLogById(@Param('id') id: string) {
    return this.auditService.getLogById(id);
  }
}
