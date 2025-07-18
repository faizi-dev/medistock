
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { InventoryCheck } from '@/types';
import { useLanguage } from '@/context/language-context';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowLeft, Printer, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { generateReportHtml } from '@/lib/report-generator';
import { useToast } from '@/hooks/use-toast';

export default function InventoryCheckReportPage() {
    const params = useParams();
    const router = useRouter();
    const checkId = params.id as string;

    const { t } = useLanguage();
    const { toast } = useToast();
    const [checkData, setCheckData] = useState<InventoryCheck | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!checkId) return;

        const fetchCheckData = async () => {
            try {
                const docRef = doc(db, 'inventoryChecks', checkId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCheckData({ id: docSnap.id, ...docSnap.data() } as InventoryCheck);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Inventory check report not found.' });
                    router.push('/inventory');
                }
            } catch (error) {
                console.error("Error fetching report:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load the report.' });
            } finally {
                setLoading(false);
            }
        };

        fetchCheckData();
    }, [checkId, router, toast]);

    const handlePrint = () => {
        window.print();
    };
    
    const handleDownload = () => {
        if (!checkData) return;
        const html = generateReportHtml([], [], [], [], 'full', t, checkData); // Using a simplified call
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(html);
            reportWindow.document.close();
        } else {
            toast({
                variant: 'destructive',
                title: 'Could not open report',
                description: 'Please disable your pop-up blocker for this site and try again.'
            })
        }
    }
    
    if (loading) {
        return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
    }

    if (!checkData) {
        return null;
    }

    const expiredItems = checkData.items.filter(item => item.isExpired && item.quantityAfter === 0 && item.quantityBefore > 0);
    const adjustedItems = checkData.items.filter(item => !(item.isExpired && item.quantityAfter === 0 && item.quantityBefore > 0));


    const pageContent = (
         <>
            <div className="mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('inventoryCheck.report.summaryTitle')}</CardTitle>
                        <CardDescription>
                            {t('inventoryCheck.report.completedBy')} {checkData.checkedBy.name} {t('inventoryCheck.report.completedOn')} {format(checkData.checkedAt.toDate(), 'PPP p')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 md:grid-cols-3">
                         <div><strong>{t('inventoryCheck.report.totalAdjusted')}:</strong> {adjustedItems.length}</div>
                         <div><strong>{t('inventoryCheck.report.totalExpired')}:</strong> {expiredItems.length}</div>
                    </CardContent>
                </Card>
            </div>
            
             {adjustedItems.length > 0 && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{t('inventoryCheck.report.adjustmentsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('inventoryCheck.table.item')}</TableHead>
                                    <TableHead>{t('inventoryCheck.report.batchExp')}</TableHead>
                                    <TableHead className="text-center">{t('inventoryCheck.table.expectedQty')}</TableHead>
                                    <TableHead className="text-center">{t('inventoryCheck.table.actualQty')}</TableHead>
                                    <TableHead className="text-center">{t('inventoryCheck.report.discrepancy')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {adjustedItems.map((item, idx) => (
                                    <TableRow key={`adj-${idx}`}>
                                        <TableCell>{item.itemName}</TableCell>
                                        <TableCell>{item.batchExpiration}</TableCell>
                                        <TableCell className="text-center">{item.quantityBefore}</TableCell>
                                        <TableCell className="text-center">{item.quantityAfter}</TableCell>
                                        <TableCell className="text-center font-bold">
                                            {item.quantityAfter - item.quantityBefore}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {expiredItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('inventoryCheck.report.expiredTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('inventoryCheck.table.item')}</TableHead>
                                    <TableHead>{t('inventoryCheck.report.batchExp')}</TableHead>
                                    <TableHead className="text-center">{t('inventoryCheck.report.qtyRemoved')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expiredItems.map((item, idx) => (
                                    <TableRow key={`exp-${idx}`} className="bg-destructive/10">
                                        <TableCell>{item.itemName}</TableCell>
                                        <TableCell>{item.batchExpiration}</TableCell>
                                        <TableCell className="text-center">{item.quantityBefore}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {adjustedItems.length === 0 && expiredItems.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                       <p className="text-muted-foreground">{t('inventoryCheck.report.noChanges')}</p>
                    </CardContent>
                </Card>
            )}
        </>
    );

    return (
        <div id="report-content-wrapper">
             <PageHeader title={t('inventoryCheck.report.pageTitle')}>
                <div className="flex gap-2 print-hide">
                    <Button variant="outline" onClick={() => router.push('/inventory')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('inventoryCheck.report.backButton')}
                    </Button>
                     <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        {t('report.print')}
                    </Button>
                    <Button onClick={handleDownload}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {t('report.download')}
                    </Button>
                </div>
            </PageHeader>
            {pageContent}

            <style jsx global>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #report-content-wrapper, #report-content-wrapper * {
                    visibility: visible;
                  }
                  #report-content-wrapper {
                    position: absolute;
                    left: 0;
                    top: 0;
                    right: 0;
                  }
                  .print-hide {
                    display: none;
                  }
                }
            `}</style>
        </div>
    );
}

