import * as dns from 'node:dns/promises';
import * as http from 'node:http';
import * as https from 'node:https';
import ipaddr from 'ipaddr.js';

export async function safeFetch(targetUrl: string, options: RequestInit = {}): Promise<Response> {
  const parsed = new URL(targetUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`SSRF Blocked: Prohibited protocol ${parsed.protocol}`);
  }

  // Resolve all IPv4 and IPv6 records
  const records = await dns.lookup(parsed.hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error(`SSRF Blocked: Hostname resolution returned no records`);
  }

  for (const record of records) {
    const addr = ipaddr.parse(record.address);
    const range = addr.range();
    if (['loopback', 'private', 'linkLocal', 'carrierGradeNat', 'uniqueLocal', 'unspecified'].includes(range)) {
      throw new Error(`SSRF Blocked: Destination IP ${record.address} resolves to protected range (${range})`);
    }
  }

  const pinnedIp = records[0].address;
  const isHttps = parsed.protocol === 'https:';
  const customAgent = isHttps
    ? new https.Agent({
        lookup: (_hostname, _opts, callback) => callback(null, pinnedIp, records[0].family)
      })
    : new http.Agent({
        lookup: (_hostname, _opts, callback) => callback(null, pinnedIp, records[0].family)
      });

  return fetch(targetUrl, {
    ...options,
    // @ts-ignore Node fetch custom dispatcher/agent
    dispatcher: customAgent,
    redirect: 'error' // Prevent redirect-based SSRF bypasses
  });
}