import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Complaints')
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a complaint' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.complaintsService.create(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user complaints' })
  async getMyComplaints(@CurrentUser('id') userId: string) {
    return this.complaintsService.getUserComplaints(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all complaints (Admin only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllComplaints(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.complaintsService.getAllComplaints(status, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complaint by ID' })
  async getById(@Param('id') id: string) {
    return this.complaintsService.getComplaintById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update complaint status (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    return this.complaintsService.updateComplaint(id, dto);
  }
}
