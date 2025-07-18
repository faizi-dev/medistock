
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MedicalItem, MedicalItemBatch } from '@/types';
import { useLanguage } from '@/context/language-context';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, Search, X, Package, Calendar, Info, StickyNote } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const processItem = (item: MedicalItem): MedicalItem => {
    const batches = Array.isArray(item.batches) ? item.batches : [];
    const totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);
    return { ...item, quantity: totalQuantity };
};

export default function ItemLookupPage() {
    const { t } = useLanguage();
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [foundItems, setFoundItems] = useState<MedicalItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [noResult, setNoResult] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerRegionId = "barcode-scanner-region";

    const handleSearch = () => {
        if (!searchQuery.trim()) {
            setFoundItems([]);
            setNoResult(false);
            return;
        }
        setIsSearching(true);
        setNoResult(false);
        setFoundItems([]);

        const q = query(
            collection(db, 'items'),
            where(searchQuery.length > 5 ? 'barcode' : 'name', '==', searchQuery.trim())
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const itemsData = snapshot.docs.map(doc => {
                    const itemData = doc.data() as MedicalItem;
                    return processItem({ id: doc.id, ...itemData });
                });
                setFoundItems(itemsData);
                setNoResult(false);
            } else {
                setFoundItems([]);
                setNoResult(true);
            }
            setIsSearching(false);
            unsubscribe();
        }, (error) => {
            console.error("Search failed:", error);
            toast({ variant: 'destructive', title: "Search Error", description: "Could not perform search." });
            setIsSearching(false);
        });
    };
    
    const startScanner = async () => {
        setIsScanning(true);
        setSearchQuery('');
        setFoundItems([]);
        setNoResult(false);
        
        try {
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
                throw new Error("No cameras found.");
            }

            scannerRef.current = new Html5Qrcode(scannerRegionId);
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    setSearchQuery(decodedText);
                    stopScanner();
                    handleSearch(); 
                },
                (errorMessage) => { /* ignore parse errors */ }
            );

        } catch (err: any) {
            console.error("Scanner Error:", err);
            toast({ variant: 'destructive', title: "Camera Error", description: err.message || "Could not start the barcode scanner." });
            setIsScanning(false);
        }
    };
    
    useEffect(() => {
        if (searchQuery && isScanning) {
            handleSearch();
            stopScanner();
        }
    }, [searchQuery, isScanning]);


    const stopScanner = () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
                 setIsScanning(false);
                 scannerRef.current = null;
            }).catch(err => {
                console.error("Error stopping scanner:", err);
                setIsScanning(false);
            });
        } else {
             setIsScanning(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setFoundItems([]);
        setNoResult(false);
        if (isScanning) {
            stopScanner();
        }
    };
    
    const ItemCard = ({ item }: { item: MedicalItem }) => (
        <Card className="animate-in fade-in-50">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                           <Package className="h-6 w-6 text-primary" /> {item.name}
                        </CardTitle>
                        <CardDescription>
                            {t('itemLookup.totalStock')}: <span className="font-bold text-foreground">{item.quantity}</span> / {item.targetQuantity}
                        </CardDescription>
                    </div>
                     <Badge variant={ (item.quantity || 0) < item.targetQuantity ? 'destructive' : 'secondary'}>
                        {(item.quantity || 0) < item.targetQuantity ? t('inventory.status.understocked') : t('inventory.status.fullyStocked')}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {item.notes && (
                    <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2"><StickyNote className="h-4 w-4"/> {t('itemLookup.notes')}</h4>
                        <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md">{item.notes}</p>
                    </div>
                )}
                
                <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><Calendar className="h-4 w-4"/> {t('itemLookup.batches')}</h4>
                    <div className="space-y-2 rounded-md border p-4">
                        {item.batches && item.batches.length > 0 ? (
                            item.batches.map((batch, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span>{t('itemLookup.quantity')}: <span className="font-mono font-medium">{batch.quantity}</span></span>
                                    <span>{batch.expirationDate ? format(batch.expirationDate.toDate(), 'MM/dd/yyyy') : 'N/A'}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">{t('itemLookup.noBatches')}</p>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground flex justify-between">
                 <span>
                    {t('itemLookup.lastUpdatedBy')}: {item.updatedBy?.name || item.createdBy.name}
                 </span>
                 <span>
                    {t('itemLookup.lastUpdatedOn')}: {format((item.updatedAt || item.createdAt).toDate(), 'PPpp')}
                 </span>
            </CardFooter>
        </Card>
    );

    return (
        <>
            <PageHeader
                title={t('itemLookup.title')}
                description={t('itemLookup.description')}
            />
            <div className="flex items-center gap-2 max-w-2xl mx-auto">
                <div className="relative flex-grow">
                    <Input
                        type="text"
                        placeholder={t('itemLookup.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pr-20"
                        disabled={isScanning}
                    />
                    {searchQuery && (
                         <Button variant="ghost" size="icon" className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7" onClick={clearSearch}>
                           <X className="h-4 w-4" />
                         </Button>
                    )}
                </div>
                <Button onClick={handleSearch} disabled={isSearching || isScanning}>
                    {isSearching ? '...' : <Search className="h-4 w-4" />}
                </Button>
                <Button variant="outline" onClick={isScanning ? stopScanner : startScanner}>
                    {isScanning ? <X className="h-4 w-4 mr-2"/> : <Camera className="h-4 w-4 mr-2" />}
                    {isScanning ? t('itemLookup.stopScan') : t('itemLookup.startScan')}
                </Button>
            </div>
            
            <div className="max-w-2xl mx-auto mt-8 space-y-6">
                {isScanning && <div id={scannerRegionId} className="w-full aspect-video bg-muted rounded-md border"/>}
                
                {isSearching && (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                )}
                
                {noResult && (
                    <Alert variant="default">
                        <Info className="h-4 w-4"/>
                        <AlertTitle>{t('itemLookup.noResultsTitle')}</AlertTitle>
                        <AlertDescription>{t('itemLookup.noResultsDescription').replace('{query}', searchQuery)}</AlertDescription>
                    </Alert>
                )}
                
                {foundItems.map(item => (
                    <ItemCard key={item.id} item={item} />
                ))}
            </div>
        </>
    );
}

    