// Must be imported FIRST — sets DNS before any SRV lookups happen
import dns from 'node:dns';
try { dns.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.1']); } catch {}
