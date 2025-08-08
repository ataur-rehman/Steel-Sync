You are working on a production-level application that is currently in the testing phase. Your primary tasks are:

Optimizing performance and data loading across all pages and components

Ensuring no errors occur even if the database is reset or a new database is created
Solve the issues carefully, in future this issue should not come again.
Maintaining data integration and consistency

Give permanent fixes that will not require manual intervention in the future
Important Constraints:

Do not remove any existing functions. All are in use and must be preserved.

Use Realtime Database Service for all database interactions.

Apply efficient changes to the database schema.

Ensure that all changes are production-ready and do not introduce new errors.

There are many pages and components that depend on the database schema, so any changes must be carefully analyzed and tested. Also there should be no data loading delays or inconsistencies of anytype, even with large datasets.

Do not delete or reduce the current database schema. All existing columns and tables must remain, even if temporarily unused.

Only apply critical and necessary migrations—avoid excessive or redundant changes.

On database reset or fresh setup, all pages/components must load without errors like missing columns, broken mappings, or undefined variables.

Ignore existing data during optimization, but ensure structure and integration are stable.

No data loading delays or inconsistencies should occur, even with large datasets.

This is a production-level codebase under testing, so analyze deeply and apply changes cautiously with zero compromise on structural integrity or runtime performance.