
import { format } from 'date-fns';
import type { MedicalItem, Vehicle, Case, ModuleBag, InventoryCheck } from '@/types';
import type { TranslationKey } from './translations';

type ReportType = 'full' | 'restock' | 'expiring';

const generateHtmlShell = (title: string, content: string, t: (key: TranslationKey) => string) => {
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 2rem; background-color: #f8f9fa; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; background-color: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { font-size: 2rem; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; margin-bottom: 1rem; color: #2980b9; }
        h2 { font-size: 1.6rem; margin-top: 2.5rem; padding-bottom: 0.5rem; color: #2c3e50; }
        h3 { font-size: 1.3rem; margin-top: 1.5rem; color: #3498db; }
        h4 { font-size: 1.1rem; margin-top: 1rem; color: #95a5a6; font-weight: bold; text-transform: uppercase; }
        h5 { font-size: 1rem; margin: 0.5rem 0; color: #333; }
        .vehicle-divider { border: 0; border-top: 2px dashed #cccccc; margin: 2.5rem 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { border: 1px solid #dee2e6; padding: 0.75rem; text-align: left; }
        th { background-color: #f1f3f5; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        .summary { border: 1px solid #ccc; background-color: #f9f9f9; padding: 1.5rem; margin-bottom: 2rem; border-radius: 8px; }
        .summary p { margin: 0.5rem 0; font-size: 1.1rem; }
        .summary strong { color: #3498db; }
        .no-items { text-align: center; padding: 2rem; color: #868e96; }
        .understocked { color: #dc3545; font-weight: bold; }
        .overstocked { color: #007bff; }
        .footer { text-align: center; margin-top: 2rem; font-size: 0.8rem; color: #6c757d; }
        .button-container { position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 100; }
        .report-button { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .report-button:disabled { background-color: #999; cursor: not-allowed; opacity: 0.7; }
        .loader { width: 1rem; height: 1rem; border: 2px solid #fff; border-bottom-color: transparent; border-radius: 50%; display: inline-block; vertical-align: middle; box-sizing: border-box; animation: rotation 1s linear infinite; margin-right: 0.5rem; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media print {
          .button-container { display: none; }
          body { padding: 0; }
          .container { box-shadow: none; border-radius: 0; padding: 1rem; }
        }
      </style>
    </head>
    <body>
      <div class="button-container">
        <button class="report-button" onclick="window.print()">${t('report.print')}</button>
        <button class="report-button" id="download-pdf-btn" disabled>${t('report.download')}</button>
      </div>
      <div class="container" id="report-content">
        ${content}
        <div class="footer">MediStock Inventory Management System</div>
      </div>
      <script>
        function downloadPDF() {
          const report = document.getElementById('report-content');
          const downloadBtn = document.getElementById('download-pdf-btn');
          
          if (!report || !downloadBtn) {
            console.error('Report content element or download button not found.');
            return;
          }
          if (typeof window.html2canvas === 'undefined') {
            alert("Could not find the html2canvas library. It might be blocked by your browser's ad-blocker or failed to load. Please check the console and try again.");
            return;
          }
           if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            alert("Could not find the jspdf library. It might be blocked by your browser's ad-blocker or failed to load. Please check the console and try again.");
            return;
          }

          const originalButtonText = downloadBtn.innerHTML;
          downloadBtn.disabled = true;
          downloadBtn.innerHTML = \`<span class="loader"></span> ${t('report.downloading')}\`;

          const { jsPDF } = window.jspdf;
          
          window.html2canvas(report, { scale: 2, useCORS: true }).then(canvas => {
            try {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
              });

              const imgProps = pdf.getImageProperties(imgData);
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
              
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save('${safeTitle}.pdf');
            } catch (e) {
              console.error("Could not generate PDF from canvas:", e);
              alert("Sorry, there was an error generating the PDF.");
            }
          }).catch((err) => {
            console.error("html2canvas failed:", err);
            alert("Sorry, there was an error capturing the page content for the PDF.");
          }).finally(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalButtonText;
          });
        }

        function pollForLibraries() {
            if (typeof window.html2canvas !== 'undefined' && typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                const downloadBtn = document.getElementById('download-pdf-btn');
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = '${t('report.download')}';
                    downloadBtn.addEventListener('click', downloadPDF);
                }
            } else {
                setTimeout(pollForLibraries, 100);
            }
        }
        
        document.addEventListener('DOMContentLoaded', () => {
             const downloadBtn = document.getElementById('download-pdf-btn');
             if(downloadBtn) downloadBtn.textContent = 'Loading...';
             pollForLibraries();
        });
      </script>
    </body>
    </html>
  `;
};

const getReportTitle = (reportType: ReportType, t: (key: TranslationKey) => string, checkData?: InventoryCheck | null) => {
    if (checkData) return t('inventoryCheck.report.pageTitle');
    switch (reportType) {
        case 'full': return t('report.title.full');
        case 'restock': return t('report.title.restock');
        case 'expiring': return t('report.title.expiring');
    }
}

const generateInventoryCheckReportContent = (checkData: InventoryCheck, t: (key: TranslationKey) => string): string => {
    const expiredItems = checkData.items.filter(item => item.isExpired && item.quantityAfter === 0 && item.quantityBefore > 0);
    const adjustedItems = checkData.items.filter(item => !(item.isExpired && item.quantityAfter === 0 && item.quantityBefore > 0));

    let content = `
        <div class="summary">
            <h2>${t('inventoryCheck.report.summaryTitle')}</h2>
            <p><strong>${t('inventoryCheck.report.completedBy')}:</strong> ${checkData.checkedBy.name}</p>
            <p><strong>${t('inventoryCheck.report.completedOn')}:</strong> ${format(checkData.checkedAt.toDate(), 'PPP p')}</p>
            <p><strong>${t('inventoryCheck.report.totalAdjusted')}:</strong> ${adjustedItems.length}</p>
            <p><strong>${t('inventoryCheck.report.totalExpired')}:</strong> ${expiredItems.length}</p>
        </div>
    `;

    if (adjustedItems.length > 0) {
        content += `<h2>${t('inventoryCheck.report.adjustmentsTitle')}</h2><table>
            <thead><tr>
                <th>${t('inventoryCheck.table.item')}</th>
                <th>${t('inventoryCheck.report.batchExp')}</th>
                <th>${t('inventoryCheck.table.expectedQty')}</th>
                <th>${t('inventoryCheck.table.actualQty')}</th>
                <th>${t('inventoryCheck.report.discrepancy')}</th>
            </tr></thead><tbody>`;
        adjustedItems.forEach(item => {
            content += `<tr>
                <td>${item.itemName}</td>
                <td>${item.batchExpiration}</td>
                <td style="text-align:center;">${item.quantityBefore}</td>
                <td style="text-align:center;">${item.quantityAfter}</td>
                <td style="text-align:center; font-weight: bold;">${item.quantityAfter - item.quantityBefore}</td>
            </tr>`;
        });
        content += '</tbody></table>';
    }

    if (expiredItems.length > 0) {
        content += `<h2 style="color: #c0392b;">${t('inventoryCheck.report.expiredTitle')}</h2><table>
            <thead><tr>
                <th>${t('inventoryCheck.table.item')}</th>
                <th>${t('inventoryCheck.report.batchExp')}</th>
                <th>${t('inventoryCheck.report.qtyRemoved')}</th>
            </tr></thead><tbody>`;
        expiredItems.forEach(item => {
            content += `<tr>
                <td>${item.itemName}</td>
                <td>${item.batchExpiration}</td>
                <td style="text-align:center;">${item.quantityBefore}</td>
            </tr>`;
        });
        content += '</tbody></table>';
    }

    if (adjustedItems.length === 0 && expiredItems.length === 0) {
        content += `<div class="no-items">${t('inventoryCheck.report.noChanges')}</div>`;
    }

    return content;
};

export const generateReportHtml = (
  items: MedicalItem[],
  vehicles: Vehicle[],
  cases: Case[],
  moduleBags: ModuleBag[],
  reportType: ReportType,
  t: (key: TranslationKey) => string,
  checkData?: InventoryCheck | null
): string => {
  const generatedOn = new Date().toLocaleString();
  const reportTitle = getReportTitle(reportType, t, checkData);
  const titleHtml = `<h1>${reportTitle}</h1><p><em>${t('report.generatedOn')}: ${generatedOn}</em></p>`;

  let mainContent = '';

  if (checkData) {
    mainContent = generateInventoryCheckReportContent(checkData, t);
    return generateHtmlShell(reportTitle, titleHtml + mainContent, t);
  }

  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
  const caseMap = new Map(cases.map(c => [c.id, c]));
  const moduleBagMap = new Map(moduleBags.map(m => [m.id, m]));

  const fortyTwoDaysFromNow = new Date();
  fortyTwoDaysFromNow.setDate(fortyTwoDaysFromNow.getDate() + 42);

  let filteredItems = items;
  if (reportType === 'restock') {
    filteredItems = items.filter(item => (item.quantity || 0) < item.targetQuantity);
  } else if (reportType === 'expiring') {
    filteredItems = items.filter(item => item.batches.some(b => b.expirationDate && b.expirationDate.toDate() < fortyTwoDaysFromNow));
  }

  // Group items by vehicle -> case -> module
  const groupedData = new Map<string, Map<string, Map<string, MedicalItem[]>>>();

  for (const item of filteredItems) {
    const module = moduleBagMap.get(item.moduleId);
    if (!module) continue;
    const caseItem = caseMap.get(module.caseId);
    if (!caseItem) continue;
    const vehicle = vehicleMap.get(caseItem.vehicleId);
    if (!vehicle) continue;

    if (!groupedData.has(vehicle.id)) {
      groupedData.set(vehicle.id, new Map());
    }
    const vehicleGroup = groupedData.get(vehicle.id)!;

    if (!vehicleGroup.has(caseItem.id)) {
      vehicleGroup.set(caseItem.id, new Map());
    }
    const caseGroup = vehicleGroup.get(caseItem.id)!;

    if (!caseGroup.has(module.id)) {
      caseGroup.set(module.id, []);
    }
    const moduleGroup = caseGroup.get(module.id)!;
    moduleGroup.push(item);
  }

  // Build Summary
  const totalRestockNeeded = items.reduce((acc, item) => {
    const needed = item.targetQuantity - (item.quantity || 0);
    return acc + (needed > 0 ? needed : 0);
  }, 0);

  const expiringItemsCount = items.filter(item => item.batches.some(b => b.expirationDate && b.expirationDate.toDate() < fortyTwoDaysFromNow)).length;

  let summaryHtml = `
    <div class="summary">
        <h2>${t('report.summary')}</h2>
        <p><strong>${t('report.totalItems')}:</strong> ${items.length}</p>
        <p><strong>${t('report.understockedItems')}:</strong> ${items.filter(i => (i.quantity || 0) < i.targetQuantity).length}</p>
        <p><strong>${t('report.totalRestock')}:</strong> ${totalRestockNeeded}</p>
        <p><strong>${t('report.expiringItems')}:</strong> ${expiringItemsCount}</p>
    </div>`;
  
  // Build main content
  if (groupedData.size === 0) {
      mainContent += `<div class="no-items">${t('report.noItems')}</div>`;
  } else {
    const vehicleEntries = Array.from(groupedData.entries());
    for (let i = 0; i < vehicleEntries.length; i++) {
        const [vehicleId, casesMap] = vehicleEntries[i];
        const vehicle = vehicleMap.get(vehicleId)!;
        mainContent += `<h2>${t('report.vehicle')}: ${vehicle.name}</h2>`;
        for (const [caseId, modulesMap] of casesMap.entries()) {
            const caseItem = caseMap.get(caseId)!;
            mainContent += `<h3>${t('report.case')}: ${caseItem.name}</h3>`;
            for (const [moduleId, itemsList] of modulesMap.entries()) {
            const moduleBag = moduleBagMap.get(moduleId)!;
            mainContent += `<h4>${t('report.module')}: ${moduleBag.name}</h4>`;
            
            for (const item of itemsList) {
              const totalQuantity = item.quantity || 0;
              const restockNeeded = item.targetQuantity - totalQuantity;
              const restockClass = restockNeeded > 0 ? 'understocked' : '';
              mainContent += `
                  <h5>${item.name}</h5>
                  <p>Target: ${item.targetQuantity} | Total: ${totalQuantity} | <span class="${restockClass}">Needed: ${restockNeeded > 0 ? restockNeeded : 0}</span></p>
                  <table>
                  <thead>
                      <tr>
                      <th>${t('report.quantity')}</th>
                      <th>${t('report.expires')}</th>
                      </tr>
                  </thead>
                  <tbody>
              `;
              for (const batch of item.batches) {
                  mainContent += `
                  <tr>
                      <td>${batch.quantity}</td>
                      <td>${batch.expirationDate ? format(batch.expirationDate.toDate(), 'yyyy-MM-dd') : 'N/A'}</td>
                  </tr>
                  `;
              }
              mainContent += `</tbody></table>`;
            }
            }
        }
        if (i < vehicleEntries.length - 1) {
            mainContent += `<hr class="vehicle-divider" />`;
        }
    }
  }

  const fullHtmlContent = titleHtml + summaryHtml + mainContent;

  return generateHtmlShell(reportTitle, fullHtmlContent, t);
};
