import { useEffect } from 'react';
import React from 'react';

/**
 * Custom hook to disable right-click context menu and developer tools shortcuts
 * across the entire React application
 */
export const useDisableRightClick = () => {
    useEffect(() => {
        // Disable right-click context menu
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        // Disable keyboard shortcuts for developer tools (BUT ALLOW Ctrl+C for copying)
        const handleKeyDown = (e: KeyboardEvent) => {
            // ✅ ALLOW Ctrl+C (Copy) - keyCode 67 without Shift
            if (e.ctrlKey && !e.shiftKey && e.keyCode === 67) {
                console.log('📋 Copy (Ctrl+C) allowed');
                return true; // Allow copy operation
            }

            // F12 - Developer Tools
            if (e.keyCode === 123) {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+I - Developer Tools
            if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+J - Console
            if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
                e.preventDefault();
                return false;
            }

            // Ctrl+U - View Source
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+C - Inspect Element (BLOCKED, but Ctrl+C without Shift is allowed)
            if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+K - Web Console (Firefox)
            if (e.ctrlKey && e.shiftKey && e.keyCode === 75) {
                e.preventDefault();
                return false;
            }

            // F11 - Fullscreen (sometimes used to access dev tools)
            if (e.keyCode === 122) {
                e.preventDefault();
                return false;
            }

            // ✅ ALLOW other common user shortcuts
            // Ctrl+A (Select All) - keyCode 65
            if (e.ctrlKey && !e.shiftKey && e.keyCode === 65) {
                return true; // Allow select all
            }

            // Ctrl+V (Paste) - keyCode 86
            if (e.ctrlKey && !e.shiftKey && e.keyCode === 86) {
                return true; // Allow paste
            }

            // Ctrl+X (Cut) - keyCode 88
            if (e.ctrlKey && !e.shiftKey && e.keyCode === 88) {
                return true; // Allow cut
            }

            // Ctrl+Z (Undo) - keyCode 90
            if (e.ctrlKey && !e.shiftKey && e.keyCode === 90) {
                return true; // Allow undo
            }

            // Ctrl+Y (Redo) - keyCode 89
            if (e.ctrlKey && !e.shiftKey && e.keyCode === 89) {
                return true; // Allow redo
            }
        };

        // Optional: Disable text selection (uncomment if needed)
        // const handleSelectStart = (e: Event) => {
        //   // Allow text selection in input fields and textareas
        //   const target = e.target as HTMLElement;
        //   if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        //     return true;
        //   }
        //   e.preventDefault();
        //   return false;
        // };

        // Optional: Disable drag and drop (uncomment if needed)
        // const handleDragStart = (e: DragEvent) => {
        //   e.preventDefault();
        //   return false;
        // };

        // Add event listeners
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        // Uncomment these if you want to disable text selection and drag
        // document.addEventListener('selectstart', handleSelectStart);
        // document.addEventListener('dragstart', handleDragStart);

        // Print a warning message in console (optional)
        console.log('%c🚫 Right-click and developer tools are disabled for this application.',
            'color: #ff6b35; font-size: 14px; font-weight: bold;');

        // Cleanup function to remove event listeners
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            // document.removeEventListener('selectstart', handleSelectStart);
            // document.removeEventListener('dragstart', handleDragStart);
        };
    }, []);
};

/**
 * Component wrapper that automatically applies right-click protection
 * to any child components
 */
export const RightClickProtection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useDisableRightClick();
    return React.createElement(React.Fragment, null, children);
};

export default useDisableRightClick;
