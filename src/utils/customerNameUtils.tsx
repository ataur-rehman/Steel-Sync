/**
 * Simple utility to render customer names with red styling for deleted customers
 */

export const renderCustomerName = (customerName: string | null | undefined) => {
    if (!customerName) return '';

    // Handle deleted customers that are now guest customers
    if (customerName.startsWith('[DELETED]')) {
        const cleanName = customerName.replace('[DELETED] ', '');

        // If it's a deleted customer that became a guest, show it clearly
        if (cleanName.includes('(Guest)')) {
            const originalName = cleanName.replace(' (Guest)', '');
            return (
                <span className="text-red-600 break-words">
                    {originalName} <span className="text-xs opacity-75">(Deleted Customer)</span>
                </span>
            );
        }

        // Regular deleted customer
        return (
            <span className="text-red-600 break-words">
                {cleanName} <span className="text-xs opacity-75">(Deleted)</span>
            </span>
        );
    }

    return customerName;
};

// For print views and plain text - returns clean name without styling
export const getCleanCustomerName = (customerName: string | null | undefined): string => {
    if (!customerName) return '';

    if (customerName.startsWith('[DELETED]')) {
        const cleanName = customerName.replace('[DELETED] ', '');
        // Remove (Guest) suffix for deleted customers in print
        return cleanName.replace(' (Guest)', '');
    }

    return customerName;
};
