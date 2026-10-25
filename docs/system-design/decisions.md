# Architecture Decisions Log (ADR)

| Decision | Chosen Option | Alternative Considered | Deciding Factor |
|---|---|---|---|
| **Backend Framework** | Express 5.1.0 | NestJS / Fastify | Native async Promise error propagation with zero wrapper boilerplate. |
| **Database** | MongoDB / Mongoose | PostgreSQL / Prisma | Flexible subdocument clinical schemas for heterogeneous medical encounters. |
| **Telehealth** | Jitsi Meet WebRTC | Twilio Video API | Zero ongoing per-minute licensing costs and peer-to-peer data privacy. |
