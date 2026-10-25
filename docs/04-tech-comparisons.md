# Technology Comparisons & Architectural Decisions

## 1. Web Framework: Express 5.1.0 vs NestJS vs Fastify vs Django

| Comparison Factor | Express 5.1.0 (Used) | NestJS | Fastify | Django REST |
|---|---|---|---|---|
| **Language** | Node.js (JavaScript) | TypeScript | Node.js | Python |
| **Async Error Handling** | Native in v5 | Built-in Filters | Native | Middleware |
| **Learning Curve** | Extremely Low | High (Angular-style DI)| Low | Moderate |
| **Ecosystem Size** | Massive NPM | Growing | Moderate | Massive Python |
| **Startup Overhead** | Minimal (<1s) | Heavy (>3s) | Minimal | Moderate |

- **Why Express 5**: Delivers built-in native Promise rejection handling in routes without wrapper boilerplate, while maintaining universal compatibility with standard healthcare middleware. [CONFIRM WITH DEVELOPER]

---

## 2. Database: MongoDB / Mongoose vs PostgreSQL / Prisma

| Comparison Factor | MongoDB / Mongoose (Used) | PostgreSQL / Prisma |
|---|---|---|
| **Clinical Schema Flexibility**| High (Dynamic EMR JSON attributes) | Rigid (Requires schema migrations) |
| **Unstructured Reports** | Native BSON document nesting | JSONB columns |
| **ACID Multi-Doc Support** | Supported via Replica Set Sessions | Native ACID engine |
| **Document Search** | Native subdocument indexing | GIN indexes on JSONB |

- **Why MongoDB**: Patient clinical histories, intake forms, and diagnostic records vary widely across specialties (oncology vs cardiology). A document store allows nested clinical telemetry without hundreds of sparse relational tables.
