import { printingService } from '../services/printing';

export function usePrinting() {
  const printInvoice = async (invoice: any) => {
    return await printingService.printInvoice(invoice);
  };

  const printReport = async (report: any, type: string) => {
    return await printingService.printReport(report, type);
  };

  return {
    printInvoice,
    printReport
  };
}