import { CreateCustomerCareInquiryDto } from 'src/customer_cares_inquires/dto/create-customer-care-inquiry.dto';

// Hàm tính priority dựa trên rule
export async function calculateInquiryPriority(
  dto: CreateCustomerCareInquiryDto,
  orderService: any // Giả sử có OrderService để lấy totalAmount
): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> {
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'; // Default

  // Rule 1: Nếu status là ESCALATE, set URGENT
  if (dto.status === 'ESCALATE') {
    return 'URGENT';
  }

  // Rule 2: Check keyword trong subject hoặc description
  const text = `${dto.subject} ${dto.description}`.toLowerCase();

  if (urgentKeywords.some(keyword => text.includes(keyword))) {
    priority = 'HIGH';
  }

  // Rule 3: Check totalAmount của order nếu có order_id
  if (dto.order_id) {
    try {
      const order = await orderService.findById(dto.order_id);
      if (order && order.totalAmount > 10) {
        // Nếu totalAmount > 1000, set HIGH (hoặc URGENT nếu đã là HIGH)
        priority = priority === 'HIGH' ? 'URGENT' : 'HIGH';
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      // Nếu không lấy được order, giữ priority hiện tại
    }
  }

  // Rule 4: Nếu không match rule nào, giữ MEDIUM hoặc set LOW cho inquiry đơn giản
  if (priority === 'MEDIUM' && text.length < 50) {
    // Ví dụ: Inquiry ngắn, không quan trọng lắm
    priority = 'LOW';
  }

  return priority;
}

const urgentKeywords = [
  'urgent',
  'emergency',
  'critical',
  'asap',
  'immediately',
  'now',
  'tomorrow',
  'too long'
];
