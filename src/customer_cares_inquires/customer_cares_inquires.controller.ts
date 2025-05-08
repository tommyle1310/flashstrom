import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query
} from '@nestjs/common';
import { CustomerCareInquiriesService } from './customer_cares_inquires.service';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';

@Controller('customer-care-inquiries')
export class CustomerCareInquiriesController {
  constructor(private readonly service: CustomerCareInquiriesService) {}

  @Post()
  create(@Body() createDto: CreateCustomerCareInquiryDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.service.findAllPaginated(parsedPage, parsedLimit);
  }

  @Get('customer-care/:ccId')
  findAllInquiriesByCCId(@Param('ccId') ccId: string) {
    return this.service.findAllInquiriesByCCId(ccId);
  }

  @Get('customer/:customerId')
  findAllInquiriesByCustomerId(@Param('customerId') customerId: string) {
    return this.service.findAllInquiriesByCustomerId(customerId);
  }

  @Get('escalated')
  findAllEscalatedInquiries() {
    return this.service.findAllEscalatedInquiries();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerCareInquiryDto
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/escalate')
  escalateInquiry(
    @Param('id') id: string,
    @Body()
    data: {
      customerCareId: string;
      reason: string;
      escalatedTo: 'ADMIN' | 'CUSTOMER_CARE';
      escalatedToId: string;
    }
  ) {
    return this.service.escalateInquiry(
      id,
      data.customerCareId,
      data.reason,
      data.escalatedTo,
      data.escalatedToId
    );
  }

  @Post(':id/reject')
  rejectInquiry(
    @Param('id') id: string,
    @Body() data: { customerCareId: string; reason: string }
  ) {
    return this.service.rejectInquiry(id, data.customerCareId, data.reason);
  }

  @Post(':id/transfer')
  transferInquiry(
    @Param('id') id: string,
    @Body()
    data: {
      fromCustomerCareId: string;
      toCustomerCareId: string;
      reason: string;
    }
  ) {
    return this.service.transferInquiry(
      id,
      data.fromCustomerCareId,
      data.toCustomerCareId,
      data.reason
    );
  }

  @Post(':id/record-response')
  recordResponse(@Param('id') id: string) {
    return this.service.recordResponse(id);
  }

  @Post(':id/resolve')
  resolveInquiry(
    @Param('id') id: string,
    @Body()
    data: {
      resolutionType:
        | 'REFUND'
        | 'REPLACEMENT'
        | 'INVESTIGATING'
        | 'ACCOUNT_FIX'
        | 'TECHNICAL_SUPPORT'
        | 'OTHER';
      resolutionNotes?: string;
    }
  ) {
    return this.service.resolveInquiry(
      id,
      data.resolutionType,
      data.resolutionNotes
    );
  }
}
