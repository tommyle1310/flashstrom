import { AdminChartService } from './admin_chart.service';
import { AdminChartQueryDto } from './dto/admin_chart_query.dto';
export declare class AdminChartController {
    private readonly adminChartService;
    constructor(adminChartService: AdminChartService);
    getChartData(query: AdminChartQueryDto): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    updateChartData(query: AdminChartQueryDto): Promise<import("src/utils/createResponse").ApiResponse<any>>;
}
