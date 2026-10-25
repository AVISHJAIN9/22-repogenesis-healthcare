# Architecture & System Design: VITALS

## System Architecture

```mermaid
graph TD
    Client[Web Browsers / Clinical Consoles] -->|HTTPS / WSS| Nginx[Reverse Proxy & SSL Termination]
    Nginx --> Express[Express 5.1.0 Micro-Kernel]
    
    subgraph "Middleware Pipeline"
        Express --> Cors[CORS & Helmet Security Headers]
        Cors --> AuthMW[JWT & Session RBAC Validator]
        AuthMW --> UsageTrack[Usage & Observability Logger]
    end

    subgraph "Application Layer"
        UsageTrack --> PatientSvc[Patient & Case Management]
        UsageTrack --> CDSSSvc[Clinical Decision Support Rules]
        UsageTrack --> DocSvc[Document & Imaging Store]
        UsageTrack --> BedSvc[Ward Occupancy Dispatcher]
    end

    subgraph "Data Persistence"
        PatientSvc --> Mongo[(MongoDB Replica Set)]
        CDSSSvc --> Mongo
        DocSvc --> Mongo
        BedSvc --> Mongo
        DocSvc --> Storage[(Encrypted File Repository)]
    end
```

## Multi-Tenancy & Data Isolation
Every Mongoose query automatically scopes queries to `tenantId` (e.g., `tenantId: 'default'`), preventing cross-hospital data leakage in shared database deployments.
