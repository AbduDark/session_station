import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { AddStationDto } from './dto/add-station.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Routes')
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active routes' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    return this.routesService.findAll(includeInactive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route by ID' })
  async findById(@Param('id') id: string) {
    return this.routesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new route (Admin only)' })
  async create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a route (Admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.routesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a route (Admin only)' })
  async delete(@Param('id') id: string) {
    return this.routesService.delete(id);
  }

  @Post(':id/stations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add station to route (Admin only)' })
  async addStation(@Param('id') routeId: string, @Body() dto: AddStationDto) {
    return this.routesService.addStationToRoute(routeId, dto.stationId, dto.order);
  }

  @Delete(':id/stations/:stationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove station from route (Admin only)' })
  async removeStation(
    @Param('id') routeId: string,
    @Param('stationId') stationId: string,
  ) {
    return this.routesService.removeStationFromRoute(routeId, stationId);
  }
}
