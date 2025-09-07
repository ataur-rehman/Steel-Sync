import React, { useState, useCallback } from 'react';
import { useDebounce } from './src/hooks/useDebounce';

// ULTRA SIMPLE TEST COMPONENT
const TestSearchInput: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const handleSearch = useCallback((value: string) => {
        setSearchQuery(value);
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Ultra Simple Search Test</h2>
            <input
                key="test-search"
                type="text"
                placeholder="Type here..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                    width: '300px',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}
            />
            <div style={{ marginTop: '10px' }}>
                <p>Current: {searchQuery}</p>
                <p>Debounced: {debouncedSearchQuery}</p>
            </div>
        </div>
    );
};

export default TestSearchInput;
