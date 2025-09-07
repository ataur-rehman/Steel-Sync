import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle,
    AlertTriangle,
    Info,
    RefreshCw,
    DollarSign,
    Percent,
    Users,
    Truck
} from 'lucide-react';
import { simpleFinanceService, type FinancialSnapshot, type AlertItem, type UrgentCollection } from '../../services/simpleFinanceService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

// Monthly Progress Component 
const MonthlyProgress: React.FC<{ snapshot: FinancialSnapshot }> = ({ snapshot }) => {
    const progressVsLastMonth = snapshot.lastMonthSamePeriod > 0
        ? ((snapshot.salesSoFar - snapshot.lastMonthSamePeriod) / snapshot.lastMonthSamePeriod) * 100
        : 0;

    // Enhanced business insights
    const getBusinessInsight = () => {
        if (snapshot.purchasesSoFar === 0 && snapshot.salesSoFar > 0) {
            return "📊 High profit margin - no recorded purchases this month";
        }
        if (progressVsLastMonth > 20) {
            return "🚀 Excellent growth compared to last month!";
        }
        if (progressVsLastMonth > 0) {
            return "📈 Growing sales compared to last month";
        }
        if (progressVsLastMonth < -10) {
            return "⚠️ Sales declined from last month - review strategy";
        }
        return "📊 Stable business performance";
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month's Performance</h3>

            {/* Business Insight Banner */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">{getBusinessInsight()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-600">Sales So Far</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(snapshot.salesSoFar)}</p>
                    {snapshot.salesSoFar > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            {new Date().getDate()} days into {new Date().toLocaleDateString('en-US', { month: 'long' })}
                        </p>
                    )}
                </div>
                <div>
                    <p className="text-sm text-gray-600">Purchases So Far</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(snapshot.purchasesSoFar)}</p>
                    {snapshot.purchasesSoFar === 0 && snapshot.salesSoFar > 0 && (
                        <p className="text-xs text-orange-600 mt-1">No purchases recorded</p>
                    )}
                </div>
                <div>
                    <p className="text-sm text-gray-600">Rough Profit</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(snapshot.roughProfit)}</p>
                    <p className="text-xs text-purple-600 mt-1">
                        {snapshot.profitMargin.toFixed(1)}% margin
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Last Month (Same Period)</p>
                    <p className="text-xl font-semibold text-gray-700">{formatCurrency(snapshot.lastMonthSamePeriod)}</p>
                    <p className={`text-sm font-medium ${progressVsLastMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {progressVsLastMonth === 0 ? 'No change' :
                            `${progressVsLastMonth >= 0 ? '+' : ''}${progressVsLastMonth.toFixed(1)}% vs last month`}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Urgent Collections Component
const UrgentCollections: React.FC<{ collections: UrgentCollection[] }> = ({ collections }) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Urgent Payment Collections</h3>
            {collections.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No urgent collections</p>
            ) : (
                <div className="space-y-3">
                    {collections.slice(0, 5).map((collection, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{collection.customerName}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span>{collection.daysOverdue} days overdue</span>
                                    {collection.phone && (
                                        <a href={`tel:${collection.phone}`} className="text-blue-600 hover:underline">
                                            {collection.phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-red-600">{formatCurrency(collection.amount)}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${collection.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    collection.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {collection.priority.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Simple KPI Card
const KPICard: React.FC<{
    title: string;
    value: number;
    trend?: number;
    icon: React.ElementType;
    format?: 'currency' | 'percent' | 'number';
    subtitle?: string;
}> = ({ title, value, trend, icon: Icon, format = 'currency', subtitle }) => {
    const formatValue = (val: number) => {
        if (format === 'currency') return formatCurrency(val);
        if (format === 'percent') return `${val.toFixed(1)}%`;
        return val.toLocaleString();
    };

    const getTrendColor = (trend: number) => {
        if (trend > 0) return 'text-green-600';
        if (trend < 0) return 'text-red-600';
        return 'text-gray-500';
    };

    const getContextualInfo = () => {
        if (title === 'Profit Margin' && value === 100) {
            return 'Perfect! No costs recorded';
        }
        if (title === 'Monthly Revenue' && value > 0) {
            return `${new Date().getDate()} days progress`;
        }
        if (title === 'Outstanding Receivables' && value > 0) {
            return 'Money to collect';
        }
        if (title === 'Outstanding Payables' && value === 0) {
            return 'All bills paid!';
        }
        return subtitle;
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {formatValue(value)}
                    </p>
                    {getContextualInfo() && (
                        <p className="text-xs text-gray-500 mt-1">{getContextualInfo()}</p>
                    )}
                    {trend !== undefined && (
                        <div className={`flex items-center mt-2 ${getTrendColor(trend)}`}>
                            {trend > 0 ? (
                                <TrendingUp className="h-4 w-4 mr-1" />
                            ) : trend < 0 ? (
                                <TrendingDown className="h-4 w-4 mr-1" />
                            ) : null}
                            <span className="text-sm font-medium">
                                {trend === 0 ? 'No change' : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">vs last month</span>
                        </div>
                    )}
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                    <Icon className="h-6 w-6 text-gray-600" />
                </div>
            </div>
        </div>
    );
};

// Alert Component
const Alert: React.FC<{ alert: AlertItem }> = ({ alert }) => {
    const getIcon = () => {
        switch (alert.type) {
            case 'critical': return <AlertCircle className="h-5 w-5 text-red-600" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'info': return <Info className="h-5 w-5 text-blue-600" />;
            default: return <CheckCircle className="h-5 w-5 text-green-600" />;
        }
    };

    const getBgColor = () => {
        switch (alert.type) {
            case 'critical': return 'bg-red-50 border-red-200';
            case 'warning': return 'bg-yellow-50 border-yellow-200';
            case 'info': return 'bg-blue-50 border-blue-200';
            default: return 'bg-green-50 border-green-200';
        }
    };

    return (
        <div className={`p-4 rounded-lg border ${getBgColor()}`}>
            <div className="flex items-start space-x-3">
                {getIcon()}
                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                    {alert.action && (
                        <p className="text-xs text-gray-500 mt-2 italic">{alert.action}</p>
                    )}
                </div>
                {alert.value && (
                    <div className="text-right">
                        <span className="text-sm font-medium">
                            {typeof alert.value === 'number' && alert.value > 1000
                                ? formatCurrency(alert.value)
                                : alert.value.toString()
                            }
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Main Dashboard Component
const SimpleFinanceDashboard: React.FC = () => {
    const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [urgentCollections, setUrgentCollections] = useState<UrgentCollection[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const loadData = async () => {
        try {
            setLoading(true);
            const [snapshotData, alertsData, collectionsData] = await Promise.all([
                simpleFinanceService.getFinancialSnapshot(),
                simpleFinanceService.getFinancialAlerts(),
                simpleFinanceService.getUrgentCollections()
            ]);

            setSnapshot(snapshotData);
            setAlerts(alertsData);
            setUrgentCollections(collectionsData);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error loading financial data:', error);
            toast.error('Failed to load financial data');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        simpleFinanceService.clearCache();
        await loadData();
        toast.success('Data refreshed');
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading financial data...</p>
                </div>
            </div>
        );
    }

    if (!snapshot) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white rounded-lg p-8 shadow-sm border">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
                    <p className="text-gray-600 mb-6">There was an issue loading your financial information.</p>
                    <button
                        onClick={handleRefresh}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Last updated: {lastUpdate.toLocaleString()}
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </button>
            </div>

            {/* Main Content */}
            {/* Monthly Progress */}
            <MonthlyProgress snapshot={snapshot} />

            {/* Urgent Collections */}
            <UrgentCollections collections={urgentCollections} />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Monthly Revenue"
                    value={snapshot.revenue}
                    trend={snapshot.revenueTrend}
                    icon={DollarSign}
                />
                <KPICard
                    title="Monthly Profit"
                    value={snapshot.profit}
                    trend={snapshot.profitTrend}
                    icon={TrendingUp}
                />
                <KPICard
                    title="Profit Margin"
                    value={snapshot.profitMargin}
                    icon={Percent}
                    format="percent"
                />
                <KPICard
                    title="Cash Flow"
                    value={snapshot.cashFlow}
                    icon={DollarSign}
                />
            </div>

            {/* Outstanding Balances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <KPICard
                    title="Outstanding Receivables"
                    value={snapshot.outstandingReceivables}
                    icon={Users}
                />
                <KPICard
                    title="Outstanding Payables"
                    value={snapshot.outstandingPayables}
                    icon={Truck}
                />
                <KPICard
                    title="Net Outstanding"
                    value={snapshot.netOutstanding}
                    icon={DollarSign}
                />
            </div>

            {/* Top Debtors - Enhanced */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customer Debt</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <span className="text-gray-600">{snapshot.topCustomerDebt.name}</span>
                            {snapshot.topCustomerDebt.amount > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Follow up for payment collection
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <span className={`font-semibold ${snapshot.topCustomerDebt.amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {formatCurrency(snapshot.topCustomerDebt.amount)}
                            </span>
                            {snapshot.topCustomerDebt.amount > 0 && (
                                <p className="text-xs text-orange-600 mt-1">Outstanding</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendor Debt</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <span className="text-gray-600">{snapshot.topVendorDebt.name}</span>
                            {snapshot.topVendorDebt.amount === 0 && (
                                <p className="text-xs text-green-600 mt-1">
                                    All vendor payments current
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <span className={`font-semibold ${snapshot.topVendorDebt.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(snapshot.topVendorDebt.amount)}
                            </span>
                            {snapshot.topVendorDebt.amount === 0 && (
                                <p className="text-xs text-green-600 mt-1">All clear</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h3>
                    <div className="space-y-4">
                        {alerts.map((alert, index) => (
                            <Alert key={index} alert={alert} />
                        ))}
                    </div>
                </div>
            )}

            {/* No Alerts State - Enhanced */}
            {alerts.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All Good!</h3>
                    <p className="text-gray-600 mb-4">No immediate action items. Your finances are on track.</p>

                    {/* Financial Health Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                        <h4 className="text-sm font-semibold text-green-800 mb-2">Business Health Indicators:</h4>
                        <div className="space-y-1 text-sm text-green-700">
                            {snapshot && (
                                <>
                                    <div className="flex justify-between">
                                        <span>✓ Revenue this month:</span>
                                        <span className="font-medium">{formatCurrency(snapshot.salesSoFar)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>✓ Profit margin:</span>
                                        <span className="font-medium">{snapshot.profitMargin.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>✓ Cash flow:</span>
                                        <span className="font-medium">{formatCurrency(snapshot.cashFlow)}</span>
                                    </div>
                                    {snapshot.outstandingPayables === 0 && (
                                        <div className="flex justify-between">
                                            <span>✓ All vendor bills paid</span>
                                            <span className="font-medium">Current</span>
                                        </div>
                                    )}
                                    {snapshot.outstandingReceivables > 0 && (
                                        <div className="flex justify-between">
                                            <span>• Outstanding collections:</span>
                                            <span className="font-medium">{formatCurrency(snapshot.outstandingReceivables)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimpleFinanceDashboard;
