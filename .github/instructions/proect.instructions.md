
This codebase powers a production-grade Steel Stock Management System built to manage high-volume inventory data, live transactional records, complex unit conversions, and logistics operations.

It interacts with a real persistent database SQLite— no mock data. It is optimized for scalability, performance, and fault tolerance, and is designed for zero-error tolerance in mission-critical environments.

==============================
✅ Core Principles
==============================
- Real Database Only: No mock or in-memory data allowed.
- Production-Level Robustness: Built for industrial use, must avoid all critical errors.
- Large Data Handling: Supports tens of thousands of records efficiently.
- No Room for Mistakes: All business logic must be reliable and auditable.

==============================
🧠 High-Level Coding & Architecture
==============================
- Follow Clean Code principles: Readable, modular, and well-structured code.
- Architecture: MVC, Layered, or Clean Architecture recommended.
- API-First Design if system is network-exposed.
- Use service layers for logic and repository layers for DB.

==============================
🚀 Performance Guidelines
==============================
- Database Optimization:
  - Use indexes, avoid N+1 queries, batch operations.
  - Connection pooling and selective caching.
- Data Structures: Use maps for lookups and optimize loops.
- Async Handling: Use async I/O for DB or file operations.

==============================
🔒 Security Practices
==============================
- Input Validation: Sanitize all inputs (text, numeric, unit).
- SQL Safety: Use parameterized queries or ORM.
- Access Control: Implement authentication/authorization where needed.
- Audit Logging: Track user actions and changes with metadata.
- File Permissions: Secure database and config files.

==============================
📏 Business Rule Enforcement
==============================
- Unit conversions (kg-gram, ton, ft, m ,bags) must be:
  - Accurate and tested.
  - Commented with sources or assumptions.
- Avoid floating-point precision issues.
- Normalize product specs before DB storage.

==============================
🛠️ Development Standards
==============================
- No hardcoded values: Use env/config/constants.
- Explicit over clever code.
- Comment business logic, especially for units and conversions.
- Write unit tests for critical calculations and stock logic.

