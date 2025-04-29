import { CreateCustomerCareInquiryDto } from 'src/customer_cares_inquires/dto/create-customer-care-inquiry.dto';
import { In, Not, Repository } from 'typeorm';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Order } from 'src/orders/entities/order.entity';
import { CustomerCareInquiry } from 'src/customer_cares_inquires/entities/customer_care_inquiry.entity';

// Hàm tính điểm dựa trên priority
export function getPriorityPoints(
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
): number {
  switch (priority) {
    case 'LOW':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'HIGH':
      return 3;
    case 'URGENT':
      return 4;
    default:
      return 2; // Default to MEDIUM
  }
}

// Hàm tính priority dựa trên rule
export async function calculateInquiryPriority(
  dto: CreateCustomerCareInquiryDto,
  orderRepository: Repository<Order>
): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> {
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'; // Default

  // Rule 1: Nếu status là ESCALATE, set URGENT
  if (dto.status === 'ESCALATE') {
    return 'URGENT';
  }

  // Rule 2: Check keyword trong subject hoặc description
  const text = `${dto.subject} ${dto.description}`.toLowerCase();
  const urgentKeywords = [
    'urgent',
    'emergency',
    'critical',
    'asap',
    'immediately'
  ];
  if (urgentKeywords.some(keyword => text.includes(keyword))) {
    priority = 'HIGH';
  }

  // Rule 3: Check totalAmount của order nếu có order_id
  if (dto.order_id) {
    try {
      const order = await orderRepository.findOne({
        where: { id: dto.order_id }
      });
      if (order && order.total_amount > 10) {
        priority = priority === 'HIGH' ? 'URGENT' : 'HIGH';
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  }

  // Rule 4: Nếu không match rule nào, giữ MEDIUM hoặc set LOW cho inquiry đơn giản
  if (priority === 'MEDIUM' && text.length < 50) {
    priority = 'LOW';
  }

  return priority;
}

// Hàm tìm CustomerCare có ít inquiry active nhất
export async function findAvailableCustomerCare(
  customerCareRepository: Repository<CustomerCare>,
  inquiryRepository: Repository<CustomerCareInquiry>
): Promise<string | null> {
  try {
    // Tìm tất cả CustomerCare có available_for_work = true
    const availableCustomerCares = await customerCareRepository.find({
      where: { available_for_work: true }
    });

    console.log(
      `Found ${availableCustomerCares.length} available CustomerCares:`,
      availableCustomerCares.map(cc => ({
        id: cc.id,
        active_workload: cc.active_workload
      }))
    );

    if (availableCustomerCares.length === 0) {
      console.warn('No available CustomerCare found');
      return null;
    }

    // Đếm số inquiry active cho từng CustomerCare
    const customerCareWorkloads = await Promise.all(
      availableCustomerCares.map(async cc => {
        const activeInquiryCount = await inquiryRepository.count({
          where: {
            assigned_customer_care: { id: cc.id }, // Dùng quan hệ
            status: Not(In(['RESOLVED', 'CLOSED']))
          }
        });
        return { id: cc.id, activeInquiryCount };
      })
    );

    console.log('CustomerCare workloads:', customerCareWorkloads);

    // Sắp xếp theo số inquiry active tăng dần
    customerCareWorkloads.sort(
      (a, b) => a.activeInquiryCount - b.activeInquiryCount
    );

    // Lấy thằng có ít inquiry active nhất
    const selectedCustomerCareId = customerCareWorkloads[0].id;
    console.log(
      `Selected CustomerCare ID: ${selectedCustomerCareId} with ${customerCareWorkloads[0].activeInquiryCount} active inquiries`
    );

    return selectedCustomerCareId;
  } catch (error) {
    console.error('Error finding available CustomerCare:', error);
    return null;
  }
}
