import { z } from 'zod';
import { sanitizeString } from '../utils/packageValidator';

/**
 * Valid delivery status identifiers matching DeliveryStageId.
 * @type {readonly [import('../types/deliveree').DeliveryStageId, ...import('../types/deliveree').DeliveryStageId[]]}
 */
export const VALID_STATUSES = /** @type {const} */ ([
  'ordered',
  'shipped',
  'in_transit',
  'customs',
  'out_for_delivery',
  'delivered',
  'exception',
  'archived'
]);

/**
 * Zod schema for individual tracking checkpoint verification.
 * @type {z.ZodType<import('../types/deliveree').Checkpoint>}
 */
export const checkpointSchema = z.object({
  id: z.string().max(100).transform(s => sanitizeString(s, 100)),
  title: z.string().max(200).transform(s => sanitizeString(s, 200)),
  titleHe: z.string().max(200).optional().transform(s => (s ? sanitizeString(s, 200) : undefined)),
  description: z.string().max(500).optional().default('').transform(s => sanitizeString(s, 500)),
  descriptionHe: z.string().max(500).optional().default('').transform(s => sanitizeString(s, 500)),
  location: z.string().max(150).optional().default('').transform(s => sanitizeString(s, 150)),
  timestamp: z.string().max(50).default(() => new Date().toISOString()),
  isCompleted: z.boolean().default(true)
}).strip();

/**
 * Zod schema for full Package entity verification and sanitization.
 * @type {z.ZodType<import('../types/deliveree').Package>}
 */
export const packageSchema = z.object({
  id: z.string().max(100).transform(s => sanitizeString(s, 100)),
  title: z.string().min(1).max(200).transform(s => sanitizeString(s, 200)),
  titleHe: z.string().max(200).optional().transform(s => (s ? sanitizeString(s, 200) : undefined)),
  trackingNumber: z.string().min(1).max(100).transform(s => sanitizeString(s, 100).toUpperCase().replace(/[^A-Z0-9_-]/g, '')),
  carrier: z.string().max(50).default('other').transform(s => sanitizeString(s, 50).toLowerCase()),
  carrierName: z.string().max(100).optional().transform(s => (s ? sanitizeString(s, 100) : undefined)),
  status: z.enum(VALID_STATUSES).default('in_transit'),
  category: z.string().max(50).default('other').transform(s => sanitizeString(s, 50).toLowerCase()),
  orderDate: z.string().max(50).optional().default(() => new Date().toISOString().slice(0, 10)),
  expectedDeliveryDate: z.string().max(50).optional().default(''),
  origin: z.string().max(150).optional().default('').transform(s => sanitizeString(s, 150)),
  destination: z.string().max(150).optional().default('Israel').transform(s => sanitizeString(s, 150)),
  notes: z.string().max(1000).optional().default('').transform(s => sanitizeString(s, 1000)),
  notesHe: z.string().max(1000).optional().default('').transform(s => sanitizeString(s, 1000)),
  isPinned: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  checkpoints: z.array(checkpointSchema).max(50).default([]),
  createdAt: z.string().max(50).default(() => new Date().toISOString()),
  updatedAt: z.string().max(50).default(() => new Date().toISOString()),
  userId: z.string().max(128).optional()
}).strip();

/**
 * Zod schema for package collections.
 * @type {z.ZodType<import('../types/deliveree').Package[]>}
 */
export const packageListSchema = z.array(packageSchema);

/**
 * Validates untrusted data against the Package Zod schema.
 * Rejects prototype pollution, strips unknown keys, and handles data sanitization.
 * 
 * @param {unknown} data
 * @returns {z.SafeParseReturnType<unknown, import('../types/deliveree').Package>}
 */
export function validatePackageSafe(data) {
  return packageSchema.safeParse(data);
}

/**
 * Validates untrusted data list against the Package List Zod schema.
 * 
 * @param {unknown} data
 * @returns {z.SafeParseReturnType<unknown, import('../types/deliveree').Package[]>}
 */
export function validatePackageListSafe(data) {
  return packageListSchema.safeParse(data);
}
