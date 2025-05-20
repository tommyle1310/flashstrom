"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPriorityPoints = getPriorityPoints;
exports.calculateInquiryPriority = calculateInquiryPriority;
exports.findAvailableCustomerCare = findAvailableCustomerCare;
const typeorm_1 = require("typeorm");
function getPriorityPoints(priority) {
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
            return 2;
    }
}
async function calculateInquiryPriority(dto, orderRepository) {
    let priority = 'MEDIUM';
    if (dto.status === 'ESCALATE') {
        return 'URGENT';
    }
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
    if (dto.order_id) {
        try {
            const order = await orderRepository.findOne({
                where: { id: dto.order_id }
            });
            if (order && order.total_amount > 10) {
                priority = priority === 'HIGH' ? 'URGENT' : 'HIGH';
            }
        }
        catch (error) {
            console.error('Error fetching order:', error);
        }
    }
    if (priority === 'MEDIUM' && text.length < 50) {
        priority = 'LOW';
    }
    return priority;
}
async function findAvailableCustomerCare(customerCareRepository, inquiryRepository) {
    try {
        const availableCustomerCares = await customerCareRepository.find({
            where: { available_for_work: true }
        });
        console.log(`Found ${availableCustomerCares.length} available CustomerCares:`, availableCustomerCares.map(cc => ({
            id: cc.id,
            active_workload: cc.active_workload
        })));
        if (availableCustomerCares.length === 0) {
            console.warn('No available CustomerCare found');
            return null;
        }
        const customerCareWorkloads = await Promise.all(availableCustomerCares.map(async (cc) => {
            const activeInquiryCount = await inquiryRepository.count({
                where: {
                    assigned_customer_care: { id: cc.id },
                    status: (0, typeorm_1.Not)((0, typeorm_1.In)(['RESOLVED', 'CLOSED']))
                }
            });
            return { id: cc.id, activeInquiryCount };
        }));
        console.log('CustomerCare workloads:', customerCareWorkloads);
        customerCareWorkloads.sort((a, b) => a.activeInquiryCount - b.activeInquiryCount);
        const selectedCustomerCareId = customerCareWorkloads[0].id;
        console.log(`Selected CustomerCare ID: ${selectedCustomerCareId} with ${customerCareWorkloads[0].activeInquiryCount} active inquiries`);
        return selectedCustomerCareId;
    }
    catch (error) {
        console.error('Error finding available CustomerCare:', error);
        return null;
    }
}
//# sourceMappingURL=inquiries.js.map